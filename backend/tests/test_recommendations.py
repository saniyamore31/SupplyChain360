def test_reorder_recommendation_logic(client, sample_data):
    """Test reorder recommendations flag products correctly."""
    res = client.get("/api/v1/recommendations/reorder")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "methodology" in data
    recs = {r["sku"]: r for r in data["recommendations"]}

    # Product 1 has stock 10 <= reorder 20 -> must require reorder
    p1_rec = recs["TEST-CHIP-01"]
    assert p1_rec["is_reorder_needed"] is True
    assert p1_rec["suggested_reorder_quantity"] > 0
    assert p1_rec["urgency"] in ("CRITICAL", "HIGH", "MEDIUM")

    # Product 2 has stock 500 > reorder 100 -> healthy
    p2_rec = recs["TEST-BOLT-01"]
    assert p2_rec["is_reorder_needed"] is False
    assert p2_rec["suggested_reorder_quantity"] == 0
    assert p2_rec["urgency"] == "HEALTHY"
