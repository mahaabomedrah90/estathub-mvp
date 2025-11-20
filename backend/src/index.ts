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

dotenv.config()

const app = express()

// CORS configuration - MUST be before other middleware
app.use(cors({ 
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'user-id', 'Cache-Control', 'Pragma', 'Expires']
}))

app.use(express.json())
app.use(morgan('dev'))

// Serve static files for uploaded property images
app.use('/api/uploads', express.static('uploads'))

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`)
  if (req.path.includes('/login')) {
    console.log('  Body:', req.body)
    console.log('  Headers:', req.headers)
  }
  next()
})

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Debug: Check if blockchainRouter is properly imported
console.log('\n=== DEBUGGING BLOCKCHAIN ROUTER ===')
console.log('blockchainRouter type:', typeof blockchainRouter)
console.log('blockchainRouter is Router?:', blockchainRouter?.constructor?.name)
console.log('blockchainRouter.stack length:', blockchainRouter?.stack?.length)
if (blockchainRouter?.stack) {
  console.log('Routes in blockchainRouter:')
  blockchainRouter.stack.forEach((layer: any, i: number) => {
    if (layer.route) {
      console.log(`  ${i}: ${Object.keys(layer.route.methods)} ${layer.route.path}`)
    }
  })
}
console.log('=== END DEBUG ===\n')

// Register routes
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
// Register centralized error handler (must be after all routes)
app.use(errorHandler)


// Register centralized error handler (must be after all routes)
app.use(errorHandler)

const port = Number(process.env.PORT || 5000)

// Test Fabric connection on startup
async function startServer() {
  console.log('\n=== FABRIC CONNECTION CHECK ===')
  
  if (isFabricEnabled()) {
    console.log('✅ Fabric is enabled (USE_FABRIC=true)')
    try {
      await testFabricConnection()
      console.log('✅ Fabric connection test PASSED')
    } catch (err: any) {
      console.error('❌ Fabric connection test FAILED:', err.message)
      console.error('   The server will start but Fabric queries will fail.')
      console.error('   Please check your Fabric network and configuration.')
    }
  } else {
    console.log('⚠️  Fabric is disabled (USE_FABRIC=false or not set)')
    console.log('   All blockchain queries will use database fallback.')
  }
  
  console.log('=== END FABRIC CHECK ===\n')
  
  app.listen(port, () => {
    console.log(`🚀 API running on http://localhost:${port}`)
  })
}

startServer().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
