from datetime import datetime, timezone
from app import db

class DemandRecord(db.Model):
    """
    Demand Record Model storing daily / monthly historical consumption quantities.
    Used for demand trend analysis, lead-time forecasting, and reorder planning.
    """
    __tablename__ = "demand_records"

    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    quantity_demanded = db.Column(db.Integer, nullable=False)
    channel = db.Column(db.String(50), default="Direct Sales", nullable=False)
    is_synthetic = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    product = db.relationship("Product", back_populates="demand_records")

    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "product_sku": self.product.sku if self.product else None,
            "product_category": self.product.category if self.product else None,
            "date": self.date.isoformat() if self.date else None,
            "quantity_demanded": self.quantity_demanded,
            "channel": self.channel,
            "is_synthetic": self.is_synthetic
        }
