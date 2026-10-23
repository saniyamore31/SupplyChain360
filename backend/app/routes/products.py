from flask import Blueprint, request, jsonify
from sqlalchemy import or_, desc, asc
from app import db
from app.models.product import Product
from app.models.supplier import Supplier
from app.services.inventory_service import InventoryService
from app.services.auth_service import roles_required

products_bp = Blueprint("products", __name__)

@products_bp.route("/products", methods=["GET"])
def get_products():
    """
    List products with pagination, search, category filter, stock-status filter, and sorting.
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    search = request.args.get("search", "", type=str).strip()
    category = request.args.get("category", "", type=str).strip()
    status = request.args.get("status", "", type=str).strip().lower()
    supplier_id = request.args.get("supplier_id", type=int)
    sort_by = request.args.get("sort_by", "name", type=str).strip()
    sort_order = request.args.get("sort_order", "asc", type=str).strip().lower()

    # Base query
    query = Product.query

    # Search filter (name or sku)
    if search:
        search_term = f"%{search}%"
        query = query.filter(or_(Product.name.ilike(search_term), Product.sku.ilike(search_term)))

    # Category filter
    if category:
        query = query.filter(Product.category == category)

    # Supplier filter
    if supplier_id:
        query = query.filter(Product.supplier_id == supplier_id)

    # Stock status filter
    if status == "low_stock":
        query = query.filter(Product.stock_quantity <= Product.reorder_level)
    elif status == "in_stock":
        query = query.filter(Product.stock_quantity > Product.reorder_level)

    # Sorting
    sort_col = Product.name
    if sort_by == "stock_quantity":
        sort_col = Product.stock_quantity
    elif sort_by == "unit_cost":
        sort_col = Product.unit_cost
    elif sort_by == "created_at":
        sort_col = Product.created_at
    elif sort_by == "inventory_value":
        sort_col = (Product.stock_quantity * Product.unit_cost)

    if sort_order == "desc":
        query = query.order_by(desc(sort_col))
    else:
        query = query.order_by(asc(sort_col))

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    products = [p.to_dict() for p in pagination.items]

    categories = [c[0] for c in db.session.query(Product.category).distinct().all()]

    return jsonify({
        "success": True,
        "products": products,
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
        "per_page": pagination.per_page,
        "categories": categories
    }), 200


@products_bp.route("/products/<int:id>", methods=["GET"])
def get_product(id):
    """Retrieve single product details."""
    product = db.session.get(Product, id)
    if not product:
        return jsonify({"success": False, "error": "Not Found", "message": f"Product with ID {id} does not exist."}), 404
    return jsonify({"success": True, "product": product.to_dict()}), 200


@products_bp.route("/products", methods=["POST"])
@roles_required("admin", "inventory_manager")
def create_product():
    """Create a new product with input validation and role authorization."""
    data = request.get_json() or {}

    errors = {}
    name = (data.get("name") or "").strip()
    sku = (data.get("sku") or "").strip().upper()
    category = (data.get("category") or "").strip()
    stock_quantity = data.get("stock_quantity", 0)
    reorder_level = data.get("reorder_level", 10)
    unit_cost = data.get("unit_cost", 0.0)
    supplier_id = data.get("supplier_id")
    description = (data.get("description") or "").strip()

    if not name:
        errors["name"] = "Product name is required."
    if not sku:
        errors["sku"] = "Unique SKU is required."
    elif Product.query.filter_by(sku=sku).first():
        errors["sku"] = f"A product with SKU '{sku}' already exists."

    if not category:
        errors["category"] = "Category is required."

    try:
        stock_quantity = int(stock_quantity)
        if stock_quantity < 0:
            errors["stock_quantity"] = "Stock quantity cannot be negative."
    except (ValueError, TypeError):
        errors["stock_quantity"] = "Stock quantity must be a non-negative integer."

    try:
        reorder_level = int(reorder_level)
        if reorder_level < 0:
            errors["reorder_level"] = "Reorder level cannot be negative."
    except (ValueError, TypeError):
        errors["reorder_level"] = "Reorder level must be a non-negative integer."

    try:
        unit_cost = float(unit_cost)
        if unit_cost < 0:
            errors["unit_cost"] = "Unit cost cannot be negative."
    except (ValueError, TypeError):
        errors["unit_cost"] = "Unit cost must be a non-negative number."

    if supplier_id:
        supplier = db.session.get(Supplier, supplier_id)
        if not supplier:
            errors["supplier_id"] = f"Supplier with ID {supplier_id} not found."

    if errors:
        return jsonify({"success": False, "error": "Validation Error", "errors": errors, "message": "Please correct the form errors."}), 400

    product = Product(
        name=name,
        sku=sku,
        category=category,
        stock_quantity=stock_quantity,
        reorder_level=reorder_level,
        unit_cost=unit_cost,
        supplier_id=supplier_id,
        description=description
    )
    db.session.add(product)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Product '{product.name}' created successfully.",
        "product": product.to_dict()
    }), 201


@products_bp.route("/products/<int:id>", methods=["PUT"])
@roles_required("admin", "inventory_manager")
def update_product(id):
    """Update existing product details with validation."""
    product = db.session.get(Product, id)
    if not product:
        return jsonify({"success": False, "error": "Not Found", "message": f"Product with ID {id} does not exist."}), 404

    data = request.get_json() or {}
    errors = {}

    if "name" in data:
        name = str(data["name"]).strip()
        if not name:
            errors["name"] = "Product name cannot be empty."
        else:
            product.name = name

    if "sku" in data:
        sku = str(data["sku"]).strip().upper()
        if not sku:
            errors["sku"] = "SKU cannot be empty."
        else:
            existing = Product.query.filter(Product.sku == sku, Product.id != id).first()
            if existing:
                errors["sku"] = f"Another product with SKU '{sku}' already exists."
            else:
                product.sku = sku

    if "category" in data:
        category = str(data["category"]).strip()
        if not category:
            errors["category"] = "Category cannot be empty."
        else:
            product.category = category

    if "stock_quantity" in data:
        try:
            qty = int(data["stock_quantity"])
            if qty < 0:
                errors["stock_quantity"] = "Stock quantity cannot be negative."
            else:
                product.stock_quantity = qty
        except (ValueError, TypeError):
            errors["stock_quantity"] = "Stock quantity must be a non-negative integer."

    if "reorder_level" in data:
        try:
            r_level = int(data["reorder_level"])
            if r_level < 0:
                errors["reorder_level"] = "Reorder level cannot be negative."
            else:
                product.reorder_level = r_level
        except (ValueError, TypeError):
            errors["reorder_level"] = "Reorder level must be a non-negative integer."

    if "unit_cost" in data:
        try:
            cost = float(data["unit_cost"])
            if cost < 0:
                errors["unit_cost"] = "Unit cost cannot be negative."
            else:
                product.unit_cost = cost
        except (ValueError, TypeError):
            errors["unit_cost"] = "Unit cost must be a non-negative number."

    if "supplier_id" in data:
        sup_id = data["supplier_id"]
        if sup_id:
            supplier = db.session.get(Supplier, sup_id)
            if not supplier:
                errors["supplier_id"] = f"Supplier with ID {sup_id} not found."
            else:
                product.supplier_id = sup_id
        else:
            product.supplier_id = None

    if "description" in data:
        product.description = str(data["description"]).strip()

    if errors:
        return jsonify({"success": False, "error": "Validation Error", "errors": errors, "message": "Please correct the form errors."}), 400

    db.session.commit()
    return jsonify({
        "success": True,
        "message": f"Product '{product.name}' updated successfully.",
        "product": product.to_dict()
    }), 200


@products_bp.route("/products/<int:id>", methods=["DELETE"])
@roles_required("admin", "inventory_manager")
def delete_product(id):
    """Safely delete product or reject if referenced by purchase orders."""
    product = db.session.get(Product, id)
    if not product:
        return jsonify({"success": False, "error": "Not Found", "message": f"Product with ID {id} does not exist."}), 404

    is_safe, error_msg, _ = InventoryService.check_product_deletion_safety(id)
    if not is_safe:
        return jsonify({
            "success": False,
            "error": "Deletion Restricted",
            "message": error_msg
        }), 409

    product_name = product.name
    db.session.delete(product)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": f"Product '{product_name}' was successfully deleted."
    }), 200
