"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = exports.createError = exports.AppError = void 0;
const logger_1 = require("../utils/logger");
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const createError = (message, statusCode = 500) => {
    return new AppError(message, statusCode);
};
exports.createError = createError;
const notFoundHandler = (req, res, next) => {
    const error = new AppError(`Route ${req.originalUrl} not found`, 404);
    next(error);
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (error, req, res, next) => {
    let { statusCode = 500, message } = error;
    logger_1.logger.error(`Error ${statusCode}: ${message}`, {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        stack: error.stack,
        body: req.body,
        query: req.query,
        params: req.params
    });
    if (process.env.NODE_ENV === 'production' && !error.isOperational) {
        message = 'Internal Server Error';
    }
    res.status(statusCode).json({
        error: message,
        status: statusCode,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            details: {
                url: req.originalUrl,
                method: req.method
            }
        })
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map