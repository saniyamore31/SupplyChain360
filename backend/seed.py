"""
SupplyChain360 - Seed & Reset Script
Provides reproducible, realistic synthetic demonstration data for inventory,
suppliers, purchase orders, demand analytics, and application settings.
"""

import os
import sys
from datetime import datetime, date, timedelta
import random

# Add parent directory to sys.path to run standalone
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app, db
from app.models import Supplier, Product, PurchaseOrder, PurchaseOrderItem, DemandRecord, AppSetting, User

def clear_data():
    """Destructively wipe existing tables for a clean reset."""
    print("Clearing existing data...")
    DemandRecord.query.delete()
    PurchaseOrderItem.query.delete()
    PurchaseOrder.query.delete()
    Product.query.delete()
    Supplier.query.delete()
    AppSetting.query.delete()
    User.query.delete()
    db.session.commit()
    print("Database cleared successfully.")

def seed_users():
    """Seed standard reproducible demonstration users for all RBAC roles."""
    demo_users_data = [
        {
            "username": "admin",
            "email": "admin@supplychain360.local",
            "role": "admin",
            "full_name": "System Administrator",
            "password": "Password123"
        },
        {
            "username": "ops_manager",
            "email": "ops@supplychain360.local",
            "role": "operations_manager",
            "full_name": "Operations Lead",
            "password": "Password123"
        },
        {
            "username": "inv_manager",
            "email": "inventory@supplychain360.local",
            "role": "inventory_manager",
            "full_name": "Inventory Supervisor",
            "password": "Password123"
        },
        {
            "username": "viewer",
            "email": "auditor@supplychain360.local",
            "role": "viewer",
            "full_name": "Auditor & Guest Viewer",
            "password": "Password123"
        }
    ]

    for u_info in demo_users_data:
        existing = User.query.filter_by(username=u_info["username"]).first()
        if not existing:
            user = User(
                username=u_info["username"],
                email=u_info["email"],
                role=u_info["role"],
                full_name=u_info["full_name"]
            )
            user.set_password(u_info["password"])
            db.session.add(user)
    db.session.commit()

