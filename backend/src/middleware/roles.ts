import { Request, Response, NextFunction, Router } from 'express'
import { auth } from './auth'// ===== STANDARDIZED CONTROLLER TEMPLATE =====
export abstract class BaseController {
 protected abstract router: Router
 // Standardized error handling wrapper
 protected async handleRequest(
 handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
 ) {
 return async (req: Request, res: Response, next: NextFunction) => {
 try {
 await handler(req, res, next)
 } catch (error) {
 next(error)
 }
 }
 }
 // Standardized validation wrapper
 protected validateBody(requiredFields: string[]) {
 return (req: Request, res: Response, next: NextFunction) => {
 try {
 validateRequired(req.body, requiredFields)
 next()
 } catch (error) {
 next(error)
 }
 }
 }
 // Standardized authentication wrapper
 protected requireAuth(optional: boolean = false) {
 return auth(optional)
 }
 // Standardized role wrapper
 protected requireRole(roles: string[]) {
 return (req: Request & { user?: any }, res: Response, next: NextFunction) => {
 if (!req.user || !roles.includes(req.user.role)) {
 return res.status(403).json({ error: 'forbidden' })
 }
 return next()
 }
 }
}

// ===== CENTRALIZED ERROR HANDLING =====
export interface ApiError {
  error: string
  details?: string
  code?: string
  timestamp?: string
}

export class StandardError extends Error {
  public statusCode: number
  public code: string
  public details?: string
  
  constructor(message: string, statusCode: number = 500, code: string = 'internal_error', details?: string) {
    super(message)
    this.name = 'StandardError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

// Centralized error handler middleware
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('❌ API Error:', {
    error: err,
    message: err?.message,
    stack: err?.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    user: req.user?.userId || 'unauthenticated',
    timestamp: new Date().toISOString()
  })
  
  // Handle known error types
  if (err instanceof StandardError) {
    return res.status(err.statusCode).json({
      error: err.code,
      details: err.details || err.message,
      timestamp: new Date().toISOString()
    } as ApiError)
  }
  
  // Handle multer file errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'file_too_large',
      details: 'File size exceeds 5MB limit',
      timestamp: new Date().toISOString()
    } as ApiError)
  }
  
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      error: 'too_many_files',
      details: 'Maximum 10 files allowed',
      timestamp: new Date().toISOString()
    } as ApiError)
  }
  
  if (err.message?.includes('Only image files are allowed')) {
    return res.status(400).json({
      error: 'invalid_file_type',
      details: 'Only image files are allowed (JPEG, PNG, GIF, WebP)',
      timestamp: new Date().toISOString()
    } as ApiError)
  }
  
  // Handle Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'duplicate_entry',
      details: 'Record already exists',
      timestamp: new Date().toISOString()
    } as ApiError)
  }
  
  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'record_not_found',
      details: 'Requested record not found',
      timestamp: new Date().toISOString()
    } as ApiError)
  }
  
  // Default error response
  res.status(err.statusCode || 500).json({
    error: err.code || 'internal_error',
    details: err.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  } as ApiError)
}

// Helper function for throwing standardized errors
export function throwApiError(message: string, statusCode: number = 500, code: string = 'internal_error', details?: string) {
  throw new StandardError(message, statusCode, code, details)
}

// Validation helper
export function validateRequired(data: any, fields: string[]) {
  const missing = fields.filter(field => !data[field])
  if (missing.length > 0) {
    throwApiError(
      `Missing required fields: ${missing.join(', ')}`,
      400,
      'missing_required_fields',
      `Fields ${missing.join(', ')} are required`
    )
  }
}

export function requireRole(roles: string[]) {
  return (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden' })
    }
    return next()
  }
}

export default requireRole

// === UPLOAD MIDDLEWARE ===
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads/properties');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for property image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename: property-timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `property-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File filter for images only
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'), false);
  }
};

// Configure multer
export const uploadPropertyImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
    files: 10 // Maximum 10 files
  }
});

// Middleware to handle multiple image uploads
export const uploadMultiplePropertyImages = uploadPropertyImages.array('images', 10);

// Middleware to handle single image upload (for backward compatibility)
export const uploadSinglePropertyImage = uploadPropertyImages.single('image');

// Helper function to get file URL
export const getFileUrl = (filename: string): string => {
  return `/api/uploads/properties/${filename}`;
};

// Helper function to delete a file
export const deleteFile = (filename: string): void => {
  const filePath = path.join(uploadsDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};
