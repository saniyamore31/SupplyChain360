import pytest
from app import create_app, db
from app.models import Supplier, Product, PurchaseOrder, PurchaseOrderItem, DemandRecord, AppSetting, User
from app.services.auth_service import generate_token

@pytest.fixture
def app():
    """Create and configure a Flask application for automated tests."""
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    """Test client for HTTP requests."""
    return app.test_client()

@pytest.fixture
def auth_users(app):
    """Seed users for all 4 RBAC roles."""
    users = {}
    roles = [
        ("admin", "admin@test.local", "admin"),
        ("ops_manager", "ops@test.local", "operations_manager"),
        ("inv_manager", "inv@test.local", "inventory_manager"),
        ("viewer", "viewer@test.local", "viewer"),
    ]
    for username, email, role in roles:
        u = User(username=username, email=email, role=role, full_name=f"Test {role}")
        u.set_password("Password123")
        db.session.add(u)
        users[role] = u
    db.session.commit()
    return users

@pytest.fixture
def admin_headers(app, auth_users):
    token = generate_token(auth_users["admin"])
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def ops_headers(app, auth_users):
    token = generate_token(auth_users["operations_manager"])
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def inv_headers(app, auth_users):
    token = generate_token(auth_users["inventory_manager"])
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def viewer_headers(app, auth_users):
    token = generate_token(auth_users["viewer"])
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def sample_data(app):
    """Seed lightweight sample data for integration tests."""
    supplier = Supplier(
        company_name="Test Supplier Co",
        contact_person="Alice Smith",
        email="alice@testsupplier.com",
        phone="+91 99999 88888",
        lead_time_days=5
    )
    db.session.add(supplier)
    db.session.flush()

    p1 = Product(
        name="Microchip Alpha",
        sku="TEST-CHIP-01",
        category="Electronics",
        stock_quantity=10,
        reorder_level=20,
        unit_cost=100.00,
        supplier_id=supplier.id
    )
    p2 = Product(
        name="Steel Bolt",
        sku="TEST-BOLT-01",
        category="Hardware",
        stock_quantity=500,
        reorder_level=100,
        unit_cost=2.50,
        supplier_id=supplier.id
    )
    db.session.add_all([p1, p2])
    db.session.commit()

    return {
        "supplier": supplier,
        "product_low": p1,
        "product_healthy": p2
    }
