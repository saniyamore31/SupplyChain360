from datetime import date, timedelta
from flask import Blueprint, jsonify
from sqlalchemy import func
from app import db
from app.models.product import Product
from app.models.demand import DemandRecord

recommendations_bp = Blueprint("recommendations", __name__)

@recommendations_bp.route("/recommendations/reorder", methods=["GET"])
def get_reorder_recommendations():
    """
    Explainable Inventory Reorder Recommendations:
    Derives suggested replenishment quantities using classical supply chain formulas:
    - Lead Time Demand = (Avg Daily Demand over 30 days) * Supplier Lead Time (days)
    - Safety Stock = Product Reorder Level
    - Target Stock Level = Lead Time Demand + Safety Stock
    - Suggested Reorder Quantity = max(0, Target Stock Level - Current Stock)
    """
    products = Product.query.all()
    today = date.today()
    thirty_days_ago = today - timedelta(days=30)

    # Calculate 30-day demand totals for each product
    demand_totals = dict(
        db.session.query(
            DemandRecord.product_id,
            func.coalesce(func.sum(DemandRecord.quantity_demanded), 0)
        ).filter(DemandRecord.date >= thirty_days_ago)
        .group_by(DemandRecord.product_id).all()
    )

    recommendations = []
    for p in products:
        lead_time = p.supplier.lead_time_days if p.supplier else 7
        total_30d_demand = float(demand_totals.get(p.id, 0))
        avg_daily_demand = round(total_30d_demand / 30.0, 2)

        lead_time_demand = round(avg_daily_demand * lead_time, 1)
        safety_stock = p.reorder_level
        target_stock = max(int(round(lead_time_demand + safety_stock)), p.reorder_level * 2)

        is_reorder_needed = p.stock_quantity <= p.reorder_level
        suggested_qty = max(0, target_stock - p.stock_quantity) if is_reorder_needed else 0

        if is_reorder_needed:
            if p.stock_quantity == 0:
                urgency = "CRITICAL"
            elif p.stock_quantity <= (p.reorder_level / 2):
                urgency = "HIGH"
            else:
                urgency = "MEDIUM"

            reason = (
                f"Current stock ({p.stock_quantity}) is below reorder threshold ({p.reorder_level}). "
                f"Average consumption is {avg_daily_demand} units/day with a {lead_time}-day supplier lead time, "
                f"requiring ~{int(round(lead_time_demand))} units buffer during delivery."
            )
        else:
            urgency = "HEALTHY"
            reason = f"Stock level ({p.stock_quantity}) is healthy and well above the reorder threshold ({p.reorder_level})."

        recommendations.append({
            "product_id": p.id,
            "product_name": p.name,
            "sku": p.sku,
            "category": p.category,
            "current_stock": p.stock_quantity,
            "reorder_level": p.reorder_level,
            "lead_time_days": lead_time,
            "avg_daily_demand_30d": avg_daily_demand,
            "lead_time_demand": lead_time_demand,
            "target_stock_level": target_stock,
            "suggested_reorder_quantity": suggested_qty,
            "estimated_cost": round(suggested_qty * float(p.unit_cost), 2),
            "unit_cost": float(p.unit_cost),
            "supplier_id": p.supplier_id,
            "supplier_name": p.supplier.company_name if p.supplier else "No Supplier",
            "urgency": urgency,
            "is_reorder_needed": is_reorder_needed,
            "reason": reason
        })

    # Sort so most urgent recommendations appear first
    urgency_rank = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "HEALTHY": 3}
    recommendations.sort(key=lambda x: (urgency_rank[x["urgency"]], x["current_stock"]))

    return jsonify({
        "success": True,
        "methodology": "Rule-Based Deterministic Optimization (Target Stock = Lead-Time Demand + Safety Stock)",
        "disclaimer": "This system applies verified transparent supply chain equations. It is an explainable rule-based decision support tool, not an opaque AI prediction system.",
        "active_recommendations_count": sum(1 for r in recommendations if r["is_reorder_needed"]),
        "recommendations": recommendations
    }), 200
