from datetime import datetime, timezone
from app import db

class Product(db.Model):
    """
    Product Model representing items in the warehouse inventory.
    """
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False, index=True)
    sku = db.Column(db.String(50), unique=True, nullable=False, index=True)
    category = db.Column(db.String(50), nullable=False, index=True)
    description = db.Column(db.Text, nullable=True)
    stock_quantity = db.Column(db.Integer, default=0, nullable=False)
    reorder_level = db.Column(db.Integer, default=10, nullable=False)
    unit_cost = db.Column(db.Numeric(10, 2), default=0.00, nullable=False)
    
    # Foreign key to Supplier
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)

    # Timestamps
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    supplier = db.relationship("Supplier", back_populates="products")
    purchase_order_items = db.relationship("PurchaseOrderItem", back_populates="product", lazy="select")
    demand_records = db.relationship("DemandRecord", back_populates="product", cascade="all, delete-orphan", lazy="select")

    def to_dict(self):
        unit_cost_val = float(self.unit_cost) if self.unit_cost is not None else 0.0
        inventory_val = round(self.stock_quantity * unit_cost_val, 2)
        return {
            "id": self.id,
            "name": self.name,
            "sku": self.sku,
            "category": self.category,
            "description": self.description,
            "stock_quantity": self.stock_quantity,
            "reorder_level": self.reorder_level,
            "unit_cost": unit_cost_val,
            "inventory_value": inventory_val,
            "is_low_stock": self.stock_quantity <= self.reorder_level,
            "supplier_id": self.supplier_id,
            "supplier_name": self.supplier.company_name if self.supplier else None,
            "supplier_lead_time": self.supplier.lead_time_days if self.supplier else 7,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
