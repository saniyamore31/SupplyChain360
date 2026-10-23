from datetime import date, timedelta
from sqlalchemy import func
from app import db
from app.models.product import Product
from app.models.demand import DemandRecord

class RecommendationService:
    """
    Deterministic rule-based inventory replenishment recommendation engine.
    Applies classical supply-chain equations:
    - Lead Time Demand = Avg Daily Demand (30d) * Supplier Lead Time (days)
    - Target Stock = Lead Time Demand + Safety Stock (Reorder Level)
    - Suggested Order = max(0, Target Stock - Current Stock)
    Gracefully handles empty demand datasets with fallback to safety thresholds.
    """

    @staticmethod
    def calculate_reorder_recommendations():
        products = Product.query.all()
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)

        # 30-day demand aggregation per product
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

                if total_30d_demand > 0:
                    reason = (
                        f"Current stock ({p.stock_quantity}) is at/below reorder threshold ({p.reorder_level}). "
                        f"Average consumption is {avg_daily_demand} units/day with a {lead_time}-day supplier lead time, "
                        f"requiring ~{int(round(lead_time_demand))} units buffer during delivery."
                    )
                else:
                    reason = (
                        f"Current stock ({p.stock_quantity}) is at/below reorder threshold ({p.reorder_level}). "
                        f"Baseline target buffer is {target_stock} units based on vendor lead time ({lead_time} days)."
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

        urgency_rank = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "HEALTHY": 3}
        recommendations.sort(key=lambda x: (urgency_rank[x["urgency"]], x["current_stock"]))
        return recommendations
