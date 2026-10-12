import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'suvai_db',
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    decimalNumbers: true
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'suvai_default_secure_secret_2026_salt',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },

  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000').split(',').map(s => s.trim()),

  defaultAdmin: {
    username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
    name: process.env.DEFAULT_ADMIN_NAME || 'Suvai Canteen Admin',
    password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123'
  }
};
