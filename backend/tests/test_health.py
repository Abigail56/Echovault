def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


def test_security_headers_and_body_limit(client):
    response = client.get("/health")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    big = client.post(
        "/api/v1/auth/login",
        content=b"x" * 1_100_000,
        headers={"content-type": "application/json"},
    )
    assert big.status_code == 413


def test_unknown_route_404(client):
    assert client.get("/api/v1/nope").status_code == 404
