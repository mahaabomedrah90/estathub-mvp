import fs from 'node:fs'
import path from 'node:path'
import { Gateway, Wallets, Contract } from 'fabric-network'

const USE_FABRIC = String(process.env.USE_FABRIC || '').toLowerCase() === 'true'

export type InitPropertyArgs = { propertyId: number; totalTokens: number }
export type MintArgs = { propertyId: number; userId: number; tokens: number }
export type TransferArgs = { propertyId: number; fromUserId: number; toUserId: number; tokens: number }

async function getContract(): Promise<{ gateway: Gateway; contract: Contract }> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')

  const connectionProfilePath = process.env.FABRIC_CONNECTION_PROFILE || ''
  const channelName = process.env.FABRIC_CHANNEL || ''
  const contractName = process.env.FABRIC_CONTRACT || ''
  const walletPath = process.env.FABRIC_WALLET_PATH || ''
  const identity = process.env.FABRIC_IDENTITY || ''

  if (!connectionProfilePath || !channelName || !contractName || !walletPath || !identity) {
    throw new Error('fabric_env_incomplete')
  }

  const profileAbs = path.isAbsolute(connectionProfilePath)
    ? connectionProfilePath
    : path.join(process.cwd(), connectionProfilePath)
  const walletAbs = path.isAbsolute(walletPath) ? walletPath : path.join(process.cwd(), walletPath)

  if (!fs.existsSync(profileAbs)) throw new Error('fabric_connection_profile_missing')
  if (!fs.existsSync(walletAbs)) throw new Error('fabric_wallet_missing')

  const ccp = JSON.parse(fs.readFileSync(profileAbs, 'utf8'))
  const wallet = await Wallets.newFileSystemWallet(walletAbs)
  const gw = new Gateway()
  await gw.connect(ccp, {
    wallet,
    identity,
    discovery: { enabled: true, asLocalhost: true },
  })
  const network = await gw.getNetwork(channelName)
  const contract = network.getContract(contractName)
  return { gateway: gw, contract }
}

export async function submitInitProperty(args: InitPropertyArgs): Promise<{ txId: string }> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const { gateway, contract } = await getContract()
  try {
    const tx = contract.createTransaction('InitProperty')
    await tx.submit(String(args.propertyId), String(args.totalTokens))
    const txId = tx.getTransactionId()
    return { txId }
  } finally {
    gateway.disconnect()
  }
}

export async function submitMintTokens(args: MintArgs): Promise<{ txId: string }> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const { gateway, contract } = await getContract()
  try {
    const tx = contract.createTransaction('MintTokens')
    const result = await tx.submit(String(args.propertyId), String(args.userId), String(args.tokens))
    const txId = tx.getTransactionId()
    return { txId }
  } finally {
    gateway.disconnect()
  }
}

export async function submitTransferTokens(args: TransferArgs): Promise<{ txId: string }> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const { gateway, contract } = await getContract()
  try {
    const tx = contract.createTransaction('TransferTokens')
    await tx.submit(
      String(args.propertyId),
      String(args.fromUserId),
      String(args.toUserId),
      String(args.tokens)
    )
    const txId = tx.getTransactionId()
    return { txId }
  } finally {
    gateway.disconnect()
  }
}

export async function evaluateGetBalance(userId: number, propertyId: number): Promise<number> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const { gateway, contract } = await getContract()
  try {
    const res = await contract.evaluateTransaction('GetBalance', String(userId), String(propertyId))
    const txt = res.toString('utf8')
    const n = Number(txt)
    if (!Number.isFinite(n)) throw new Error('fabric_parse_error')
    return n
  } finally {
    gateway.disconnect()
  }
}

export async function evaluateGetHoldings(userId: number): Promise<Array<{ propertyId: number; tokens: number }>> {
  if (!USE_FABRIC) throw new Error('fabric_disabled')
  const { gateway, contract } = await getContract()
  try {
    const res = await contract.evaluateTransaction('GetHoldings', String(userId))
    const txt = res.toString('utf8')
    const json = JSON.parse(txt)
    if (!Array.isArray(json)) return []
    return json.map((x: any) => ({ propertyId: Number(x.propertyId), tokens: Number(x.tokens) }))
  } finally {
    gateway.disconnect()
  }
}

export function isFabricEnabled() {
  return USE_FABRIC
}
