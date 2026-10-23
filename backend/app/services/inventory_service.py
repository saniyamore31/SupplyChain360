from datetime import datetime, timezone
from app import db
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.purchase_order import PurchaseOrder, PurchaseOrderItem

class InventoryService:
    """
    Core business logic service for inventory movements, referential safety, and atomic receipts.
    """

    @staticmethod
    def check_product_deletion_safety(product_id):
        """
        Check if a product can be safely deleted.
        Returns (is_safe, error_message, conflict_count).
        """
        po_item_count = PurchaseOrderItem.query.filter_by(product_id=product_id).count()
        if po_item_count > 0:
            return False, f"Cannot delete product because it is referenced in {po_item_count} purchase order record(s). Removing it would corrupt historical accounting records.", po_item_count
        return True, None, 0

    @staticmethod
    def check_supplier_deletion_safety(supplier_id):
        """
        Check if a supplier can be safely deleted.
        Returns (is_safe, error_message).
        """
        prod_count = Product.query.filter_by(supplier_id=supplier_id).count()
        if prod_count > 0:
            return False, f"Cannot delete supplier because {prod_count} catalog product(s) are assigned to this supplier. Reassign or delete those products first."

        po_count = PurchaseOrder.query.filter_by(supplier_id=supplier_id).count()
        if po_count > 0:
            return False, f"Cannot delete supplier because {po_count} historical purchase order(s) exist for this supplier."

        return True, None

    @staticmethod
    def receive_purchase_order_transactional(order_id):
        """
        Critical Inventory Receipt Operation:
        - Atomically receives an order into inventory.
        - Guarantees each purchase order can update inventory EXACTLY ONCE.
        - Rejects already received orders with 409 Conflict.
        - Rejects cancelled orders with 400 Bad Request.
        - Updates product stock in an atomic database transaction.
        """
        order = db.session.get(PurchaseOrder, order_id)
        if not order:
            return False, "Not Found", f"Purchase order {order_id} not found.", 404, None

        if order.is_received:
            return False, "Already Received", f"Purchase order {order.order_number} was already received into inventory on {order.received_at}. Duplicate receipt is prohibited to prevent double-counting stock.", 409, None

        if order.status == "cancelled":
            return False, "Order Cancelled", f"Cannot receive order {order.order_number} because it has been cancelled.", 400, None

        try:
            updated_products = []
            for item in order.items:
                product = db.session.get(Product, item.product_id)
                if not product:
                    raise ValueError(f"Product ID {item.product_id} from line item no longer exists.")

                old_stock = product.stock_quantity
                product.stock_quantity += item.quantity
                updated_products.append({
                    "product_name": product.name,
                    "sku": product.sku,
                    "previous_stock": old_stock,
                    "quantity_added": item.quantity,
                    "new_stock": product.stock_quantity
                })

            order.status = "delivered"
            order.is_received = True
            order.received_at = datetime.now(timezone.utc)

            db.session.commit()
            return True, None, f"Purchase order {order.order_number} received successfully. Inventory has been updated.", 200, {
                "order": order.to_dict(include_items=True),
                "updated_products": updated_products
            }
        except Exception as e:
            db.session.rollback()
            return False, "Receipt Transaction Failed", f"Failed to receive order into inventory: {str(e)}", 500, None
