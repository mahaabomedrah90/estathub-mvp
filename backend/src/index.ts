import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'

import { propertyRouter } from './controllers/property.controller'
import { tokenRouter } from './controllers/token.controller'
import { authRouter, usersRouter } from './controllers/auth.controller'
import { walletRouter } from './controllers/wallet.controller'
import { ordersRouter } from './controllers/orders.controller'
import { blockchainRouter } from './controllers/blockchain.controller'
import { deedRouter } from './controllers/deed.controller'
import { settingsRouter } from './controllers/settings.controller'
import { isFabricEnabled, testFabricConnection } from './lib/fabric'
import { errorHandler } from './middleware/roles'
import { ownerRouter } from './controllers/owner.controller'
import { regulatorRouter } from './controllers/regulator.controller'
import { requestIdMiddleware } from './middleware/requestId'
import { checkGatewayHealth } from './lib/gatewayHealth'

dotenv.config()

const app = express()

function parseCorsOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

function createCorsOptions() {
  const nodeEnv = process.env.NODE_ENV || 'development'
  const isProd = nodeEnv === 'production'

  const raw = (process.env.CORS_ORIGIN || '').trim()
  if (isProd && !raw) {
    throw new Error(
      'Missing required env var CORS_ORIGIN in production. Example: "https://alwsm.sa,https://www.alwsm.sa"'
    )
  }

  const allowlist = raw ? parseCorsOrigins(raw) : []

  const options = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) {
        return callback(null, true)
      }

      if (allowlist.length === 0) {
        return callback(null, true)
      }

      if (allowlist.includes(origin)) {
        return callback(null, true)
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'user-id'],
  }

  return options
}

/**
 * ================================
 * ✅ CRITICAL: HEALTH CHECK (ALB)
 * ================================
 * يجب أن يكون:
 * - قبل أي منطق معقد
 * - خارج async startup
 * - سريع جدًا
 */
app.get('/health', (_req, res) => {
  res.status(200).send('ok')
})

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'estathub-backend',
    timestamp: new Date().toISOString(),
  })
})

/**
 * ================================
 * 🔧 DEBUG: Database Ping Endpoint
 * ================================
 * Temporary endpoint for debugging RDS connectivity issues
 * Protected by DEBUG_TOKEN environment variable
 */
app.get('/api/_debug/db-ping', async (req, res) => {
  const debugToken = req.headers['x-debug-token'] as string
  const expectedToken = process.env.DEBUG_TOKEN
  
  if (!expectedToken) {
    return res.status(500).json({
      error: 'debug_not_configured',
      message: 'DEBUG_TOKEN environment variable not set'
    })
  }
  
  if (debugToken !== expectedToken) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid debug token'
    })
  }
  
  const startTime = Date.now()
  const results = {
    timestamp: new Date().toISOString(),
    database: {
      connection: 'unknown' as 'unknown' | 'connected' | 'healthy' | 'failed',
      latency: null as string | null,
      error: null as {
        message: string
        code: any
        name: string
        stack: string
      } | null,
      details: null as { queryResult: any } | null
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? '***SET***' : 'NOT_SET',
      DB_HOST: process.env.DB_HOST || 'NOT_SET',
      DB_PORT: process.env.DB_PORT || 'NOT_SET',
      DB_NAME: process.env.DB_NAME || 'NOT_SET'
    }
  }
  
  try {
    console.log('🔧 [DEBUG] Starting database ping test...')
    
    // Test 1: Simple Prisma connection
    const prisma = require('./lib/prisma').prisma
    await prisma.$connect()
    results.database.connection = 'connected'
    
    // Test 2: Simple query (SELECT 1)
    const queryStart = Date.now()
    const dbResult = await prisma.$queryRaw`SELECT 1 as ping`
    const queryLatency = Date.now() - queryStart
    results.database.latency = `${queryLatency}ms`
    results.database.details = { queryResult: dbResult }
    
    console.log('✅ [DEBUG] Database ping successful:', { latency: queryLatency })
    
    await prisma.$disconnect()
    
    results.database.connection = 'healthy'
    return res.status(200).json(results)
    
  } catch (error: any) {
    console.error('❌ [DEBUG] Database ping failed:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta,
      cause: error.cause
    })
    
    results.database.connection = 'failed'
    results.database.error = {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack
    }
    
    return res.status(500).json(results)
  }
})

/**
 * ================================
 * Middleware
 * ================================
 */
app.use(cors(createCorsOptions()))

app.use(express.json())
app.use(morgan('dev'))
app.use(requestIdMiddleware)

/**
 * Static files
 */
app.use('/api/uploads', express.static('uploads'))

/**
 * Debug request logger
 */
app.use((req, _res, next) => {
  console.log(`📥 ${req.method} ${req.path}`)
  next()
})

/**
 * ================================
 * Routes
 * ================================
 */
// Ensure auth routes are properly mounted
interface RouteLayer {
  name: string;
  route?: {
    methods: { [method: string]: boolean };
    path: string;
  };
}

