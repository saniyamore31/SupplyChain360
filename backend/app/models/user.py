from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from app import db

class User(db.Model):
    """
    User Model for local authentication and Role-Based Access Control (RBAC).
    Supported roles:
    - 'admin': Full administrative control (settings, reset, all operations)
    - 'operations_manager': Procurement, purchase orders, safe receipt, demand analytics
    - 'inventory_manager': Product catalog, stock adjustments, vendor management
    - 'viewer': Read-only access across all operational modules
    """
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(60), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), nullable=False, default="viewer", index=True)
    full_name = db.Column(db.String(100), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def set_password(self, password):
        """Hash and store user password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify password against stored hash."""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Safe representation without password hash."""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "full_name": self.full_name or self.username,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
