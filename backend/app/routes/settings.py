import sqlite3
from flask import Blueprint, request, jsonify
from app import db
from app.models.setting import AppSetting
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.purchase_order import PurchaseOrder
from app.models.demand import DemandRecord
from seed import seed_data

settings_bp = Blueprint("settings", __name__)

@settings_bp.route("/settings", methods=["GET"])
def get_settings():
    """Retrieve application settings and database environment diagnostics."""
    settings = {s.key: s.value for s in AppSetting.query.all()}
    
    # Defaults
    settings.setdefault("business_name", "SupplyChain360 Global Logistics")
    settings.setdefault("currency_code", "INR")
    settings.setdefault("currency_symbol", "₹")
    settings.setdefault("low_stock_threshold_multiplier", "1.0")

    # Live database metrics
    db_diagnostics = {
        "database_type": "SQLite 3",
        "sqlite_version": sqlite3.sqlite_version,
        "counts": {
            "products": Product.query.count(),
            "suppliers": Supplier.query.count(),
            "purchase_orders": PurchaseOrder.query.count(),
            "demand_records": DemandRecord.query.count()
        }
    }

    return jsonify({
        "success": True,
        "settings": settings,
        "diagnostics": db_diagnostics
    }), 200


@settings_bp.route("/settings", methods=["PUT"])
def update_settings():
    """Update configurable business preferences."""
    data = request.get_json() or {}

    if "business_name" in data:
        name = str(data["business_name"]).strip()
        if name:
            AppSetting.set_value("business_name", name)

    if "currency_code" in data:
        code = str(data["currency_code"]).strip().upper()
        if code:
            AppSetting.set_value("currency_code", code)

    if "currency_symbol" in data:
        sym = str(data["currency_symbol"]).strip()
        if sym:
            AppSetting.set_value("currency_symbol", sym)

    if "low_stock_threshold_multiplier" in data:
        try:
            val = float(data["low_stock_threshold_multiplier"])
            if val > 0:
                AppSetting.set_value("low_stock_threshold_multiplier", str(val))
        except (ValueError, TypeError):
            pass

    return jsonify({
        "success": True,
        "message": "Settings updated successfully."
    }), 200


@settings_bp.route("/settings/seed", methods=["POST"])
def seed_database():
    """Safely seed demo data if the database is currently empty."""
    if Product.query.first():
        return jsonify({
            "success": False,
            "message": "Database already contains records. To re-seed, please use the Reset operation with explicit confirmation."
        }), 400

    seed_data(reset=False)
    return jsonify({
        "success": True,
        "message": "Demonstration data seeded successfully."
    }), 200


@settings_bp.route("/settings/reset", methods=["POST"])
def reset_database():
    """
    Destructive demonstration data reset.
    Enforces requirement 12 & 16:
    'Require explicit user confirmation before deleting or replacing demonstration records.'
    """
    data = request.get_json() or {}
    confirmation = data.get("confirm")

    if confirmation != "CONFIRM_DEMO_RESET":
        return jsonify({
            "success": False,
            "error": "Confirmation Required",
            "message": "This is a destructive action that clears all records and restores demo defaults. You must pass confirm: 'CONFIRM_DEMO_RESET' to proceed."
        }), 400

    seed_data(reset=True)
    return jsonify({
        "success": True,
        "message": "Database successfully wiped and reset with clean demonstration data."
    }), 200
