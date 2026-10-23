from app import db
from app.models import Product

def test_purchase_order_lifecycle_and_inventory_receipt(client, sample_data, ops_headers):
    """
    Comprehensive verification of critical inventory receipt rules:
    1. Draft order does NOT change inventory.
    2. Pending transition does NOT change inventory.
    3. Shipped transition does NOT change inventory.
    4. Delivery/Receipt increases stock by exact item quantity.
    5. Duplicate receipt requests are rejected with 409 and do NOT add stock twice.
    6. Already delivered orders cannot transition to illegal states.
    """
    p = sample_data["product_low"]
    initial_stock = p.stock_quantity  # 10

    # 1. Create Draft Purchase Order for 50 units
    order_payload = {
        "supplier_id": sample_data["supplier"].id,
        "status": "draft",
        "items": [
            {"product_id": p.id, "quantity": 50, "unit_price": 100.0}
        ]
    }
    res = client.post("/api/v1/purchase-orders", json=order_payload, headers=ops_headers)
    assert res.status_code == 201
    order_id = res.get_json()["order"]["id"]

    # Verify inventory was NOT modified by draft creation
    p_check = db.session.get(Product, p.id)
    assert p_check.stock_quantity == initial_stock

    # 2. Transition Draft -> Pending
    res = client.patch(f"/api/v1/purchase-orders/{order_id}/status", json={"status": "pending"}, headers=ops_headers)
    assert res.status_code == 200
    assert db.session.get(Product, p.id).stock_quantity == initial_stock

    # 3. Transition Pending -> Shipped
    res = client.patch(f"/api/v1/purchase-orders/{order_id}/status", json={"status": "shipped"}, headers=ops_headers)
    assert res.status_code == 200
    assert db.session.get(Product, p.id).stock_quantity == initial_stock

    # 4. Receive Order (Shipped -> Delivered)
    res = client.post(f"/api/v1/purchase-orders/{order_id}/receive", headers=ops_headers)
    assert res.status_code == 200
    receipt_data = res.get_json()
    assert receipt_data["success"] is True
    assert receipt_data["order"]["is_received"] is True
    assert receipt_data["order"]["status"] == "delivered"

    # Verify stock increased by EXACTLY 50 units
    p_after_receipt = db.session.get(Product, p.id)
    assert p_after_receipt.stock_quantity == initial_stock + 50

    # 5. DUPLICATE RECEIPT ATTEMPT MUST BE REJECTED (HTTP 409)
    res_duplicate = client.post(f"/api/v1/purchase-orders/{order_id}/receive", headers=ops_headers)
    assert res_duplicate.status_code == 409
    assert "already received" in res_duplicate.get_json()["message"].lower()

    # Verify stock was NOT incremented again
    p_after_duplicate = db.session.get(Product, p.id)
    assert p_after_duplicate.stock_quantity == initial_stock + 50

    # 6. Cannot transition from Delivered back to Shipped or Draft
    res_illegal = client.patch(f"/api/v1/purchase-orders/{order_id}/status", json={"status": "draft"}, headers=ops_headers)
    assert res_illegal.status_code == 400
    assert "Illegal Status Transition" in res_illegal.get_json()["error"]

def test_cancelled_orders_cannot_be_received(client, sample_data, ops_headers):
    """Verify that cancelled orders cannot update inventory."""
    p = sample_data["product_healthy"]
    initial_stock = p.stock_quantity

    order_payload = {
        "supplier_id": sample_data["supplier"].id,
        "status": "draft",
        "items": [
            {"product_id": p.id, "quantity": 100, "unit_price": 2.5}
        ]
    }
    res = client.post("/api/v1/purchase-orders", json=order_payload, headers=ops_headers)
    order_id = res.get_json()["order"]["id"]

    # Cancel order
    client.patch(f"/api/v1/purchase-orders/{order_id}/status", json={"status": "cancelled"}, headers=ops_headers)

    # Attempt to receive cancelled order
    res_receive = client.post(f"/api/v1/purchase-orders/{order_id}/receive", headers=ops_headers)
    assert res_receive.status_code == 400
    assert "cancelled" in res_receive.get_json()["message"].lower()

    # Stock must remain unchanged
    assert db.session.get(Product, p.id).stock_quantity == initial_stock
