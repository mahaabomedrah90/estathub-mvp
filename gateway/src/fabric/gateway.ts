import fs from 'fs'
import crypto from 'crypto'
import { Gateway, Identity, Signer, signers, connect, Contract, Network } from '@hyperledger/fabric-gateway'
import { config } from '../config'
import { newGrpcConnection } from './client'

let gatewayInstance: Gateway | null = null
let contractCache: Map<string, Contract> = new Map()

async function newIdentity(): Promise<Identity> {
  const credentials = fs.readFileSync(config.fabricIdentityCertPath)
  if (config.fabricDebug) {
    console.log(`👤 Loading identity from ${config.fabricIdentityCertPath} (MSP: ${config.fabricMsp})`)
  }
  return {
    mspId: config.fabricMsp,
    credentials,
  }
}

async function newSigner(): Promise<Signer> {
  const privateKeyPem = fs.readFileSync(config.fabricPrivateKeyPath)
  const privateKey = crypto.createPrivateKey(privateKeyPem)
  if (config.fabricDebug) {
    console.log(`🔑 Loading private key from ${config.fabricPrivateKeyPath}`)
  }
  return signers.newPrivateKeySigner(privateKey)
}

export async function getGateway(): Promise<Gateway> {
  if (gatewayInstance) return gatewayInstance

  if (!config.useFabric) {
    throw new Error('fabric_disabled')
  }

  const client = newGrpcConnection()
  const identity = await newIdentity()
  const signer = await newSigner()

  gatewayInstance = connect({
    client,
    identity,
    signer,
    evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
    endorseOptions: () => ({ deadline: Date.now() + 15000 }),
    submitOptions: () => ({ deadline: Date.now() + 5000 }),
    commitStatusOptions: () => ({ deadline: Date.now() + config.fabricTimeoutMs }),
  })

  if (config.fabricDebug) {
    console.log('✅ Gateway connected successfully')
  }

  return gatewayInstance
}

export async function getNetworkContract(channel?: string, chaincode?: string, contractName?: string): Promise<Contract> {
  const channelName = channel || config.fabricChannel
  const chaincodeName = chaincode || config.fabricChaincode
  const contractKey = `${channelName}:${chaincodeName}:${contractName || ''}`

  const cached = contractCache.get(contractKey)
  if (cached) return cached

  const gateway = await getGateway()
  const network: Network = gateway.getNetwork(channelName)
  const contract = network.getContract(chaincodeName, contractName)

  contractCache.set(contractKey, contract)

  if (config.fabricDebug) {
    console.log(`📜 Contract acquired: ${chaincodeName} on ${channelName}`)
  }

  return contract
}

export function closeGateway(): void {
  if (gatewayInstance) {
    gatewayInstance.close()
    gatewayInstance = null
    contractCache = new Map()
  }
}
