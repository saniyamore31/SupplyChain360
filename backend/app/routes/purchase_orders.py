from datetime import datetime, date
from flask import Blueprint, request, jsonify
from sqlalchemy import or_, desc
from app import db
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem
from app.models.product import Product
from app.models.supplier import Supplier

purchase_orders_bp = Blueprint("purchase_orders", __name__)

ALLOWED_STATUSES = {"draft", "pending", "shipped", "delivered", "cancelled"}

VALID_TRANSITIONS = {
    "draft": {"pending", "cancelled"},
    "pending": {"shipped", "cancelled"},
    "shipped": {"delivered", "cancelled"},
    "delivered": set(),  # Terminal state once received
    "cancelled": set()   # Terminal state
}

def generate_order_number():
    """Generate sequential human-readable order number like PO-YYYY-NNNN."""
    year = datetime.utcnow().year
    count = PurchaseOrder.query.filter(PurchaseOrder.order_number.like(f"PO-{year}-%")).count() + 1
    return f"PO-{year}-{count:04d}"

@purchase_orders_bp.route("/purchase-orders", methods=["GET"])
def get_orders():
    """
    List purchase orders with search, supplier filter, status filter, and pagination.
    """
    search = request.args.get("search", "", type=str).strip()
    status = request.args.get("status", "", type=str).strip().lower()
    supplier_id = request.args.get("supplier_id", type=int)
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 15, type=int)

    query = PurchaseOrder.query
    if search:
        search_term = f"%{search}%"
        query = query.filter(PurchaseOrder.order_number.ilike(search_term))

    if status and status != "all":
        query = query.filter(PurchaseOrder.status == status)

    if supplier_id:
        query = query.filter(PurchaseOrder.supplier_id == supplier_id)

    query = query.order_by(desc(PurchaseOrder.created_at))
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "success": True,
        "orders": [po.to_dict(include_items=False) for po in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page
    }), 200


@purchase_orders_bp.route("/purchase-orders/<int:id>", methods=["GET"])
def get_order(id):
    """Retrieve complete purchase order details with all line items."""
    order = PurchaseOrder.query.get(id)
    if not order:
        return jsonify({"success": False, "error": "Not Found", "message": f"Purchase order {id} not found."}), 404

    return jsonify({
        "success": True,
        "order": order.to_dict(include_items=True)
    }), 200


@purchase_orders_bp.route("/purchase-orders", methods=["POST"])
def create_order():
    """
    Create a new purchase order with one or more line items.
    Validates supplier, products, quantities, prices, and calculates totals safely.
    Note: Creating an order never increments inventory!
    """
    data = request.get_json() or {}
    errors = {}

    supplier_id = data.get("supplier_id")
    order_date_str = data.get("order_date")
    expected_delivery_date_str = data.get("expected_delivery_date")
    items_data = data.get("items", [])
    notes = (data.get("notes") or "").strip()
    status = (data.get("status") or "draft").strip().lower()

    if status not in {"draft", "pending"}:
        errors["status"] = "Initial order status must be either 'draft' or 'pending'."

    if not supplier_id:
        errors["supplier_id"] = "Supplier selection is required."
    else:
        supplier = Supplier.query.get(supplier_id)
        if not supplier:
            errors["supplier_id"] = f"Supplier with ID {supplier_id} does not exist."

    # Parse dates
    try:
        order_date = datetime.strptime(order_date_str, "%Y-%m-%d").date() if order_date_str else date.today()
    except ValueError:
        errors["order_date"] = "Order date must be in YYYY-MM-DD format."
        order_date = date.today()

    try:
        if expected_delivery_date_str:
            expected_delivery_date = datetime.strptime(expected_delivery_date_str, "%Y-%m-%d").date()
            if expected_delivery_date < order_date:
                errors["expected_delivery_date"] = "Expected delivery date cannot be earlier than order date."
        else:
            lead_time = supplier.lead_time_days if supplier else 7
            from datetime import timedelta
            expected_delivery_date = order_date + timedelta(days=lead_time)
    except ValueError:
        errors["expected_delivery_date"] = "Expected delivery date must be in YYYY-MM-DD format."

    if not items_data or not isinstance(items_data, list):
        errors["items"] = "Purchase order must contain at least one product line item."

    if errors:
        return jsonify({"success": False, "error": "Validation Error", "errors": errors, "message": "Form validation failed."}), 400

    # Validate each line item
    line_items_to_create = []
    total_amount = 0.0

    for idx, item_input in enumerate(items_data):
        prod_id = item_input.get("product_id")
        qty = item_input.get("quantity")
        unit_price = item_input.get("unit_price")

        product = Product.query.get(prod_id) if prod_id else None
        if not product:
            errors[f"item_{idx}_product"] = f"Product at line {idx+1} does not exist."
            continue

        try:
            qty = int(qty)
            if qty <= 0:
                errors[f"item_{idx}_quantity"] = f"Quantity for line {idx+1} must be greater than zero."
        except (ValueError, TypeError):
            errors[f"item_{idx}_quantity"] = f"Quantity for line {idx+1} must be a valid integer."

        try:
            unit_price = float(unit_price) if unit_price is not None else float(product.unit_cost)
            if unit_price < 0:
                errors[f"item_{idx}_price"] = f"Unit price for line {idx+1} cannot be negative."
        except (ValueError, TypeError):
            errors[f"item_{idx}_price"] = f"Unit price for line {idx+1} must be a valid number."

        if errors:
            continue

        subtotal = round(qty * unit_price, 2)
        total_amount += subtotal
        line_items_to_create.append({
            "product_id": product.id,
            "quantity": qty,
            "unit_price": unit_price,
            "subtotal": subtotal
        })

    if errors:
        return jsonify({"success": False, "error": "Validation Error", "errors": errors, "message": "Line item validation failed."}), 400

    # Save order and line items inside a transaction
    try:
        order_number = generate_order_number()
        # Verify uniqueness
        while PurchaseOrder.query.filter_by(order_number=order_number).first():
            order_number = generate_order_number()

        po = PurchaseOrder(
            order_number=order_number,
            supplier_id=supplier_id,
            order_date=order_date,
            expected_delivery_date=expected_delivery_date,
            status=status,
            total_amount=round(total_amount, 2),
            notes=notes,
            is_received=False
        )
        db.session.add(po)
        db.session.flush()

        for li in line_items_to_create:
            item = PurchaseOrderItem(
                purchase_order_id=po.id,
                product_id=li["product_id"],
                quantity=li["quantity"],
                unit_price=li["unit_price"],
                subtotal=li["subtotal"]
            )
            db.session.add(item)

        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Purchase order {po.order_number} created successfully.",
            "order": po.to_dict(include_items=True)
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "error": "Database Error", "message": str(e)}), 500


