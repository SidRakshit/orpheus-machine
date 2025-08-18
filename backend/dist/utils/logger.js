"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
}), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json(), winston_1.default.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
        return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
}));
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({
    format: 'HH:mm:ss'
}), winston_1.default.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} ${level}: ${message}`;
}));
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        new winston_1.default.transports.Console({
            format: consoleFormat,
            silent: process.env.NODE_ENV === 'test'
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(__dirname, '../../logs/error.log'),
            level: 'error',
            maxsize: 10485760,
            maxFiles: 5
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(__dirname, '../../logs/combined.log'),
            maxsize: 10485760,
            maxFiles: 5
        })
    ],
    exceptionHandlers: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(__dirname, '../../logs/exceptions.log')
        })
    ],
    rejectionHandlers: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(__dirname, '../../logs/rejections.log')
        })
    ]
});
if (process.env.NODE_ENV === 'development') {
    exports.logger.add(new winston_1.default.transports.Console({
        format: consoleFormat
    }));
}
//# sourceMappingURL=logger.js.map