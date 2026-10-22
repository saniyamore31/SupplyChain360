from flask import Blueprint, jsonify
from sqlalchemy import func
from app import db
from app.models.product import Product
from app.models.purchase_order import PurchaseOrder
from app.models.demand import DemandRecord

dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/dashboard/summary", methods=["GET"])
def get_dashboard_summary():
    """
    Calculate high-level summary KPIs directly from the live database.
    """
    total_products = Product.query.count()
    
    # Total units in stock & inventory value
    units_result = db.session.query(
        func.coalesce(func.sum(Product.stock_quantity), 0),
        func.coalesce(func.sum(Product.stock_quantity * Product.unit_cost), 0.0)
    ).first()
    
    total_units_in_stock = int(units_result[0])
    total_inventory_value = round(float(units_result[1]), 2)

    # Number of low stock products
    low_stock_count = Product.query.filter(Product.stock_quantity <= Product.reorder_level).count()

    # Number of open purchase orders
    open_orders_count = PurchaseOrder.query.filter(PurchaseOrder.status.in_(["draft", "pending", "shipped"])).count()

    return jsonify({
        "success": True,
        "summary": {
            "total_products": total_products,
            "total_units_in_stock": total_units_in_stock,
            "low_stock_count": low_stock_count,
            "open_orders_count": open_orders_count,
            "total_inventory_value": total_inventory_value,
            "value_methodology_note": "Estimated inventory value is dynamically calculated as the exact sum of (stock_quantity × unit_cost) across all inventory items."
        }
    }), 200


@dashboard_bp.route("/dashboard/inventory-by-category", methods=["GET"])
def get_inventory_by_category():
    """
    Aggregate stock quantity and inventory valuation grouped by product category.
    """
    results = db.session.query(
        Product.category,
        func.count(Product.id).label("product_count"),
        func.sum(Product.stock_quantity).label("total_units"),
        func.sum(Product.stock_quantity * Product.unit_cost).label("total_value")
    ).group_by(Product.category).all()

    categories_data = [
        {
            "category": r[0],
            "product_count": r[1],
            "total_units": int(r[2] or 0),
            "total_value": round(float(r[3] or 0.0), 2)
        }
        for r in results
    ]

    return jsonify({
        "success": True,
        "categories": categories_data
    }), 200


@dashboard_bp.route("/dashboard/orders-by-status", methods=["GET"])
def get_orders_by_status():
    """
    Group purchase orders by status for distribution breakdown.
    """
    results = db.session.query(
        PurchaseOrder.status,
        func.count(PurchaseOrder.id).label("count"),
        func.coalesce(func.sum(PurchaseOrder.total_amount), 0.0).label("total_amount")
    ).group_by(PurchaseOrder.status).all()

    status_counts = {r[0]: {"count": r[1], "total_amount": round(float(r[2]), 2)} for r in results}
    all_statuses = ["draft", "pending", "shipped", "delivered", "cancelled"]

    orders_data = [
        {
            "status": s,
            "count": status_counts.get(s, {}).get("count", 0),
            "total_amount": status_counts.get(s, {}).get("total_amount", 0.0)
        }
        for s in all_statuses
    ]

    return jsonify({
        "success": True,
        "orders_by_status": orders_data
    }), 200


@dashboard_bp.route("/dashboard/monthly-demand", methods=["GET"])
def get_monthly_demand_trends():
    """
    Monthly demand aggregation for the dashboard chart.
    Uses SQLite strftime('%Y-%m', date) to group demand by year-month.
    """
    results = db.session.query(
        func.strftime("%Y-%m", DemandRecord.date).label("month"),
        func.sum(DemandRecord.quantity_demanded).label("total_quantity")
    ).group_by("month").order_by("month").all()

    trends = [
        {
            "month": r[0],
            "quantity": int(r[1] or 0)
        }
        for r in results
    ]

    return jsonify({
        "success": True,
        "trends": trends
    }), 200


@dashboard_bp.route("/dashboard/low-stock", methods=["GET"])
def get_low_stock_alerts():
    """
    Retrieve products that are currently below or at their reorder threshold.
    Includes suggested reorder quantities and recommended supplier actions.
    """
    low_stock_products = Product.query.filter(
        Product.stock_quantity <= Product.reorder_level
    ).order_by(Product.stock_quantity.asc()).all()

    alerts = []
    for p in low_stock_products:
        # Explainable rule: target stock = reorder_level * 2.5 (rounded)
        target_stock = max(p.reorder_level * 2, p.reorder_level + 20)
        suggested_qty = max(0, target_stock - p.stock_quantity)
        
        urgency = "Critical" if p.stock_quantity == 0 else "Urgent" if p.stock_quantity < (p.reorder_level / 2) else "Moderate"
        alerts.append({
            "product_id": p.id,
            "name": p.name,
            "sku": p.sku,
            "category": p.category,
            "current_stock": p.stock_quantity,
            "reorder_level": p.reorder_level,
            "suggested_reorder_quantity": suggested_qty,
            "supplier_id": p.supplier_id,
            "supplier_name": p.supplier.company_name if p.supplier else "No Supplier Assigned",
            "lead_time_days": p.supplier.lead_time_days if p.supplier else 7,
            "unit_cost": float(p.unit_cost),
            "estimated_reorder_cost": round(suggested_qty * float(p.unit_cost), 2),
            "urgency": urgency,
            "recommended_action": f"Create Purchase Order for {suggested_qty} units with {p.supplier.company_name if p.supplier else 'vendor'}"
        })

    return jsonify({
        "success": True,
        "count": len(alerts),
        "alerts": alerts
    }), 200
