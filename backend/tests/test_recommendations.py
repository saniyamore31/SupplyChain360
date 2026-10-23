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

def test_empty_demand_dataset_graceful_fallback(client, sample_data):
    """
    Test edge-case: when no demand records exist in database,
    recommendations and demand analytics must still function without crashing or dividing by zero.
    """
    # 1. Recommendations should not crash
    rec_res = client.get("/api/v1/recommendations/reorder")
    assert rec_res.status_code == 200
    recs = rec_res.get_json()["recommendations"]
    assert len(recs) == 2

    # 2. Demand summary should return 0s gracefully
    sum_res = client.get("/api/v1/demand/summary")
    assert sum_res.status_code == 200
    sum_data = sum_res.get_json()
    assert sum_data["total_demand"] == 0
    assert sum_data["avg_daily_demand"] == 0.0
    assert len(sum_data["top_products"]) == 0

    # 3. Demand trends should return empty list
    trend_res = client.get("/api/v1/demand/trends")
    assert trend_res.status_code == 200
    assert trend_res.get_json()["trends"] == []
