from datetime import datetime, timezone
from app import db

class PurchaseOrder(db.Model):
    """
    Purchase Order Model representing procurement orders with suppliers.
    """
    __tablename__ = "purchase_orders"

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False)
    order_date = db.Column(db.Date, nullable=False)
    expected_delivery_date = db.Column(db.Date, nullable=False)
    
    # Status: 'draft', 'pending', 'shipped', 'delivered', 'cancelled'
    status = db.Column(db.String(20), default="draft", nullable=False, index=True)
    total_amount = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    notes = db.Column(db.Text, nullable=True)

    # Receipt safety tracking: guarantees stock is added strictly ONCE
    is_received = db.Column(db.Boolean, default=False, nullable=False)
    received_at = db.Column(db.DateTime, nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    supplier = db.relationship("Supplier", back_populates="purchase_orders")
    items = db.relationship("PurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan", lazy="joined")

    def to_dict(self, include_items=True):
        data = {
            "id": self.id,
            "order_number": self.order_number,
            "supplier_id": self.supplier_id,
            "supplier_name": self.supplier.company_name if self.supplier else None,
            "order_date": self.order_date.isoformat() if self.order_date else None,
            "expected_delivery_date": self.expected_delivery_date.isoformat() if self.expected_delivery_date else None,
            "status": self.status,
            "total_amount": float(self.total_amount) if self.total_amount is not None else 0.0,
            "notes": self.notes,
            "is_received": self.is_received,
            "received_at": self.received_at.isoformat() if self.received_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "item_count": len(self.items) if self.items is not None else 0
        }
        if include_items and self.items is not None:
            data["items"] = [item.to_dict() for item in self.items]
        return data


class PurchaseOrderItem(db.Model):
    """
    Line item for a purchase order, referencing a product and quantity.
    """
    __tablename__ = "purchase_order_items"

    id = db.Column(db.Integer, primary_key=True)
    purchase_order_id = db.Column(db.Integer, db.ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    subtotal = db.Column(db.Numeric(12, 2), nullable=False)

    # Relationships
    purchase_order = db.relationship("PurchaseOrder", back_populates="items")
    product = db.relationship("Product", back_populates="purchase_order_items")

    def to_dict(self):
        return {
            "id": self.id,
            "purchase_order_id": self.purchase_order_id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "product_sku": self.product.sku if self.product else None,
            "quantity": self.quantity,
            "unit_price": float(self.unit_price) if self.unit_price is not None else 0.0,
            "subtotal": float(self.subtotal) if self.subtotal is not None else 0.0
        }
