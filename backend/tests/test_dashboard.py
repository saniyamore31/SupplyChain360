def test_dashboard_summary_calculations(client, sample_data):
    """Test dynamic KPI calculation in dashboard summary."""
    res = client.get("/api/v1/dashboard/summary")
    assert res.status_code == 200
    summary = res.get_json()["summary"]
    assert summary["total_products"] == 2
    # Product 1 has 10 units at 100.0 = 1000.0, Product 2 has 500 units at 2.5 = 1250.0. Total = 2250.0
    assert summary["total_units_in_stock"] == 510
    assert summary["total_inventory_value"] == 2250.0
    assert summary["low_stock_count"] == 1  # Product 1 (10 <= 20)

def test_dashboard_category_distribution(client, sample_data):
    """Test category grouping."""
    res = client.get("/api/v1/dashboard/inventory-by-category")
    assert res.status_code == 200
    categories = res.get_json()["categories"]
    cats = {c["category"]: c["total_units"] for c in categories}
    assert cats.get("Electronics") == 10
    assert cats.get("Hardware") == 500
