from flask import Blueprint, request, jsonify, g
from app import db
from app.models.user import User
from app.services.auth_service import generate_token, auth_required

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/auth/login", methods=["POST"])
def login():
    """
    Authenticate user with username and password.
    Returns signed Bearer session token and user profile.
    """
    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({
            "success": False,
            "error": "Validation Error",
            "message": "Both username and password are required."
        }), 400

    user = User.query.filter((User.username == username) | (User.email == username)).first()
    if not user or not user.check_password(password):
        return jsonify({
            "success": False,
            "error": "Invalid Credentials",
            "message": "Invalid username or password. Please check your credentials."
        }), 401

    if not user.is_active:
        return jsonify({
            "success": False,
            "error": "Account Suspended",
            "message": "This account is inactive. Please contact your system administrator."
        }), 403

    token = generate_token(user)
    return jsonify({
        "success": True,
        "message": f"Welcome back, {user.full_name or user.username}!",
        "token": token,
        "user": user.to_dict()
    }), 200


@auth_bp.route("/auth/logout", methods=["POST"])
def logout():
    """Client-side session termination."""
    return jsonify({
        "success": True,
        "message": "Logged out successfully."
    }), 200


@auth_bp.route("/auth/me", methods=["GET"])
@auth_required
def get_current_user_profile():
    """Retrieve profile and role information for the active session."""
    return jsonify({
        "success": True,
        "user": g.current_user.to_dict()
    }), 200


@auth_bp.route("/auth/demo-users", methods=["GET"])
def get_demo_users():
    """
    Provides reproducible demonstration credentials for portfolio evaluators.
    Allows 1-click role testing during interviews.
    """
    demo_accounts = [
        {
            "role": "admin",
            "title": "System Administrator",
            "username": "admin",
            "description": "Full access: system settings, database resets, user & catalog management.",
            "sample_password": "Password123"
        },
        {
            "role": "operations_manager",
            "title": "Operations Manager",
            "username": "ops_manager",
            "description": "Procurement pipeline: purchase order creation, receipt to stock, demand analytics.",
            "sample_password": "Password123"
        },
        {
            "role": "inventory_manager",
            "title": "Inventory Manager",
            "username": "inv_manager",
            "description": "Catalog management: products creation/updates, supplier directory, reorder tracking.",
            "sample_password": "Password123"
        },
        {
            "role": "viewer",
            "title": "Auditor / Read-Only Viewer",
            "username": "viewer",
            "description": "Read-only access: view dashboards, reports, and catalog without modification rights.",
            "sample_password": "Password123"
        }
    ]
    return jsonify({
        "success": True,
        "demo_accounts": demo_accounts
    }), 200
