import express from 'express'
import cors from 'cors'
import morgan from 'morgan'

const app = express()

app.use(express.json())
app.use(morgan('dev'))
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }))

// In-memory data for MVP demo
let PROPERTIES = [
  { id: 1, title: 'Riyadh Rental – Tower Floor 5', monthlyYield: 0.9, tokensAvailable: 1200 },
  { id: 2, title: 'Jeddah Retail – Shop #12', monthlyYield: 1.1, tokensAvailable: 800 }
]

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.get('/api/properties', (_req, res) => {
  res.json(PROPERTIES)
})

app.post('/api/properties', (req, res) => {
  const p = req.body || {}
  p.id = PROPERTIES.length ? Math.max(...PROPERTIES.map(x => x.id)) + 1 : 1
  PROPERTIES.push(p)
  res.status(201).json(p)
})

const port = process.env.PORT || 5000
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`)
})