def seed_data(reset=False):
    """Seed the database with realistic demonstration data."""
    if reset:
        clear_data()
    elif Product.query.first():
        print("Database already contains data. Ensuring demo users exist...")
        seed_users()
        return

    print("Seeding SupplyChain360 database with demonstration records...")

    # 1. Demo User Accounts (RBAC)
    seed_users()

    # 2. Default Settings
    AppSetting.set_value("business_name", "SupplyChain360 Logistics & Tech", "Business legal entity name")
    AppSetting.set_value("currency_code", "INR", "Default currency ISO code")
    AppSetting.set_value("currency_symbol", "₹", "Default currency symbol")
    AppSetting.set_value("low_stock_threshold_multiplier", "1.0", "Multiplier for dynamic reorder calculations")

    # 2. Fictional Suppliers (6 diverse suppliers)
    suppliers_data = [
        {
            "company_name": "Apex Semiconductor Components",
            "contact_person": "Vikram Malhotra",
            "email": "v.malhotra@apex-semi-demo.com",
            "phone": "+91 98765 43210",
            "address": "Plot 42, Electronic City Phase 1, Bengaluru, Karnataka 560100",
            "lead_time_days": 10
        },
        {
            "company_name": "Zenith Industrial Hardware",
            "contact_person": "Pooja Sharma",
            "email": "pooja.s@zenith-hardware-demo.com",
            "phone": "+91 98234 56789",
            "address": "B-14 Industrial Area, MIDC Bhosari, Pune, Maharashtra 411026",
            "lead_time_days": 5
        },
        {
            "company_name": "Horizon Eco Packaging Ltd",
            "contact_person": "Anand Ranganathan",
            "email": "anand.r@horizon-pack-demo.com",
            "phone": "+91 97112 34567",
            "address": "Survey 88, Sector 34, Gurugram, Haryana 122004",
            "lead_time_days": 4
        },
        {
            "company_name": "Titan Heavy Assemblies",
            "contact_person": "Sunita Verma",
            "email": "sunita.v@titan-assemblies-demo.com",
            "phone": "+91 99456 78901",
            "address": "77 Peenya 3rd Phase, Peenya, Bengaluru, Karnataka 560058",
            "lead_time_days": 14
        },
        {
            "company_name": "Precision Optics & Sensors",
            "contact_person": "Karthik Krishnan",
            "email": "karthik.k@precision-sensors-demo.com",
            "phone": "+91 98840 12345",
            "address": "Module 12, Guindy Industrial Estate, Chennai, Tamil Nadu 600032",
            "lead_time_days": 8
        },
        {
            "company_name": "Nexus Polymer Materials",
            "contact_person": "Meera Patel",
            "email": "meera.patel@nexus-polymers-demo.com",
            "phone": "+91 98250 67890",
            "address": "GIDC Estate, Makarpura, Vadodara, Gujarat 390010",
            "lead_time_days": 6
        }
    ]

    suppliers = []
    for s_info in suppliers_data:
        supplier = Supplier(**s_info)
        db.session.add(supplier)
        suppliers.append(supplier)
    db.session.flush()

    # 3. Products (20 products spanning 4 categories: Electronics, Hardware, Packaging, Raw Materials)
    products_data = [
        # Electronics (Supplier: Apex / Precision)
        {"name": "ARM Cortex Microcontroller MCU-32", "sku": "ELEC-MCU-001", "category": "Electronics", "stock_quantity": 450, "reorder_level": 150, "unit_cost": 420.00, "supplier_id": suppliers[0].id, "description": "32-bit RISC ARM microcontroller for telemetry and control modules."},
        {"name": "Lithium Battery Pack 24V 10Ah", "sku": "ELEC-BAT-002", "category": "Electronics", "stock_quantity": 18, "reorder_level": 40, "unit_cost": 3850.00, "supplier_id": suppliers[0].id, "description": "High-density rechargeable lithium battery pack. (Low Stock)"},
        {"name": "Optoelectronic Infrared Sensor", "sku": "ELEC-SNS-003", "category": "Electronics", "stock_quantity": 8, "reorder_level": 25, "unit_cost": 290.00, "supplier_id": suppliers[4].id, "description": "High-precision ambient infrared sensor. (Critically Low)"},
        {"name": "DC-DC Buck Voltage Converter 12V", "sku": "ELEC-CNV-004", "category": "Electronics", "stock_quantity": 310, "reorder_level": 80, "unit_cost": 165.00, "supplier_id": suppliers[0].id, "description": "Step-down synchronous buck voltage regulator."},
        {"name": "MEMS Inertial Gyroscope Module", "sku": "ELEC-GYR-005", "category": "Electronics", "stock_quantity": 25, "reorder_level": 50, "unit_cost": 640.00, "supplier_id": suppliers[4].id, "description": "6-axis angular motion sensor module. (Low Stock)"},

        # Hardware & Assemblies (Supplier: Zenith / Titan)
        {"name": "Stainless Steel Fastener Hex M6x20", "sku": "HDW-FST-001", "category": "Hardware", "stock_quantity": 2400, "reorder_level": 500, "unit_cost": 4.50, "supplier_id": suppliers[1].id, "description": "Grade 316 stainless steel hex head machine screws."},
        {"name": "Industrial Linear Actuator 200mm", "sku": "HDW-ACT-002", "category": "Hardware", "stock_quantity": 12, "reorder_level": 30, "unit_cost": 4200.00, "supplier_id": suppliers[3].id, "description": "Heavy-duty electric linear actuator 12V 1000N force. (Low Stock)"},
        {"name": "Deep Groove Ball Bearing 608-2RS", "sku": "HDW-BRG-003", "category": "Hardware", "stock_quantity": 850, "reorder_level": 200, "unit_cost": 45.00, "supplier_id": suppliers[1].id, "description": "Precision sealed chrome steel ball bearing."},
        {"name": "Planetary Gearbox Assembly 10:1", "sku": "HDW-GBX-004", "category": "Hardware", "stock_quantity": 34, "reorder_level": 25, "unit_cost": 2750.00, "supplier_id": suppliers[3].id, "description": "High-torque reduction planetary gearbox."},
        {"name": "NEMA 23 Stepper Motor 2.8A", "sku": "HDW-MOT-005", "category": "Hardware", "stock_quantity": 75, "reorder_level": 35, "unit_cost": 1150.00, "supplier_id": suppliers[3].id, "description": "High torque hybrid stepping motor for CNC and robotics."},

        # Packaging (Supplier: Horizon)
        {"name": "Double Wall Corrugated Box 40x30x25", "sku": "PKG-BOX-001", "category": "Packaging", "stock_quantity": 1200, "reorder_level": 300, "unit_cost": 38.00, "supplier_id": suppliers[2].id, "description": "Heavy-duty 5-ply shipping container box."},
        {"name": "Anti-Static Bubble Wrap Roll 100m", "sku": "PKG-BBL-002", "category": "Packaging", "stock_quantity": 15, "reorder_level": 25, "unit_cost": 850.00, "supplier_id": suppliers[2].id, "description": "ESD safe pink bubble protective wrap roll. (Low Stock)"},
        {"name": "Biodegradable Air Pillows (Box of 500)", "sku": "PKG-AIR-003", "category": "Packaging", "stock_quantity": 80, "reorder_level": 30, "unit_cost": 460.00, "supplier_id": suppliers[2].id, "description": "Inflatable void-fill cushion cushions."},
        {"name": "Heavy Duty Packaging Tape 72mm", "sku": "PKG-TAP-004", "category": "Packaging", "stock_quantity": 320, "reorder_level": 60, "unit_cost": 75.00, "supplier_id": suppliers[2].id, "description": "High-tack acrylic adhesive packing tape."},
        {"name": "Industrial Poly Strapping Roll 1000m", "sku": "PKG-STR-005", "category": "Packaging", "stock_quantity": 5, "reorder_level": 15, "unit_cost": 1250.00, "supplier_id": suppliers[2].id, "description": "Embossed polypropylene strap for palletizing. (Critically Low)"},

        # Raw Materials & Polymers (Supplier: Nexus / Zenith)
        {"name": "High-Density Polyethylene Granules HDPE", "sku": "RAW-HDP-001", "category": "Raw Materials", "stock_quantity": 3500, "reorder_level": 1000, "unit_cost": 92.00, "supplier_id": suppliers[5].id, "description": "Blow molding grade virgin HDPE pellets (kg)."},
        {"name": "Extruded Aluminium Profile 4040 T-Slot", "sku": "RAW-ALU-002", "category": "Raw Materials", "stock_quantity": 140, "reorder_level": 50, "unit_cost": 780.00, "supplier_id": suppliers[1].id, "description": "Anodized structural aluminum framing 2-meter bars."},
        {"name": "Polycarbonate Clear Sheet 4x8 ft 3mm", "sku": "RAW-PCB-003", "category": "Raw Materials", "stock_quantity": 22, "reorder_level": 40, "unit_cost": 2150.00, "supplier_id": suppliers[5].id, "description": "Impact-resistant optical grade polycarbonate. (Low Stock)"},
        {"name": "Nitrile Rubber Sheet 5mm (sq meter)", "sku": "RAW-NBR-004", "category": "Raw Materials", "stock_quantity": 110, "reorder_level": 35, "unit_cost": 620.00, "supplier_id": suppliers[5].id, "description": "Oil-resistant industrial gasket sealing sheet."},
        {"name": "Copper Clad Laminate FR4 Sheet", "sku": "RAW-CCL-005", "category": "Raw Materials", "stock_quantity": 400, "reorder_level": 100, "unit_cost": 310.00, "supplier_id": suppliers[5].id, "description": "Single-sided copper laminate for PCB prototyping."}
    ]

    products = []
    for p_info in products_data:
        product = Product(**p_info)
        db.session.add(product)
        products.append(product)
    db.session.flush()

    # 4. Purchase Orders (12 realistic POs across statuses: delivered, shipped, pending, draft, cancelled)
    today = date.today()
    po_configs = [
        # Delivered orders (is_received = True)
        {
            "num": "PO-2026-0001", "sup": suppliers[0], "status": "delivered",
            "order_days_ago": 30, "deliv_days_ago": 20, "is_received": True,
            "items": [(products[0], 200, 410.00), (products[3], 150, 160.00)]
        },
        {
            "num": "PO-2026-0002", "sup": suppliers[1], "status": "delivered",
            "order_days_ago": 25, "deliv_days_ago": 18, "is_received": True,
            "items": [(products[5], 2000, 4.20), (products[7], 500, 44.00)]
        },
        {
            "num": "PO-2026-0003", "sup": suppliers[2], "status": "delivered",
            "order_days_ago": 20, "deliv_days_ago": 15, "is_received": True,
            "items": [(products[10], 800, 37.00), (products[13], 200, 72.00)]
        },
        {
            "num": "PO-2026-0004", "sup": suppliers[5], "status": "delivered",
            "order_days_ago": 18, "deliv_days_ago": 10, "is_received": True,
            "items": [(products[15], 2000, 90.00), (products[19], 250, 305.00)]
        },
        # Shipped orders in transit (is_received = False)
        {
            "num": "PO-2026-0005", "sup": suppliers[0], "status": "shipped",
            "order_days_ago": 6, "deliv_days_ahead": 4, "is_received": False,
            "items": [(products[1], 50, 3800.00)]
        },
        {
            "num": "PO-2026-0006", "sup": suppliers[4], "status": "shipped",
            "order_days_ago": 5, "deliv_days_ahead": 3, "is_received": False,
            "items": [(products[2], 60, 285.00), (products[4], 40, 630.00)]
        },
        # Pending orders awaiting fulfillment
        {
            "num": "PO-2026-0007", "sup": suppliers[3], "status": "pending",
            "order_days_ago": 3, "deliv_days_ahead": 11, "is_received": False,
            "items": [(products[6], 25, 4150.00), (products[9], 40, 1140.00)]
        },
        {
            "num": "PO-2026-0008", "sup": suppliers[2], "status": "pending",
            "order_days_ago": 2, "deliv_days_ahead": 3, "is_received": False,
            "items": [(products[11], 30, 840.00), (products[14], 20, 1220.00)]
        },
        {
            "num": "PO-2026-0009", "sup": suppliers[5], "status": "pending",
            "order_days_ago": 2, "deliv_days_ahead": 5, "is_received": False,
            "items": [(products[17], 35, 2100.00)]
        },
        # Draft orders
        {
            "num": "PO-2026-0010", "sup": suppliers[1], "status": "draft",
            "order_days_ago": 1, "deliv_days_ahead": 7, "is_received": False,
            "items": [(products[16], 50, 770.00)]
        },
        {
            "num": "PO-2026-0011", "sup": suppliers[3], "status": "draft",
            "order_days_ago": 0, "deliv_days_ahead": 14, "is_received": False,
            "items": [(products[8], 20, 2700.00)]
        },
        # Cancelled order
        {
            "num": "PO-2026-0012", "sup": suppliers[0], "status": "cancelled",
            "order_days_ago": 12, "deliv_days_ago": 2, "is_received": False,
            "items": [(products[3], 50, 170.00)]
        }
    ]

    for p_order in po_configs:
        if "order_days_ago" in p_order:
            order_date = today - timedelta(days=p_order["order_days_ago"])
        else:
            order_date = today

        if "deliv_days_ago" in p_order:
            expected_date = today - timedelta(days=p_order["deliv_days_ago"])
        elif "deliv_days_ahead" in p_order:
            expected_date = today + timedelta(days=p_order["deliv_days_ahead"])
        else:
            expected_date = today + timedelta(days=7)

        po = PurchaseOrder(
            order_number=p_order["num"],
            supplier_id=p_order["sup"].id,
            order_date=order_date,
            expected_delivery_date=expected_date,
            status=p_order["status"],
            is_received=p_order["is_received"],
            received_at=datetime.utcnow() - timedelta(days=p_order.get("deliv_days_ago", 0)) if p_order["is_received"] else None,
            notes=f"Synthetic demo order for {p_order['sup'].company_name}. Status: {p_order['status'].capitalize()}."
        )
        db.session.add(po)
        db.session.flush()

        total = 0.0
        for prod, qty, price in p_order["items"]:
            subtotal = round(qty * price, 2)
            item = PurchaseOrderItem(
                purchase_order_id=po.id,
                product_id=prod.id,
                quantity=qty,
                unit_price=price,
                subtotal=subtotal
            )
            db.session.add(item)
            total += subtotal

        po.total_amount = total

    # 5. Synthetic Historical Demand Records (Over past 90 days for demand analytics)
    # Generate daily and weekly demand distributions across products
    random.seed(42) # Reproducible randomness
    channels = ["Direct B2B Sales", "Online Portal", "Contract Fulfillment", "Retail Partner"]

    demand_records = []
    for day_offset in range(90, 0, -1):
        record_date = today - timedelta(days=day_offset)
        # Select 5 to 10 products that experienced demand on this date
        demanded_products = random.sample(products, random.randint(5, 10))
        for prod in demanded_products:
            # Scale quantity based on product cost (cheap items have higher volume)
            if prod.unit_cost < 100:
                qty = random.randint(15, 60)
            elif prod.unit_cost < 1000:
                qty = random.randint(3, 18)
            else:
                qty = random.randint(1, 5)

            channel = random.choice(channels)
            record = DemandRecord(
                product_id=prod.id,
                date=record_date,
                quantity_demanded=qty,
                channel=channel,
                is_synthetic=True
            )
            demand_records.append(record)

    db.session.bulk_save_objects(demand_records)
    db.session.commit()

    print(f"Successfully seeded:")
    print(f" - {len(suppliers)} Suppliers")
    print(f" - {len(products)} Products")
    print(f" - {len(po_configs)} Purchase Orders")
    print(f" - {len(demand_records)} Demand Records (covering 90 days)")

if __name__ == "__main__":
    app = create_app(os.environ.get("FLASK_ENV", "development"))
    with app.app_context():
        # Ensure database tables are created
        db.create_all()
        reset_flag = "--reset" in sys.argv
        seed_data(reset=reset_flag)
