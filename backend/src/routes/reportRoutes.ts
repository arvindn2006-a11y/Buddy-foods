import { Router } from 'express';
import {
  getDashboardSummary,
  getDailyEarnings,
  getAnalyticsReport,
  exportReportCsv
} from '../controllers/reportController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', authenticateToken, getDashboardSummary);
router.get('/daily-earnings', authenticateToken, getDailyEarnings);
router.get('/analytics', authenticateToken, getAnalyticsReport);
router.get('/export-csv', authenticateToken, exportReportCsv);

export default router;
