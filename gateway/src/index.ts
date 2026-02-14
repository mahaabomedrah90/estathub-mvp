import 'dotenv/config'
import express from 'express'
import { config } from './config'
import { healthRouter } from './routes/health'
import { txRouter } from './routes/tx'
import { apiKeyAuth } from './middleware/apiKeyAuth'
import { errorHandler } from './middleware/errorHandler'

const app = express()

app.use(express.json())

app.use(healthRouter)

app.use(apiKeyAuth)
app.use(txRouter)

app.use(errorHandler)

app.listen(config.port, () => {
  console.log(`Fabric Gateway listening on port ${config.port} (NODE_ENV=${config.nodeEnv})`)
})
