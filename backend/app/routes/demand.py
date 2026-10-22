import csv
import io
from datetime import datetime, date, timedelta
from flask import Blueprint, request, jsonify, Response
from sqlalchemy import func, desc
from app import db
from app.models.demand import DemandRecord
from app.models.product import Product

demand_bp = Blueprint("demand", __name__)

@demand_bp.route("/demand", methods=["GET"])
def get_demand():
    """
    List historical demand records with date range, product, and channel filters.
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    product_id = request.args.get("product_id", type=int)
    start_date_str = request.args.get("start_date", type=str)
    end_date_str = request.args.get("end_date", type=str)
    channel = request.args.get("channel", type=str)

    query = DemandRecord.query

    if product_id:
        query = query.filter(DemandRecord.product_id == product_id)

    if start_date_str:
        try:
            s_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            query = query.filter(DemandRecord.date >= s_date)
        except ValueError:
            pass

    if end_date_str:
        try:
            e_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
            query = query.filter(DemandRecord.date <= e_date)
        except ValueError:
            pass

    if channel:
        query = query.filter(DemandRecord.channel == channel)

    query = query.order_by(desc(DemandRecord.date))
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "success": True,
        "demand_records": [r.to_dict() for r in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page,
        "disclaimer": "All demand records represent synthetic demonstration data generated for modeling supply chain dynamics."
    }), 200


@demand_bp.route("/demand/summary", methods=["GET"])
def get_demand_summary():
    """
    Aggregate demand totals, average daily consumption, and top 5 highest demanded products.
    """
    product_id = request.args.get("product_id", type=int)
    days = request.args.get("days", 90, type=int)
    since_date = date.today() - timedelta(days=days)

    query = DemandRecord.query.filter(DemandRecord.date >= since_date)
    if product_id:
        query = query.filter(DemandRecord.product_id == product_id)

    total_demand = db.session.query(func.coalesce(func.sum(DemandRecord.quantity_demanded), 0))\
        .filter(DemandRecord.date >= since_date)
    if product_id:
        total_demand = total_demand.filter(DemandRecord.product_id == product_id)
    total_qty = int(total_demand.scalar())

    distinct_days = db.session.query(func.count(func.distinct(DemandRecord.date)))\
        .filter(DemandRecord.date >= since_date)
    if product_id:
        distinct_days = distinct_days.filter(DemandRecord.product_id == product_id)
    num_days = max(1, int(distinct_days.scalar() or 1))

    avg_daily_demand = round(total_qty / num_days, 1)

    # Top demanded products
    top_products_query = db.session.query(
        Product.id,
        Product.name,
        Product.sku,
        Product.category,
        func.sum(DemandRecord.quantity_demanded).label("total_demand")
    ).join(Product, DemandRecord.product_id == Product.id)\
     .filter(DemandRecord.date >= since_date)\
     .group_by(Product.id)\
     .order_by(desc("total_demand"))\
     .limit(5).all()

    top_products = [
        {
            "product_id": r[0],
            "name": r[1],
            "sku": r[2],
            "category": r[3],
            "total_demand": int(r[4])
        }
        for r in top_products_query
    ]

    return jsonify({
        "success": True,
        "period_days": days,
        "total_demand": total_qty,
        "avg_daily_demand": avg_daily_demand,
        "top_products": top_products
    }), 200


@demand_bp.route("/demand/trends", methods=["GET"])
def get_demand_trends():
    """
    Time-series trend data for demand charts (grouped by month or week).
    """
    product_id = request.args.get("product_id", type=int)

    query = db.session.query(
        func.strftime("%Y-%m", DemandRecord.date).label("month"),
        func.sum(DemandRecord.quantity_demanded).label("total_units")
    )
    if product_id:
        query = query.filter(DemandRecord.product_id == product_id)

    results = query.group_by("month").order_by("month").all()

    trends = [
        {"period": r[0], "quantity": int(r[1])}
        for r in results
    ]

    return jsonify({
        "success": True,
        "trends": trends
    }), 200


@demand_bp.route("/demand/export", methods=["GET"])
def export_demand_csv():
    """
    Export filtered demand records as standard downloadable CSV file.
    """
    product_id = request.args.get("product_id", type=int)
    start_date_str = request.args.get("start_date", type=str)
    end_date_str = request.args.get("end_date", type=str)

    query = DemandRecord.query

    if product_id:
        query = query.filter(DemandRecord.product_id == product_id)
    if start_date_str:
        try:
            s_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
            query = query.filter(DemandRecord.date >= s_date)
        except ValueError:
            pass
    if end_date_str:
        try:
            e_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
            query = query.filter(DemandRecord.date <= e_date)
        except ValueError:
            pass

    records = query.order_by(desc(DemandRecord.date)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Demand ID", "Date", "SKU", "Product Name", "Category", "Quantity Demanded", "Channel", "Is Synthetic"])

    for r in records:
        writer.writerow([
            r.id,
            r.date.isoformat(),
            r.product.sku if r.product else "N/A",
            r.product.name if r.product else "N/A",
            r.product.category if r.product else "N/A",
            r.quantity_demanded,
            r.channel,
            "Yes (Demo Data)" if r.is_synthetic else "No"
        ])

    csv_data = output.getvalue()
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment;filename=supplychain360_demand_{date.today().isoformat()}.csv"}
    )
