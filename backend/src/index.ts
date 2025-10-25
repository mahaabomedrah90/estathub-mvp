import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import dotenv from 'dotenv'

import { propertyRouter } from './controllers/property.controller'
import { tokenRouter } from './controllers/token.controller'
import { authRouter } from './controllers/auth.controller'
import { walletRouter } from './controllers/wallet.controller'
import { ordersRouter } from './controllers/orders.controller'

dotenv.config()

const app = express()
app.use(express.json())
app.use(morgan('dev'))
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Register routes
app.use(authRouter)
app.use(propertyRouter)
app.use(tokenRouter)
app.use(walletRouter)
app.use(ordersRouter)

const port = Number(process.env.PORT || 5000)
app.listen(port, () => {
  console.log(`🚀 API running on http://localhost:${port}`)
})
