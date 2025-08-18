"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
router.get('/', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
    });
});
router.get('/detailed', async (req, res) => {
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
        healthcheck.services.database = 'healthy';
        healthcheck.services.redis = 'healthy';
        healthcheck.services.ml_model = 'healthy';
        healthcheck.services.aws_s3 = 'healthy';
    }
    catch (error) {
        logger_1.logger.error('Health check failed:', error);
        healthcheck.status = 'unhealthy';
    }
    const statusCode = healthcheck.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthcheck);
});
router.get('/ready', (req, res) => {
    res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
    });
});
router.get('/live', (req, res) => {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
//# sourceMappingURL=healthRoutes.js.map