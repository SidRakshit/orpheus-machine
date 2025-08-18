import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

const router = Router();

// GET /api/health - Basic health check
router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// GET /api/health/detailed - Detailed health check
router.get('/detailed', async (req: Request, res: Response) => {
  const healthcheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'unknown',
      redis: 'unknown',
      ml_model: 'unknown',
      aws_s3: 'unknown'
    },
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  };

  try {
    // Check database connection
    // TODO: Implement database health check
    healthcheck.services.database = 'healthy';

    // Check Redis connection
    // TODO: Implement Redis health check
    healthcheck.services.redis = 'healthy';

    // Check ML model availability
    // TODO: Implement ML model health check
    healthcheck.services.ml_model = 'healthy';

    // Check AWS S3 connectivity
    // TODO: Implement S3 health check
    healthcheck.services.aws_s3 = 'healthy';

  } catch (error) {
    logger.error('Health check failed:', error);
    healthcheck.status = 'unhealthy';
  }

  const statusCode = healthcheck.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthcheck);
});

// GET /api/health/ready - Kubernetes readiness probe
router.get('/ready', (req: Request, res: Response) => {
  // Simple readiness check - can be extended with actual service checks
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

// GET /api/health/live - Kubernetes liveness probe
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

export default router; 