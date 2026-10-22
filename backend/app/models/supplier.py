from datetime import datetime
from app import db

class Supplier(db.Model):
    """
    Supplier Model representing vendors supplying inventory goods.
    """
    __tablename__ = "suppliers"

    id = db.Column(db.Integer, primary_key=True)
    company_name = db.Column(db.String(120), nullable=False, index=True)
    contact_person = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(50), nullable=False)
    address = db.Column(db.Text, nullable=True)
    lead_time_days = db.Column(db.Integer, default=7, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    products = db.relationship("Product", back_populates="supplier", lazy="select")
    purchase_orders = db.relationship("PurchaseOrder", back_populates="supplier", lazy="select")

    def to_dict(self, include_relations=False):
        data = {
            "id": self.id,
            "company_name": self.company_name,
            "contact_person": self.contact_person,
            "email": self.email,
            "phone": self.phone,
            "address": self.address,
            "lead_time_days": self.lead_time_days,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "products_count": len(self.products) if self.products is not None else 0,
            "orders_count": len(self.purchase_orders) if self.purchase_orders is not None else 0
        }
        if include_relations:
            data["products"] = [p.to_dict() for p in self.products]
        return data
