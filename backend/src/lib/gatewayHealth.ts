import axios from 'axios'
import { logInfo, logWarn } from './logger'

export async function checkGatewayHealth(): Promise<void> {
  const url = process.env.FABRIC_GATEWAY_URL
  if (!url) {
    logWarn('gateway_health_skipped', { reason: 'FABRIC_GATEWAY_URL not set' })
    return
  }

  const healthUrl = url.replace(/\/$/, '') + '/v1/health'

  const start = Date.now()
  try {
    const res = await axios.get(healthUrl, { timeout: 5000 })
    const durationMs = Date.now() - start
    logInfo('gateway_health_ok', {
      durationMs,
      status: res.status,
      fabricConfigured: Boolean(res.data?.fabric?.configured),
    })
  } catch (err: any) {
    const durationMs = Date.now() - start
    logWarn('gateway_health_failed', {
      durationMs,
      error: err?.message || String(err),
    })
    throw err
  }
}
