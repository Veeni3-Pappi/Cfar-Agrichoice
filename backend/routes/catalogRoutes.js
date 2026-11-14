import { Router } from 'express';
import {
  createOrder,
  createStkPush,
  getBranches,
  getInventory,
  getOrderByReceipt,
  getOrders,
  getProducts,
  handlePaymentCallback,
  restockInventory,
} from '../controllers/catalogController.js';
import { supabaseAuth } from '../authMiddleware.js';

const router = Router();

router.get('/branches', getBranches);
router.get('/products', getProducts);
router.get('/inventory/:branchId', getInventory);
router.post('/inventory/restock', supabaseAuth, restockInventory);
router.get('/orders', getOrders);
router.post('/orders', supabaseAuth, createOrder);
router.get('/orders/:receiptNo', getOrderByReceipt);
router.post('/payments/stk-push', supabaseAuth, createStkPush);
router.post('/payments/callback', supabaseAuth, handlePaymentCallback);

export default router;
