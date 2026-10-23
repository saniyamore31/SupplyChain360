import time
import json
import base64
import hmac
import hashlib
from functools import wraps
from flask import request, jsonify, g, current_app
from app import db
from app.models.user import User

TOKEN_EXPIRY_SECONDS = 86400 * 7  # 7 days

def generate_token(user):
    """
    Generate a cryptographically signed, stateless Bearer token for a user.
    Uses HMAC-SHA256 with Flask app's SECRET_KEY.
    """
    secret = current_app.config.get("SECRET_KEY", "dev-secret-key-supplychain360").encode("utf-8")
    payload = {
        "user_id": user.id,
        "username": user.username,
        "role": user.role,
        "exp": int(time.time()) + TOKEN_EXPIRY_SECONDS
    }
    payload_json = json.dumps(payload, separators=(',', ':'), sort_keys=True).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_json).decode("utf-8").rstrip("=")
    signature = hmac.new(secret, payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"

def verify_token(token_str):
    """
    Verify and decode a signed token. Returns the payload dictionary or None.
    """
    try:
        parts = token_str.strip().split(".")
        if len(parts) != 2:
            return None
        payload_b64, signature = parts
        secret = current_app.config.get("SECRET_KEY", "dev-secret-key-supplychain360").encode("utf-8")
        expected_sig = hmac.new(secret, payload_b64.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None

        # Add padding back if necessary
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload_json = base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8")
        payload = json.loads(payload_json)

        # Check expiration
        if payload.get("exp", 0) < time.time():
            return None

        return payload
    except Exception:
        return None

def auth_required(f):
    """
    Decorator requiring a valid Bearer token in the Authorization header.
    Attaches authenticated User to flask.g.current_user.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({
                "success": False,
                "error": "Unauthorized",
                "message": "Authentication required. Please provide a valid Bearer token in the Authorization header."
            }), 401

        token = auth_header.split(" ", 1)[1].strip()
        payload = verify_token(token)
        if not payload:
            return jsonify({
                "success": False,
                "error": "Invalid or Expired Token",
                "message": "Your session has expired or the authentication token is invalid. Please log in again."
            }), 401

        user = db.session.get(User, payload["user_id"])
        if not user or not user.is_active:
            return jsonify({
                "success": False,
                "error": "Unauthorized",
                "message": "User account not found or has been deactivated."
            }), 401

        g.current_user = user
        return f(*args, **kwargs)
    return decorated

def roles_required(*allowed_roles):
    """
    Decorator requiring the authenticated user to possess one of the allowed roles.
    Returns 403 Forbidden with actionable details if not authorized.
    """
    def decorator(f):
        @wraps(f)
        @auth_required
        def decorated(*args, **kwargs):
            user = getattr(g, "current_user", None)
            if not user or user.role not in allowed_roles:
                return jsonify({
                    "success": False,
                    "error": "Forbidden",
                    "message": f"Access denied. User role '{user.role if user else 'Unknown'}' is not authorized for this action. Required role(s): {', '.join(allowed_roles)}."
                }), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
