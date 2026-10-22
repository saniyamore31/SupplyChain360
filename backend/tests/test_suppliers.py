def test_create_supplier(client):
    """Test valid supplier creation."""
    payload = {
        "company_name": "New Alpha Labs",
        "contact_person": "Rohit Gupta",
        "email": "rohit.gupta@alphalabs.com",
        "phone": "+91 98111 22222",
        "lead_time_days": 12
    }
    res = client.post("/api/v1/suppliers", json=payload)
    assert res.status_code == 201
    data = res.get_json()
    assert data["supplier"]["company_name"] == "New Alpha Labs"
    assert data["supplier"]["lead_time_days"] == 12

def test_supplier_validation(client):
    """Test supplier email and required field validation."""
    payload = {
        "company_name": "",
        "contact_person": "",
        "email": "not-an-email",
        "phone": "",
        "lead_time_days": 0
    }
    res = client.post("/api/v1/suppliers", json=payload)
    assert res.status_code == 400
    errors = res.get_json()["errors"]
    assert "company_name" in errors
    assert "email" in errors
    assert "phone" in errors
    assert "lead_time_days" in errors

def test_supplier_deletion_restriction(client, sample_data):
    """Test that a supplier with associated products cannot be deleted."""
    sup_id = sample_data["supplier"].id
    res = client.delete(f"/api/v1/suppliers/{sup_id}")
    assert res.status_code == 409
    data = res.get_json()
    assert "assigned to this supplier" in data["message"]
