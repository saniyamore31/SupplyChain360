from flask import Blueprint, jsonify
from datetime import datetime

health_bp = Blueprint("health", __name__)

@health_bp.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint to verify backend operational status."""
    return jsonify({
        "success": True,
        "status": "healthy",
        "service": "SupplyChain360 API",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }), 200
