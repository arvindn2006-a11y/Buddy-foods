import { Router } from 'express';
import { exportDatabaseBackup, restoreDatabaseBackup, resetDemoData } from '../controllers/backupController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/export', authenticateToken, requireAdmin, exportDatabaseBackup);
router.post('/restore', authenticateToken, requireAdmin, restoreDatabaseBackup);
router.post('/reset-demo', authenticateToken, requireAdmin, resetDemoData);

export default router;
