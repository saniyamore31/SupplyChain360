from app import db
from app.models import Product, PurchaseOrder, PurchaseOrderItem
from datetime import date

def test_create_product(client, sample_data, inv_headers):
    """Test successful product creation by inventory manager."""
    payload = {
        "name": "Capacitor 100uF",
        "sku": "ELEC-CAP-999",
        "category": "Electronics",
        "stock_quantity": 250,
        "reorder_level": 50,
        "unit_cost": 5.75,
        "supplier_id": sample_data["supplier"].id,
        "description": "Ceramic capacitor"
    }
    res = client.post("/api/v1/products", json=payload, headers=inv_headers)
    assert res.status_code == 201
    data = res.get_json()
    assert data["success"] is True
    assert data["product"]["sku"] == "ELEC-CAP-999"
    assert data["product"]["inventory_value"] == 250 * 5.75

def test_duplicate_sku_rejection(client, sample_data, inv_headers):
    """Test that creating a product with an existing SKU is rejected."""
    payload = {
        "name": "Duplicate Item",
        "sku": "TEST-CHIP-01",  # Already in sample_data
        "category": "Electronics",
        "stock_quantity": 20,
        "reorder_level": 5,
        "unit_cost": 50.0
    }
    res = client.post("/api/v1/products", json=payload, headers=inv_headers)
    assert res.status_code == 400
    data = res.get_json()
    assert data["success"] is False
    assert "sku" in data["errors"]

def test_product_validation_errors(client, inv_headers):
    """Test rejection of invalid negative values and missing required fields."""
    payload = {
        "name": "",
        "sku": "",
        "stock_quantity": -5,
        "unit_cost": -10.0
    }
    res = client.post("/api/v1/products", json=payload, headers=inv_headers)
    assert res.status_code == 400
    data = res.get_json()
    assert "name" in data["errors"]
    assert "sku" in data["errors"]
    assert "stock_quantity" in data["errors"]
    assert "unit_cost" in data["errors"]

def test_update_product(client, sample_data, inv_headers):
    """Test updating product details."""
    p_id = sample_data["product_low"].id
    res = client.put(f"/api/v1/products/{p_id}", json={
        "stock_quantity": 45,
        "reorder_level": 30
    }, headers=inv_headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["product"]["stock_quantity"] == 45
    assert data["product"]["reorder_level"] == 30
    assert data["product"]["is_low_stock"] is False

def test_safe_product_deletion_restriction(client, sample_data, admin_headers):
    """Test that deleting a product referenced in purchase orders is safely restricted."""
    p = sample_data["product_healthy"]
    po = PurchaseOrder(
        order_number="PO-TEST-0001",
        supplier_id=sample_data["supplier"].id,
        order_date=date.today(),
        expected_delivery_date=date.today(),
        status="delivered",
        total_amount=25.0
    )
    db.session.add(po)
    db.session.flush()

    item = PurchaseOrderItem(
        purchase_order_id=po.id,
        product_id=p.id,
        quantity=10,
        unit_price=2.5,
        subtotal=25.0
    )
    db.session.add(item)
    db.session.commit()

    # Attempt to delete the product
    res = client.delete(f"/api/v1/products/{p.id}", headers=admin_headers)
    assert res.status_code == 409
    data = res.get_json()
    assert "referenced in" in data["message"]
