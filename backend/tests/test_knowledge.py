import uuid

API = "/api/v1/knowledge"


def create(client, **overrides):
    payload = {"title": "PostgreSQL indexing", "content": "GIN indexes speed up full-text search.", "tags": []}
    payload.update(overrides)
    response = client.post(API, json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_create_and_read(user_client):
    item = create(user_client, title="  Spaced title  ", tags=["Postgres", "postgres", " DB "])
    assert item["title"] == "Spaced title"
    assert item["tags"] == ["db", "postgres"]  # normalised, de-duplicated, sorted
    fetched = user_client.get(f"{API}/{item['id']}").json()
    assert fetched["content"] == "GIN indexes speed up full-text search."
    assert fetched["project"] is None


def test_validation(user_client):
    assert user_client.post(API, json={"title": "   "}).status_code == 422
    assert user_client.post(API, json={"title": "x" * 301}).status_code == 422
    assert user_client.post(API, json={"title": "ok", "tags": ["t"] * 21}).status_code == 422
    assert user_client.post(API, json={"title": "ok", "tags": ["x" * 51]}).status_code == 422
    assert user_client.post(API, json={"title": "ok", "project_id": str(uuid.uuid4())}).status_code == 422


def test_list_sort_paginate(user_client):
    for i in range(5):
        create(user_client, title=f"Note {i}")
    page = user_client.get(API, params={"limit": 2, "offset": 0, "sort": "title", "order": "asc"}).json()
    assert page["total"] == 5
    assert [i["title"] for i in page["items"]] == ["Note 0", "Note 1"]
    page2 = user_client.get(API, params={"limit": 2, "offset": 4, "sort": "title", "order": "asc"}).json()
    assert [i["title"] for i in page2["items"]] == ["Note 4"]
    newest = user_client.get(API).json()["items"][0]
    assert newest["title"] == "Note 4"
    assert "content" not in newest and "excerpt" in newest


def test_update_partial_and_clear_project(user_client):
    project = user_client.post("/api/v1/projects", json={"name": "Thesis"}).json()
    item = create(user_client, tags=["a"], project_id=project["id"])
    assert item["project"] == {"id": project["id"], "name": "Thesis"}

    updated = user_client.patch(f"{API}/{item['id']}", json={"content": "New body"}).json()
    assert updated["content"] == "New body"
    assert updated["title"] == item["title"]
    assert updated["tags"] == ["a"]
    assert updated["project"]["id"] == project["id"]

    cleared = user_client.patch(f"{API}/{item['id']}", json={"project_id": None, "tags": ["b", "c"]}).json()
    assert cleared["project"] is None
    assert cleared["tags"] == ["b", "c"]


def test_delete(user_client):
    item = create(user_client)
    assert user_client.delete(f"{API}/{item['id']}").status_code == 204
    assert user_client.get(f"{API}/{item['id']}").status_code == 404
    assert user_client.delete(f"{API}/{item['id']}").status_code == 404


def test_search_and_tag_filter(user_client):
    create(user_client, title="Docker volumes", content="Named volumes persist data.", tags=["docker"])
    create(user_client, title="React hooks", content="useEffect runs after render.", tags=["react"])
    create(user_client, title="Postgres backups", content="pg_dump creates logical backups.", tags=["postgres"])

    def titles(**params):
        return [i["title"] for i in user_client.get(API, params=params).json()["items"]]

    assert titles(q="volume") == ["Docker volumes"]  # stemming/prefix match
    assert titles(q="pg_dump") == ["Postgres backups"]
    assert titles(q="backup logical") == ["Postgres backups"]
    assert titles(q="nothing-matches-this") == []
    assert titles(q="%") == []  # LIKE wildcards are escaped
    assert titles(tag="REACT") == ["React hooks"]
    tags = user_client.get("/api/v1/tags").json()
    assert {t["name"] for t in tags} == {"docker", "react", "postgres"}


def test_cross_user_isolation(user_client, other_client):
    mine = create(user_client, title="Private diary", tags=["secret"])
    path = f"{API}/{mine['id']}"
    assert other_client.get(path).status_code == 404
    assert other_client.patch(path, json={"title": "pwned"}).status_code == 404
    assert other_client.delete(path).status_code == 404
    assert other_client.get(API).json()["total"] == 0
    assert other_client.get(API, params={"q": "diary"}).json()["total"] == 0
    assert other_client.get("/api/v1/tags").json() == []
    # Still intact for the owner.
    assert user_client.get(path).json()["title"] == "Private diary"


def test_cannot_link_another_users_project(user_client, other_client):
    foreign = other_client.post("/api/v1/projects", json={"name": "Not yours"}).json()
    assert user_client.post(API, json={"title": "x", "project_id": foreign["id"]}).status_code == 422
    item = create(user_client)
    assert user_client.patch(f"{API}/{item['id']}", json={"project_id": foreign["id"]}).status_code == 422


def test_invalid_id_is_422(user_client):
    assert user_client.get(f"{API}/not-a-uuid").status_code == 422


def test_excerpt_is_plain_text(user_client):
    create(user_client, title="Md", content="# Heading\n\n- **Bold** item with [a link](https://x.example)\n\n```\ncode\n```")
    excerpt = user_client.get(API).json()["items"][0]["excerpt"]
    assert excerpt == "Heading Bold item with a link code"
    create(user_client, title="Code", content="Call `get_user_by_id` from snake_case_module")
    assert user_client.get(API).json()["items"][0]["excerpt"] == "Call get_user_by_id from snake_case_module"


def test_archive_and_restore(user_client):
    item = create(user_client, title="Old idea")
    create(user_client, title="Current idea")
    archived = user_client.patch(f"{API}/{item['id']}", json={"archived": True}).json()
    assert archived["archived_at"] is not None

    assert [i["title"] for i in user_client.get(API).json()["items"]] == ["Current idea"]
    assert [i["title"] for i in user_client.get(API, params={"archived": True}).json()["items"]] == ["Old idea"]
    stats = user_client.get("/api/v1/dashboard/stats").json()
    assert (stats["knowledge_count"], stats["archived_knowledge_count"]) == (1, 1)
    # Archived notes still turn up in global search, labelled.
    hit = user_client.get("/api/v1/search", params={"q": "old"}).json()["knowledge"][0]
    assert hit["label"] == "Archived"

    restored = user_client.patch(f"{API}/{item['id']}", json={"archived": False}).json()
    assert restored["archived_at"] is None
    assert user_client.get(API).json()["total"] == 2


def test_related_notes_are_two_way(user_client):
    a = create(user_client, title="A")
    b = create(user_client, title="B")
    c = create(user_client, title="C", related_ids=[a["id"], b["id"], a["id"]])
    assert [r["title"] for r in c["related"]] == ["A", "B"]
    # The link shows from the other side too.
    assert [r["title"] for r in user_client.get(f"{API}/{a['id']}").json()["related"]] == ["C"]

    updated = user_client.patch(f"{API}/{c['id']}", json={"related_ids": [b["id"]]}).json()
    assert [r["title"] for r in updated["related"]] == ["B"]
    assert user_client.get(f"{API}/{a['id']}").json()["related"] == []

    # Linking to itself is ignored; deleting a note removes its links.
    assert user_client.patch(f"{API}/{b['id']}", json={"related_ids": [b["id"]]}).json()["related"] == []
    user_client.patch(f"{API}/{a['id']}", json={"related_ids": [b["id"]]})
    user_client.delete(f"{API}/{b['id']}")
    assert user_client.get(f"{API}/{a['id']}").json()["related"] == []


def test_cannot_link_another_users_note(user_client, other_client):
    foreign = other_client.post(API, json={"title": "Theirs"}).json()
    response = user_client.post(API, json={"title": "Mine", "related_ids": [foreign["id"]]})
    assert response.status_code == 422
    mine = create(user_client, title="Mine")
    assert user_client.patch(f"{API}/{mine['id']}", json={"related_ids": [foreign["id"]]}).status_code == 422
    assert other_client.get(f"{API}/{foreign['id']}").json()["related"] == []
