API = "/api/v1/projects"


def test_project_crud(user_client):
    created = user_client.post(API, json={"name": "  Launch  ", "description": "Ship v1"})
    assert created.status_code == 201
    project = created.json()
    assert project["name"] == "Launch"
    assert project["status"] == "active"

    updated = user_client.patch(f"{API}/{project['id']}", json={"status": "on_hold"}).json()
    assert updated["status"] == "on_hold"
    assert updated["description"] == "Ship v1"

    assert user_client.patch(f"{API}/{project['id']}", json={"status": "bogus"}).status_code == 422
    assert user_client.post(API, json={"name": ""}).status_code == 422

    assert user_client.delete(f"{API}/{project['id']}").status_code == 204
    assert user_client.get(f"{API}/{project['id']}").status_code == 404


def test_list_filter_and_search(user_client):
    user_client.post(API, json={"name": "Garden redesign", "description": "Plants and paths"})
    user_client.post(API, json={"name": "Tax return", "status": "completed"})
    page = user_client.get(API).json()
    assert page["total"] == 2
    assert [p["name"] for p in user_client.get(API, params={"status": "completed"}).json()["items"]] == ["Tax return"]
    assert [p["name"] for p in user_client.get(API, params={"q": "plant"}).json()["items"]] == ["Garden redesign"]


def test_counts_and_delete_keeps_linked_records(user_client):
    project = user_client.post(API, json={"name": "Research"}).json()
    note = user_client.post("/api/v1/knowledge", json={"title": "Paper", "project_id": project["id"]}).json()
    decision = user_client.post("/api/v1/decisions", json={"title": "Pick DB", "project_id": project["id"]}).json()

    detail = user_client.get(f"{API}/{project['id']}").json()
    assert detail["knowledge_count"] == 1 and detail["decision_count"] == 1
    linked = user_client.get("/api/v1/knowledge", params={"project_id": project["id"]}).json()
    assert [i["id"] for i in linked["items"]] == [note["id"]]

    user_client.delete(f"{API}/{project['id']}")
    assert user_client.get(f"/api/v1/knowledge/{note['id']}").json()["project"] is None
    assert user_client.get(f"/api/v1/decisions/{decision['id']}").json()["project"] is None


def test_project_isolation(user_client, other_client):
    project = user_client.post(API, json={"name": "Mine"}).json()
    path = f"{API}/{project['id']}"
    assert other_client.get(path).status_code == 404
    assert other_client.patch(path, json={"name": "Theirs"}).status_code == 404
    assert other_client.delete(path).status_code == 404
    assert other_client.get(API).json()["total"] == 0
    assert user_client.get(path).json()["name"] == "Mine"
