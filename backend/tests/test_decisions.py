API = "/api/v1/decisions"


def test_decision_crud(user_client):
    payload = {
        "title": "Use PostgreSQL",
        "context": "We need relational data and full-text search.",
        "decision": "Adopt PostgreSQL 17 with pgvector.",
        "reasoning": "Mature, free, supports vectors later.",
        "alternatives": "MongoDB, SQLite",
        "expected_outcome": "One database for everything.",
    }
    created = user_client.post(API, json=payload)
    assert created.status_code == 201
    decision = created.json()
    assert decision["reasoning"] == payload["reasoning"]
    assert decision["has_outcome"] is False

    reviewed = user_client.patch(f"{API}/{decision['id']}", json={"actual_outcome": "Worked well."}).json()
    assert reviewed["actual_outcome"] == "Worked well."
    assert reviewed["has_outcome"] is True
    assert reviewed["context"] == payload["context"]

    assert user_client.delete(f"{API}/{decision['id']}").status_code == 204
    assert user_client.get(f"{API}/{decision['id']}").status_code == 404


def test_validation(user_client):
    assert user_client.post(API, json={"title": ""}).status_code == 422
    assert user_client.post(API, json={"title": "x", "context": "y" * 20_001}).status_code == 422


def test_search_and_project_filter(user_client):
    project = user_client.post("/api/v1/projects", json={"name": "Infra"}).json()
    user_client.post(API, json={"title": "Host on Fly", "reasoning": "cheap containers", "project_id": project["id"]})
    user_client.post(API, json={"title": "Use Tailwind", "reasoning": "utility classes"})

    by_text = user_client.get(API, params={"q": "container"}).json()["items"]
    assert [d["title"] for d in by_text] == ["Host on Fly"]
    by_project = user_client.get(API, params={"project_id": project["id"]}).json()["items"]
    assert [d["title"] for d in by_project] == ["Host on Fly"]
    assert by_project[0]["project"]["name"] == "Infra"


def test_decision_isolation(user_client, other_client):
    decision = user_client.post(API, json={"title": "Secret plan"}).json()
    path = f"{API}/{decision['id']}"
    assert other_client.get(path).status_code == 404
    assert other_client.patch(path, json={"title": "x"}).status_code == 404
    assert other_client.delete(path).status_code == 404
    assert other_client.get(API, params={"q": "secret"}).json()["total"] == 0


def test_status_problem_and_review_date(user_client):
    created = user_client.post(
        API, json={"title": "Pick a queue", "problem": "Jobs are lost on restart", "status": "proposed"}
    ).json()
    assert created["status"] == "proposed"
    assert created["problem"] == "Jobs are lost on restart"
    assert created["reviewed_at"] is None

    # The problem statement is searchable.
    assert user_client.get(API, params={"q": "restart"}).json()["total"] == 1

    accepted = user_client.patch(f"{API}/{created['id']}", json={"status": "accepted"}).json()
    assert accepted["reviewed_at"] is None
    reviewed = user_client.patch(f"{API}/{created['id']}", json={"actual_outcome": "No lost jobs since."}).json()
    assert reviewed["reviewed_at"] is not None
    first_review = reviewed["reviewed_at"]
    # Saving other fields doesn't count as a new review.
    again = user_client.patch(
        f"{API}/{created['id']}", json={"title": "Pick a job queue", "actual_outcome": "No lost jobs since."}
    ).json()
    assert again["reviewed_at"] == first_review

    assert user_client.patch(f"{API}/{created['id']}", json={"status": "bogus"}).status_code == 422
    user_client.post(API, json={"title": "Other", "status": "superseded"})
    assert [d["title"] for d in user_client.get(API, params={"status": "superseded"}).json()["items"]] == ["Other"]
