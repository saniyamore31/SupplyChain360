import re
from flask import Blueprint, request, jsonify
from sqlalchemy import or_
from app import db
from app.models.supplier import Supplier
from app.models.product import Product
from app.models.purchase_order import PurchaseOrder

suppliers_bp = Blueprint("suppliers", __name__)

EMAIL_REGEX = r"^[\w\.-]+@[\w\.-]+\.\w+$"

@suppliers_bp.route("/suppliers", methods=["GET"])
def get_suppliers():
    """
    List suppliers with optional search and pagination.
    """
    search = request.args.get("search", "", type=str).strip()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    query = Supplier.query
    if search:
        search_term = f"%{search}%"
        query = query.filter(or_(
            Supplier.company_name.ilike(search_term),
            Supplier.contact_person.ilike(search_term),
            Supplier.email.ilike(search_term)
        ))

    query = query.order_by(Supplier.company_name.asc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "success": True,
        "suppliers": [s.to_dict() for s in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page
    }), 200


@suppliers_bp.route("/suppliers/<int:id>", methods=["GET"])
def get_supplier(id):
    """Retrieve detailed information for a single supplier, including associated products."""
    supplier = Supplier.query.get(id)
    if not supplier:
        return jsonify({"success": False, "error": "Not Found", "message": f"Supplier with ID {id} does not exist."}), 404

    return jsonify({
        "success": True,
        "supplier": supplier.to_dict(include_relations=True)
    }), 200


@suppliers_bp.route("/suppliers", methods=["POST"])
def create_supplier():
    """Create a new supplier with comprehensive validation."""
    data = request.get_json() or {}
    errors = {}

    company_name = (data.get("company_name") or "").strip()
    contact_person = (data.get("contact_person") or "").strip()
    email = (data.get("email") or "").strip()
    phone = (data.get("phone") or "").strip()
    address = (data.get("address") or "").strip()
    lead_time_days = data.get("lead_time_days", 7)

    if not company_name:
        errors["company_name"] = "Company name is required."
    elif Supplier.query.filter_by(company_name=company_name).first():
        errors["company_name"] = f"A supplier named '{company_name}' already exists."

    if not contact_person:
        errors["contact_person"] = "Contact person is required."

    if not email:
        errors["email"] = "Email address is required."
    elif not re.match(EMAIL_REGEX, email):
        errors["email"] = "Invalid email address format."

    if not phone:
        errors["phone"] = "Phone number is required."

    try:
        lead_time_days = int(lead_time_days)
        if lead_time_days < 1:
            errors["lead_time_days"] = "Lead time must be at least 1 day."
    except (ValueError, TypeError):
        errors["lead_time_days"] = "Lead time must be a valid integer number of days."

    if errors:
        return jsonify({"success": False, "error": "Validation Error", "errors": errors, "message": "Please correct the supplier form errors."}), 400

    supplier = Supplier(
        company_name=company_name,
        contact_person=contact_person,
        email=email,
        phone=phone,
        address=address,
        lead_time_days=lead_time_days
    )
    db.session.add(supplier)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Supplier '{supplier.company_name}' registered successfully.",
        "supplier": supplier.to_dict()
    }), 201


@suppliers_bp.route("/suppliers/<int:id>", methods=["PUT"])
def update_supplier(id):
    """Update supplier details."""
    supplier = Supplier.query.get(id)
    if not supplier:
        return jsonify({"success": False, "error": "Not Found", "message": f"Supplier with ID {id} does not exist."}), 404

    data = request.get_json() or {}
    errors = {}

    if "company_name" in data:
        name = str(data["company_name"]).strip()
        if not name:
            errors["company_name"] = "Company name cannot be empty."
        else:
            existing = Supplier.query.filter(Supplier.company_name == name, Supplier.id != id).first()
            if existing:
                errors["company_name"] = f"A supplier named '{name}' already exists."
            else:
                supplier.company_name = name

    if "contact_person" in data:
        cp = str(data["contact_person"]).strip()
        if not cp:
            errors["contact_person"] = "Contact person cannot be empty."
        else:
            supplier.contact_person = cp

    if "email" in data:
        email = str(data["email"]).strip()
        if not email:
            errors["email"] = "Email cannot be empty."
        elif not re.match(EMAIL_REGEX, email):
            errors["email"] = "Invalid email address format."
        else:
            supplier.email = email

    if "phone" in data:
        phone = str(data["phone"]).strip()
        if not phone:
            errors["phone"] = "Phone cannot be empty."
        else:
            supplier.phone = phone

    if "address" in data:
        supplier.address = str(data["address"]).strip()

    if "lead_time_days" in data:
        try:
            l_days = int(data["lead_time_days"])
            if l_days < 1:
                errors["lead_time_days"] = "Lead time must be at least 1 day."
            else:
                supplier.lead_time_days = l_days
        except (ValueError, TypeError):
            errors["lead_time_days"] = "Lead time must be a valid integer."

    if errors:
        return jsonify({"success": False, "error": "Validation Error", "errors": errors, "message": "Please correct the supplier form errors."}), 400

    db.session.commit()
    return jsonify({
        "success": True,
        "message": f"Supplier '{supplier.company_name}' updated successfully.",
        "supplier": supplier.to_dict()
    }), 200


@suppliers_bp.route("/suppliers/<int:id>", methods=["DELETE"])
def delete_supplier(id):
    """
    Safely delete supplier or reject if products or purchase orders are attached.
    """
    supplier = Supplier.query.get(id)
    if not supplier:
        return jsonify({"success": False, "error": "Not Found", "message": f"Supplier with ID {id} does not exist."}), 404

    prod_count = Product.query.filter_by(supplier_id=id).count()
    if prod_count > 0:
        return jsonify({
            "success": False,
            "error": "Deletion Restricted",
            "message": f"Cannot delete supplier '{supplier.company_name}' because {prod_count} product(s) are assigned to this supplier. Reassign or delete those products first."
        }), 409

    po_count = PurchaseOrder.query.filter_by(supplier_id=id).count()
    if po_count > 0:
        return jsonify({
            "success": False,
            "error": "Deletion Restricted",
            "message": f"Cannot delete supplier '{supplier.company_name}' because {po_count} historical purchase order(s) exist for this supplier."
        }), 409

    name = supplier.company_name
    db.session.delete(supplier)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Supplier '{name}' was deleted successfully."
    }), 200
