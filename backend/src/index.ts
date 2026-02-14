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
app.use('/api/auth', authRouter)
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
