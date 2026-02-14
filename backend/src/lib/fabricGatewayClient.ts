import axios, { AxiosInstance, AxiosError } from 'axios'
import crypto from 'crypto'
import { getRequestId } from './requestContext'
import { logInfo, logWarn, logError } from './logger'

const GATEWAY_URL = process.env.FABRIC_GATEWAY_URL || ''
const GATEWAY_KEY = process.env.FABRIC_GATEWAY_KEY || ''

const GATEWAY_TIMEOUT_MS = Number(process.env.FABRIC_GATEWAY_TIMEOUT_MS || '70000') || 70000
const GATEWAY_RETRY_COUNT = Number(process.env.FABRIC_GATEWAY_RETRY_COUNT || '2') || 2
const GATEWAY_RETRY_BASE_DELAY_MS = Number(process.env.FABRIC_GATEWAY_RETRY_BASE_DELAY_MS || '250') || 250

const CB_ENABLED = String(process.env.FABRIC_GATEWAY_CIRCUIT_BREAKER_ENABLED || 'true').toLowerCase() === 'true'
const CB_FAILURE_THRESHOLD = Number(process.env.FABRIC_GATEWAY_CB_FAILURE_THRESHOLD || '5') || 5
const CB_RESET_TIMEOUT_MS = Number(process.env.FABRIC_GATEWAY_CB_RESET_TIMEOUT_MS || '30000') || 30000

type CircuitState = 'closed' | 'open' | 'half-open'

let client: AxiosInstance | null = null
let circuitState: CircuitState = 'closed'
let failureCount = 0
let nextAttemptAfter = 0

function getClient(): AxiosInstance {
  if (client) return client

  if (!GATEWAY_URL) {
    throw new Error('FABRIC_GATEWAY_URL not configured')
  }

  client = axios.create({
    baseURL: GATEWAY_URL,
    timeout: GATEWAY_TIMEOUT_MS,
  })

  return client
}

function getCircuitState(): CircuitState {
  if (!CB_ENABLED) return 'closed'
  const now = Date.now()
  if (circuitState === 'open' && now >= nextAttemptAfter) {
    circuitState = 'half-open'
  }
  return circuitState
}

function recordSuccess(): void {
  failureCount = 0
  if (circuitState !== 'closed') {
    circuitState = 'closed'
  }
}

function recordFailure(): void {
  if (!CB_ENABLED) return
  failureCount += 1
  if (failureCount >= CB_FAILURE_THRESHOLD) {
    circuitState = 'open'
    nextAttemptAfter = Date.now() + CB_RESET_TIMEOUT_MS
  }
}

function isTransientError(err: any): boolean {
  const axiosErr = err as AxiosError
  const code = axiosErr.code
  const status = axiosErr.response?.status

  if (code && ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN'].includes(code)) {
    return true
  }

  if (status && [502, 503, 504].includes(status)) {
    return true
  }

  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function buildIdempotencyKey(functionName: string, args: string[]): string {
  const requestId = getRequestId() || ''
  const hash = crypto.createHash('sha256').update(functionName + '|' + args.join('|') + '|' + requestId).digest('hex')
  return hash
}

export interface GatewaySubmitParams {
  channel?: string
  chaincode?: string
  contractName?: string
  functionName: string
  args: string[]
  transientData?: Record<string, string>
}

export interface GatewaySubmitResult {
  txId: string
  resultRaw?: string
  result?: any
  durationMs: number
}

export interface GatewayEvaluateParams {
  channel?: string
  chaincode?: string
  contractName?: string
  functionName: string
  args: string[]
}

export interface GatewayEvaluateResult {
  resultRaw: string
  result: any | null
  durationMs: number
}

export async function submitGatewayTx(params: GatewaySubmitParams): Promise<GatewaySubmitResult> {
  const http = getClient()

  const payload: any = {
    channel: params.channel,
    chaincode: params.chaincode,
    contractName: params.contractName,
    functionName: params.functionName,
    args: params.args,
  }

  if (params.transientData) {
    payload.transientData = params.transientData
  }

  const headers: Record<string, string> = {}
  if (GATEWAY_KEY) {
    headers['X-GATEWAY-KEY'] = GATEWAY_KEY
  }

  const requestId = getRequestId()
  if (requestId) {
    headers['X-Request-Id'] = requestId
  }

  const idempotencyKey = buildIdempotencyKey(params.functionName, params.args)
  headers['X-Idempotency-Key'] = idempotencyKey

  const circuit = getCircuitState()
  if (circuit === 'open') {
    const error = new Error('gateway_circuit_open')
    logWarn('gateway_request_short_circuit', {
      endpoint: '/v1/tx/submit',
      functionName: params.functionName,
      argsCount: params.args.length,
      circuitState: circuit,
    })
    throw error
  }

  let lastError: any
  const maxAttempts = GATEWAY_RETRY_COUNT + 1

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const start = Date.now()
    const currentCircuit = getCircuitState()
    try {
      logInfo('gateway_request_start', {
        endpoint: '/v1/tx/submit',
        functionName: params.functionName,
        argsCount: params.args.length,
        attempt,
        circuitState: currentCircuit,
      })

      const res = await http.post('/v1/tx/submit', payload, { headers })
      const data = res.data
      const durationMs = Date.now() - start

      if (!data || data.success !== true) {
        const errorCode = data?.error || 'gateway_submit_failed'
        const message = data?.message || 'Fabric Gateway submit failed'
        const err = new Error(`${errorCode}: ${message}`)
        ;(err as any).details = data
        throw err
      }

      recordSuccess()

      logInfo('gateway_request_success', {
        endpoint: '/v1/tx/submit',
        functionName: params.functionName,
        argsCount: params.args.length,
        durationMs,
        txId: data.txId,
      })

      return {
        txId: String(data.txId || ''),
        resultRaw: typeof data.resultRaw === 'string' ? data.resultRaw : '',
        result: data.result,
        durationMs: Number.isFinite(data.durationMs) ? data.durationMs : durationMs,
      }
    } catch (err: any) {
      const durationMs = Date.now() - start
      lastError = err
      recordFailure()

      const transient = isTransientError(err)

      logError('gateway_request_failure', {
        endpoint: '/v1/tx/submit',
        functionName: params.functionName,
        argsCount: params.args.length,
        durationMs,
        error: err?.message || String(err),
        transient,
        attempt,
        circuitState: getCircuitState(),
        statusCode: (err as AxiosError)?.response?.status,
      })

      if (!transient || attempt === maxAttempts) {
        throw err
      }

      const delay = GATEWAY_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1)
      const jitter = Math.floor(Math.random() * 50)
      await sleep(delay + jitter)
    }
  }

  throw lastError
}

