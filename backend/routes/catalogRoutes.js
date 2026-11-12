import { Router } from 'express'
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
} from '../controllers/catalogController.js'

const router = Router()

router.get('/branches', getBranches)
router.get('/products', getProducts)
router.get('/inventory/:branchId', getInventory)
router.post('/inventory/restock', restockInventory)
router.get('/orders', getOrders)
router.post('/orders', createOrder)
router.get('/orders/:receiptNo', getOrderByReceipt)
router.post('/payments/stk-push', createStkPush)
router.post('/payments/callback', handlePaymentCallback)

export default router
