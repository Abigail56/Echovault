def seed(client):
    project = client.post("/api/v1/projects", json={"name": "Kubernetes migration", "description": "Move services"}).json()
    client.post("/api/v1/knowledge", json={"title": "Helm charts", "content": "Kubernetes package manager", "tags": ["devops"]})
    client.post("/api/v1/decisions", json={"title": "Adopt k8s", "reasoning": "Kubernetes autoscaling"})
    return project


def test_search_groups_results(user_client):
    seed(user_client)
    results = user_client.get("/api/v1/search", params={"q": "kubernetes"}).json()
    assert [r["title"] for r in results["knowledge"]] == ["Helm charts"]
    assert [r["title"] for r in results["projects"]] == ["Kubernetes migration"]
    assert [r["title"] for r in results["decisions"]] == ["Adopt k8s"]
    assert results["total"] == 3
    assert "Kubernetes" in results["knowledge"][0]["excerpt"]


def test_search_by_tag(user_client):
    seed(user_client)
    results = user_client.get("/api/v1/search", params={"q": "devops"}).json()
    assert [r["title"] for r in results["knowledge"]] == ["Helm charts"]


def test_no_results_and_validation(user_client):
    seed(user_client)
    assert user_client.get("/api/v1/search", params={"q": "zebra"}).json()["total"] == 0
    assert user_client.get("/api/v1/search", params={"q": "!!! '&|"}).status_code == 200
    assert user_client.get("/api/v1/search", params={"q": ""}).status_code == 422
    assert user_client.get("/api/v1/search", params={"q": "x" * 201}).status_code == 422


def test_search_respects_ownership(user_client, other_client):
    seed(user_client)
    assert other_client.get("/api/v1/search", params={"q": "kubernetes"}).json()["total"] == 0


def test_dashboard_stats(user_client, other_client):
    seed(user_client)
    stats = user_client.get("/api/v1/dashboard/stats").json()
    assert stats == {
        "knowledge_count": 1,
        "project_count": 1,
        "active_project_count": 1,
        "decision_count": 1,
        "tag_count": 1,
    }
    assert other_client.get("/api/v1/dashboard/stats").json()["knowledge_count"] == 0
