def test_health_check(client):
    """Test health endpoint returns 200 and healthy status."""
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["status"] == "healthy"
    assert "timestamp" in data