export async function evaluateGatewayTx(params: GatewayEvaluateParams): Promise<GatewayEvaluateResult> {
  const http = getClient()

  const payload: any = {
    channel: params.channel,
    chaincode: params.chaincode,
    contractName: params.contractName,
    functionName: params.functionName,
    args: params.args,
  }

  const headers: Record<string, string> = {}
  if (GATEWAY_KEY) {
    headers['X-GATEWAY-KEY'] = GATEWAY_KEY
  }

  const requestId = getRequestId()
  if (requestId) {
    headers['X-Request-Id'] = requestId
  }

  const circuit = getCircuitState()
  if (circuit === 'open') {
    const error = new Error('gateway_circuit_open')
    logWarn('gateway_request_short_circuit', {
      endpoint: '/v1/tx/evaluate',
      functionName: params.functionName,
      argsCount: params.args.length,
      circuitState: circuit,
    })
    throw error
  }

  let lastError: any
  const maxAttempts = GATEWAY_RETRY_COUNT + 1

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const start = Date.now()
    const currentCircuit = getCircuitState()
    try {
      logInfo('gateway_request_start', {
        endpoint: '/v1/tx/evaluate',
        functionName: params.functionName,
        argsCount: params.args.length,
        attempt,
        circuitState: currentCircuit,
      })

      const res = await http.post('/v1/tx/evaluate', payload, { headers })
      const data = res.data
      const durationMs = Date.now() - start

      if (!data || data.success !== true) {
        const errorCode = data?.error || 'gateway_evaluate_failed'
        const message = data?.message || 'Fabric Gateway evaluate failed'
        const err = new Error(`${errorCode}: ${message}`)
        ;(err as any).details = data
        throw err
      }

      recordSuccess()

      logInfo('gateway_request_success', {
        endpoint: '/v1/tx/evaluate',
        functionName: params.functionName,
        argsCount: params.args.length,
        durationMs,
      })

      return {
        resultRaw: typeof data.resultRaw === 'string' ? data.resultRaw : '',
        result: data.result ?? null,
        durationMs: Number.isFinite(data.durationMs) ? data.durationMs : durationMs,
      }
    } catch (err: any) {
      const durationMs = Date.now() - start
      lastError = err
      recordFailure()

      const transient = isTransientError(err)

      logError('gateway_request_failure', {
        endpoint: '/v1/tx/evaluate',
        functionName: params.functionName,
        argsCount: params.args.length,
        durationMs,
        error: err?.message || String(err),
        transient,
        attempt,
        circuitState: getCircuitState(),
        statusCode: (err as AxiosError)?.response?.status,
      })

      if (!transient || attempt === maxAttempts) {
        throw err
      }

      const delay = GATEWAY_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1)
      const jitter = Math.floor(Math.random() * 50)
      await sleep(delay + jitter)
    }
  }

  throw lastError
}
