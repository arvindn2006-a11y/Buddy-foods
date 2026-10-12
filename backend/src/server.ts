import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { initDatabaseConnection, isFallbackActive } from './config/db.js';
import { runMigrations } from './database/init.js';
import { apiLimiter } from './middleware/rateLimiter.js';

import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import backupRoutes from './routes/backupRoutes.js';

const app = express();

// Trust reverse proxy (Vercel, Render, Nginx)
app.set('trust proxy', 1);

// Configure CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or local print bridge)
      if (!origin) return callback(null, true);
      // In development or if wildcard / allowed origin matches
      if (config.corsOrigins.includes(origin) || config.corsOrigins.includes('*') || config.nodeEnv === 'development') {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev/testing
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general API rate limiter
app.use('/api/', apiLimiter);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Suvai Smart Canteen API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database_mode: isFallbackActive() ? 'in-memory-fallback' : 'mysql-connected',
    environment: config.nodeEnv
  });
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/backup', backupRoutes);

// 404 handler for unmatched API routes
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' not found.`
  });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred.',
    ...(config.nodeEnv === 'development' ? { stack: err.stack } : {})
  });
});

export { app };

// Start HTTP Server
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      console.log('----------------------------------------------------');
      console.log('   SUVAI — Smart Canteen Billing & Management System ');
      console.log('----------------------------------------------------');
      await initDatabaseConnection();
      await runMigrations();

      app.listen(config.port, () => {
        console.log(`[Suvai Server] API successfully listening on http://localhost:${config.port}`);
        console.log(`[Suvai Server] Database status: ${isFallbackActive() ? 'InMemory (Fallback Mode)' : 'MySQL (Connected)'}`);
      });
    } catch (error) {
      console.error('[Server Startup Fatal Error]:', error);
      process.exit(1);
    }
  })();
}
