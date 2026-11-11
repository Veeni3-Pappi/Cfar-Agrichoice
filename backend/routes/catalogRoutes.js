import { Router } from 'express'
import {
  getBranches,
  getInventory,
  getProducts,
} from '../controllers/catalogController.js'

const router = Router()

router.get('/branches', getBranches)
router.get('/products', getProducts)
router.get('/inventory/:branchId', getInventory)

export default router
