import { Router } from 'express';
import {
  getProducts,
  createProduct,
  updateProduct,
  toggleProductStock,
  deleteProduct
} from '../controllers/productController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', getProducts);
router.post('/', authenticateToken, requireAdmin, createProduct);
router.put('/:id', authenticateToken, requireAdmin, updateProduct);
router.patch('/:id/toggle-stock', authenticateToken, toggleProductStock);
router.delete('/:id', authenticateToken, requireAdmin, deleteProduct);

export default router;
