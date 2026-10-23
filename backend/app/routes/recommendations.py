from flask import Blueprint, jsonify
from app.services.recommendation_service import RecommendationService

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
    recommendations = RecommendationService.calculate_reorder_recommendations()

    return jsonify({
        "success": True,
        "methodology": "Rule-Based Deterministic Optimization (Target Stock = Lead-Time Demand + Safety Stock)",
        "disclaimer": "This system applies verified transparent supply chain equations. It is an explainable rule-based decision support tool, not an opaque AI prediction system.",
        "active_recommendations_count": sum(1 for r in recommendations if r["is_reorder_needed"]),
        "recommendations": recommendations
    }), 200
