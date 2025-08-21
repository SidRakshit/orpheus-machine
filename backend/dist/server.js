"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const fs_1 = __importDefault(require("fs"));
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = require("./utils/logger");
const musicRoutes_1 = __importDefault(require("./routes/musicRoutes"));
const healthRoutes_1 = __importDefault(require("./routes/healthRoutes"));
const database_1 = require("./services/database");
const redis_1 = require("./services/redis");
const cleanup_1 = require("./utils/cleanup");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const createDirectories = () => {
    const dirs = [
        path_1.default.join(__dirname, '../temp'),
        path_1.default.join(__dirname, '../output'),
        path_1.default.join(__dirname, '../logs')
    ];
    dirs.forEach(dir => {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    });
};
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10'),
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
app.use((0, morgan_1.default)('combined', {
    stream: { write: (message) => logger_1.logger.info(message.trim()) }
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/health', healthRoutes_1.default);
app.use('/api', musicRoutes_1.default);
app.get('/', (req, res) => {
    res.json({
        name: 'Orpheus Machine Backend',
        version: '1.0.0',
        status: 'running',
        documentation: '/api/health'
    });
});
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
const startServer = async () => {
    try {
        createDirectories();
        await (0, database_1.initializeDatabase)();
        logger_1.logger.info('Database connection established');
        await (0, redis_1.initializeRedis)();
        logger_1.logger.info('Redis connection established');
        (0, cleanup_1.scheduleCleanupTasks)();
        logger_1.logger.info('Cleanup tasks scheduled');
        app.listen(PORT, () => {
            logger_1.logger.info(`🎵 Orpheus Machine Backend running on port ${PORT}`);
            logger_1.logger.info(`🌐 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
            logger_1.logger.info(`🔒 Rate limiting: ${process.env.RATE_LIMIT_MAX_REQUESTS || '10'} requests per ${Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 60000)} minutes`);
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to start server:', error);
        process.exit(1);
    }
};
process.on('SIGTERM', () => {
    logger_1.logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});
process.on('SIGINT', () => {
    logger_1.logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
startServer();
//# sourceMappingURL=server.js.map