const hasAuthRouter = app._router.stack.some((layer: RouteLayer) => layer.name === 'authRouter');

if (!hasAuthRouter) {
  console.log('🔒 Mounting auth routes...');
  app.use('/api/auth', authRouter);
  
  // Log registered routes for debugging
  const registeredRoutes = authRouter.stack
    .filter((layer: any) => layer.route) // Filter out non-route layers
    .map((layer: any) => 
      Object.keys(layer.route.methods || {})
        .map(method => `${method.toUpperCase()} /api/auth${layer.route.path}`)
    )
    .flat();
    
  console.log('🔍 Registered auth routes:', registeredRoutes);
}
app.use('/api/users', usersRouter)
app.use('/api/properties', propertyRouter)
app.use('/api/tokens', tokenRouter)
app.use('/api/wallet', walletRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/payments', ordersRouter)
app.use('/api/blockchain', blockchainRouter)
app.use('/api/deeds', deedRouter)
app.use('/api/owners', ownerRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/regulator', regulatorRouter)

/**
 * ================================
 * API 404 Handler (JSON only)
 * ================================
 */
app.use('/api/*', (req, res) => {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: 'Not found'
  })
})

/**
 * ================================
 * Centralized API Error Handler (JSON only)
 * ================================
 */
function isSafeMessage(message: string): boolean {
  if (typeof message !== 'string') return false
  if (message.length > 200) return false
  
  // Filter out HTML, XML, stack traces, and technical error patterns
  const unsafePatterns = [
    /<[^>]*>/,           // HTML tags
    /<\/[^>]*>/,         // HTML closing tags
    /Error>/,            // XML error tags
    /AccessDenied/,      // AWS/AWS S3 errors
    /Non-JSON/,          // JSON parsing errors
    /stack|trace/i,      // Stack traces
    /cloudfront|s3/i,    // AWS service errors
    /prisma/i,           // Prisma technical details
    /database.*connection/i, // Database connection details
    /internal server error/i, // Generic technical messages
  ]
  
  return !unsafePatterns.some(pattern => pattern.test(message))
}

function getSafeErrorMessage(status: number): string {
  const lang = 'ar' // Default to Arabic for safety
  const messages: Record<number, string> = {
    400: lang === 'ar' ? 'طلب غير صالح' : 'Bad request',
    401: lang === 'ar' ? 'غير مصرح به' : 'Unauthorized',
    403: lang === 'ar' ? 'ممنوع' : 'Forbidden',
    404: lang === 'ar' ? 'غير موجود' : 'Not found',
    409: lang === 'ar' ? 'تعارض' : 'Conflict',
    422: lang === 'ar' ? 'كيان غير قابل للمعالجة' : 'Unprocessable entity',
    429: lang === 'ar' ? 'عدد محاولات كثيرة' : 'Too many requests',
    500: lang === 'ar' ? 'خطأ في الخادم' : 'Internal server error'
  }
  return messages[status] || (lang === 'ar' ? 'حدث خطأ' : 'An error occurred')
}

app.use('/api/*', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Ensure we always return JSON for /api routes
  const status = err.status || err.statusCode || 500
  
  let message = err.message || 'Unknown error'
  
  // Sanitize error message
  if (!isSafeMessage(message)) {
    message = getSafeErrorMessage(status)
  }
  
  // Build standardized error response
  const errorResponse: any = {
    code: err.code || 'INTERNAL_ERROR',
    message
  }
  
  // Add field if present
  if (err.field) {
    errorResponse.field = err.field
  }
  
  console.error(`API Error ${status}:`, {
    code: err.code,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  })
  
  res.status(status).json(errorResponse)
})

/**
 * Error handler (last)
 */
app.use(errorHandler)

/**
 * ================================
 * Server startup
 * ================================
 */
const PORT = Number(process.env.PORT || 5001)

async function startServer() {
  console.log('\n=== STARTUP CHECKS ===')

  // Database connectivity check
  try {
    console.log('🔍 Checking database connectivity...')
    const prisma = require('./lib/prisma').prisma
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1 as ping`
    await prisma.$disconnect()
    console.log('✅ Database connectivity OK')
  } catch (err: any) {
    console.error('❌ Database connectivity failed:', err.message)
    console.error('⚠️ Server will start but login may fail. Check RDS connectivity.')
  }

  if (isFabricEnabled()) {
    console.log('✅ Fabric enabled')
    try {
      await testFabricConnection()
      console.log('✅ Fabric connection OK')
    } catch (err: any) {
      console.error('⚠️ Fabric check failed:', err.message)
    }
  } else {
    console.log('ℹ️ Fabric disabled')
  }

  if (
    process.env.USE_FABRIC_GATEWAY === 'true' &&
    process.env.GATEWAY_STARTUP_CHECK === 'true'
  ) {
    try {
      await checkGatewayHealth()
    } catch (err: any) {
      console.error('⚠️ Gateway health failed:', err?.message || err)
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API running on http://0.0.0.0:${PORT}`)
  })
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err)
  process.exit(1)
})
