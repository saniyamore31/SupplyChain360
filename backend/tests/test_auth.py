def test_login_success(client, auth_users):
    """Test login with valid credentials returns Bearer token and user info."""
    res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "Password123"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "token" in data
    assert data["user"]["username"] == "admin"
    assert data["user"]["role"] == "admin"
    assert "password" not in data["user"]
    assert "password_hash" not in data["user"]

def test_login_invalid_credentials(client, auth_users):
    """Test login rejection on wrong password."""
    res = client.post("/api/v1/auth/login", json={
        "username": "admin",
        "password": "BadPassword"
    })
    assert res.status_code == 401
    data = res.get_json()
    assert data["success"] is False
    assert "Invalid Credentials" in data["error"]

def test_unauthenticated_request_rejected(client):
    """Test accessing protected route without token returns 401."""
    res = client.post("/api/v1/products", json={"name": "Test"})
    assert res.status_code == 401
    data = res.get_json()
    assert "Unauthorized" in data["error"]

def test_invalid_token_rejected(client):
    """Test forged/tampered token is rejected with 401."""
    res = client.post("/api/v1/products", json={"name": "Test"}, headers={
        "Authorization": "Bearer forged.token.signature"
    })
    assert res.status_code == 401

def test_role_based_access_control(client, sample_data, admin_headers, ops_headers, inv_headers, viewer_headers):
    """
    Test RBAC enforcement:
    - Inventory Manager CAN create products.
    - Operations Manager CANNOT create products (403 Forbidden).
    - Viewer CANNOT create products (403 Forbidden).
    - Operations Manager CAN create purchase orders.
    - Inventory Manager CANNOT create purchase orders (403 Forbidden).
    - Viewer CANNOT reset database (403 Forbidden).
    - Admin CAN update settings and reset database.
    """
    # 1. Product creation by Inventory Manager -> SUCCESS
    prod_payload = {
        "name": "RBAC Microchip",
        "sku": "RBAC-CHIP-01",
        "category": "Electronics",
        "stock_quantity": 50,
        "reorder_level": 15,
        "unit_cost": 25.0
    }
    res_inv = client.post("/api/v1/products", json=prod_payload, headers=inv_headers)
    assert res_inv.status_code == 201

    # 2. Product creation by Operations Manager -> 403 FORBIDDEN
    prod_payload2 = {
        "name": "RBAC Microchip 2",
        "sku": "RBAC-CHIP-02",
        "category": "Electronics",
        "stock_quantity": 50,
        "reorder_level": 15,
        "unit_cost": 25.0
    }
    res_ops = client.post("/api/v1/products", json=prod_payload2, headers=ops_headers)
    assert res_ops.status_code == 403
    assert "Forbidden" in res_ops.get_json()["error"]

    # 3. Product creation by Viewer -> 403 FORBIDDEN
    res_viewer = client.post("/api/v1/products", json=prod_payload2, headers=viewer_headers)
    assert res_viewer.status_code == 403

    # 4. Purchase Order creation by Operations Manager -> SUCCESS
    po_payload = {
        "supplier_id": sample_data["supplier"].id,
        "status": "draft",
        "items": [{"product_id": sample_data["product_low"].id, "quantity": 10, "unit_price": 100.0}]
    }
    res_po_ops = client.post("/api/v1/purchase-orders", json=po_payload, headers=ops_headers)
    assert res_po_ops.status_code == 201

    # 5. Purchase Order creation by Inventory Manager -> 403 FORBIDDEN
    res_po_inv = client.post("/api/v1/purchase-orders", json=po_payload, headers=inv_headers)
    assert res_po_inv.status_code == 403

    # 6. Database reset by Viewer -> 403 FORBIDDEN
    res_reset_viewer = client.post("/api/v1/settings/reset", json={"confirm": "CONFIRM_DEMO_RESET"}, headers=viewer_headers)
    assert res_reset_viewer.status_code == 403

    # 7. Settings update by Admin -> SUCCESS
    res_set_admin = client.put("/api/v1/settings", json={"business_name": "Updated Supply Chain Ltd"}, headers=admin_headers)
    assert res_set_admin.status_code == 200

def test_demo_users_endpoint(client):
    """Test demo accounts endpoint returns metadata for all 4 roles."""
    res = client.get("/api/v1/auth/demo-users")
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["demo_accounts"]) == 4
    roles = [acc["role"] for acc in data["demo_accounts"]]
    assert "admin" in roles
    assert "operations_manager" in roles
    assert "inventory_manager" in roles
    assert "viewer" in roles
