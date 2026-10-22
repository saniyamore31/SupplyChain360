import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from config import config_by_name

# Initialize database instance
db = SQLAlchemy()

def create_app(config_name=None):
    """Application factory for SupplyChain360 Flask backend."""
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")

    app = Flask(__name__)
    app_config = config_by_name.get(config_name, config_by_name["default"])
    app.config.from_object(app_config)

    # Ensure instance directory exists for SQLite database storage
    instance_path = os.path.join(app.root_path, "..", "instance")
    os.makedirs(instance_path, exist_ok=True)

    # Enable CORS for frontend requests
    CORS(app, origins=app.config["CORS_ORIGINS"], supports_credentials=True)

    # Initialize extensions
    db.init_app(app)

    # Global error handlers for consistent JSON responses
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            "success": False,
            "error": "Bad Request",
            "message": getattr(error, "description", "The request payload was invalid.")
        }), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "success": False,
            "error": "Not Found",
            "message": getattr(error, "description", "The requested resource was not found.")
        }), 404

    @app.errorhandler(409)
    def conflict(error):
        return jsonify({
            "success": False,
            "error": "Conflict",
            "message": getattr(error, "description", "Resource already exists or violates a unique constraint.")
        }), 409

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            "success": False,
            "error": "Internal Server Error",
            "message": "An unexpected error occurred on the server. Please try again."
        }), 500

    # Register blueprints under /api/v1
    from app.routes.health import health_bp
    from app.routes.products import products_bp
    from app.routes.suppliers import suppliers_bp
    from app.routes.purchase_orders import purchase_orders_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.demand import demand_bp
    from app.routes.recommendations import recommendations_bp
    from app.routes.settings import settings_bp

    app.register_blueprint(health_bp, url_prefix="/api/v1")
    app.register_blueprint(products_bp, url_prefix="/api/v1")
    app.register_blueprint(suppliers_bp, url_prefix="/api/v1")
    app.register_blueprint(purchase_orders_bp, url_prefix="/api/v1")
    app.register_blueprint(dashboard_bp, url_prefix="/api/v1")
    app.register_blueprint(demand_bp, url_prefix="/api/v1")
    app.register_blueprint(recommendations_bp, url_prefix="/api/v1")
    app.register_blueprint(settings_bp, url_prefix="/api/v1")

    return app
