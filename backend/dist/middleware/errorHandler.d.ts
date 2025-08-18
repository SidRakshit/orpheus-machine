import { Request, Response, NextFunction } from 'express';
export interface ApiError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}
export declare class AppError extends Error implements ApiError {
    readonly statusCode: number;
    readonly isOperational: boolean;
    constructor(message: string, statusCode?: number, isOperational?: boolean);
}
export declare const createError: (message: string, statusCode?: number) => AppError;
export declare const notFoundHandler: (req: Request, res: Response, next: NextFunction) => void;
export declare const errorHandler: (error: ApiError, req: Request, res: Response, next: NextFunction) => void;
