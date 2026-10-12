import { Router } from 'express';

import {
  createOrder,
  getOrders,
  getOrderById,
  cancelOrder,
  syncOfflineOrders
} from '../controllers/orderController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticateToken, createOrder);
router.get('/', authenticateToken, getOrders);
router.post('/sync', authenticateToken, syncOfflineOrders);
router.get('/:id', authenticateToken, getOrderById);
router.post('/:id/cancel', authenticateToken, requireAdmin, cancelOrder);

export default router;
