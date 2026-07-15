import fs from 'fs'
import path from 'path'

export interface GatewayConfig {
  port: number
  nodeEnv: string
  logLevel: string
  useFabric: boolean
  gatewayApiKey?: string
  allowInsecureGateway: boolean
  fabricPeer: string
  fabricMsp: string
  fabricUserId: string
  fabricTlsCertPath: string
  fabricIdentityCertPath: string
  fabricPrivateKeyPath: string
  fabricChannel: string
  fabricChaincode: string
  fabricConnectionProfilePath: string
  fabricTimeoutMs: number
  fabricDebug: boolean
}

function requireEnv(name: string, allowEmpty = false): string {
  const value = process.env[name]
  if (!value && !allowEmpty) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value || ''
}

function requireFile(filePath: string, label: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found at path: ${filePath}`)
  }
  return filePath
}

export function loadConfig(): GatewayConfig {
  const nodeEnv = process.env.NODE_ENV || 'development'
  const logLevel = process.env.LOG_LEVEL || 'info'

  const port = parseInt(process.env.PORT || '4000', 10)
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid PORT value: ${process.env.PORT}`)
  }

  const allowInsecureGateway = (process.env.ALLOW_INSECURE_GATEWAY || '').toLowerCase() === 'true'
  const useFabric = (process.env.USE_FABRIC || 'true').toLowerCase() === 'true'

  const gatewayApiKey = process.env.GATEWAY_API_KEY
  if (!gatewayApiKey && !(nodeEnv === 'development' && allowInsecureGateway)) {
    throw new Error('GATEWAY_API_KEY is required unless NODE_ENV=development and ALLOW_INSECURE_GATEWAY=true')
  }

  const fabricPeer = requireEnv('FABRIC_PEER')
  const fabricMsp = requireEnv('FABRIC_MSP')
  const fabricUserId = requireEnv('FABRIC_USER_ID')

  const fabricTlsCertPath = process.env.FABRIC_TLS_CERT || '/app/fabric/certs/peer.pem'
  const fabricIdentityCertPath = process.env.FABRIC_IDENTITY_CERT || '/app/fabric/certs/user.pem'
  const fabricPrivateKeyPath = process.env.FABRIC_PRIVATE_KEY || '/app/fabric/certs/user.key'
  const fabricConnectionProfilePath = process.env.FABRIC_CONNECTION_PROFILE || '/app/fabric/connection-org1.json'

  const fabricChannel = process.env.FABRIC_CHANNEL || requireEnv('FABRIC_CHANNEL')
  const fabricChaincode = process.env.FABRIC_CHAINCODE || requireEnv('FABRIC_CHAINCODE')

  const fabricTimeoutMsRaw = process.env.FABRIC_TIMEOUT_MS || '60000'
  const fabricTimeoutMs = parseInt(fabricTimeoutMsRaw, 10)
  if (!Number.isFinite(fabricTimeoutMs) || fabricTimeoutMs <= 0) {
    throw new Error(`Invalid FABRIC_TIMEOUT_MS value: ${fabricTimeoutMsRaw}`)
  }

  // Fail fast if required files are missing
  requireFile(fabricTlsCertPath, 'FABRIC_TLS_CERT')
  requireFile(fabricIdentityCertPath, 'FABRIC_IDENTITY_CERT')
  requireFile(fabricPrivateKeyPath, 'FABRIC_PRIVATE_KEY')
  requireFile(fabricConnectionProfilePath, 'FABRIC_CONNECTION_PROFILE')

  return {
    port,
    nodeEnv,
    logLevel,
    useFabric,
    gatewayApiKey,
    allowInsecureGateway,
    fabricPeer,
    fabricMsp,
    fabricUserId,
    fabricTlsCertPath,
    fabricIdentityCertPath,
    fabricPrivateKeyPath,
    fabricChannel,
    fabricChaincode,
    fabricConnectionProfilePath,
    fabricTimeoutMs,
    fabricDebug: (process.env.FABRIC_DEBUG || '').toLowerCase() === 'true'
  }
}

export const config: GatewayConfig = loadConfig()