@purchase_orders_bp.route("/purchase-orders/<int:id>/status", methods=["PATCH"])
def update_order_status(id):
    """
    Update purchase order status adhering strictly to allowed state transitions.
    If transitioned to 'delivered', delegates safely to the inventory receipt routine.
    """
    order = PurchaseOrder.query.get(id)
    if not order:
        return jsonify({"success": False, "error": "Not Found", "message": f"Purchase order {id} not found."}), 404

    data = request.get_json() or {}
    new_status = (data.get("status") or "").strip().lower()
    notes = data.get("notes")

    if new_status not in ALLOWED_STATUSES:
        return jsonify({
            "success": False,
            "error": "Invalid Status",
            "message": f"'{new_status}' is not a valid order status. Allowed: {', '.join(sorted(ALLOWED_STATUSES))}."
        }), 400

    if order.status == new_status:
        return jsonify({
            "success": True,
            "message": f"Order {order.order_number} is already in '{new_status}' status.",
            "order": order.to_dict()
        }), 200

    # Validate state transition
    allowed = VALID_TRANSITIONS.get(order.status, set())
    if new_status not in allowed:
        return jsonify({
            "success": False,
            "error": "Illegal Status Transition",
            "message": f"Cannot transition order from '{order.status}' to '{new_status}'. Allowed next transitions: {', '.join(sorted(allowed)) if allowed else 'None (Terminal state)'}."
        }), 400

    # If transitioning to delivered, execute receipt
    if new_status == "delivered":
        return receive_order(id)

    order.status = new_status
    if notes:
        order.notes = f"{order.notes or ''}\n[Status update: {new_status}] {notes}".strip()
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Order {order.order_number} status changed to '{new_status}'.",
        "order": order.to_dict()
    }), 200


@purchase_orders_bp.route("/purchase-orders/<int:id>/receive", methods=["POST"])
def receive_order(id):
    """
    Critical Inventory Receipt Operation:
    - Atomically receives an order into inventory.
    - Guarantees each purchase order can update inventory EXACTLY ONCE.
    - Prevents cancelled orders from being received.
    - Uses database transaction to update stock and set is_received = True.
    """
    order = PurchaseOrder.query.get(id)
    if not order:
        return jsonify({"success": False, "error": "Not Found", "message": f"Purchase order {id} not found."}), 404

    # 1. Check if already received
    if order.is_received:
        return jsonify({
            "success": False,
            "error": "Already Received",
            "message": f"Purchase order {order.order_number} was already received into inventory on {order.received_at}. Duplicate receipt is prohibited to prevent double-counting stock."
        }), 409

    # 2. Check if cancelled
    if order.status == "cancelled":
        return jsonify({
            "success": False,
            "error": "Order Cancelled",
            "message": f"Cannot receive order {order.order_number} because it has been cancelled."
        }), 400

    # 3. Transactional inventory receipt
    try:
        updated_products = []
        for item in order.items:
            product = Product.query.get(item.product_id)
            if not product:
                raise ValueError(f"Product ID {item.product_id} from line item no longer exists.")

            old_stock = product.stock_quantity
            product.stock_quantity += item.quantity
            updated_products.append({
                "product_name": product.name,
                "sku": product.sku,
                "previous_stock": old_stock,
                "quantity_added": item.quantity,
                "new_stock": product.stock_quantity
            })

        order.status = "delivered"
        order.is_received = True
        order.received_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Purchase order {order.order_number} received successfully. Inventory has been updated.",
            "order": order.to_dict(include_items=True),
            "updated_products": updated_products
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": "Receipt Transaction Failed",
            "message": f"Failed to receive order into inventory: {str(e)}"
        }), 500
