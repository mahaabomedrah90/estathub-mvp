import { config } from '../config'
import { getNetworkContract } from './gateway'
import { SubmitTxRequest, SubmitTxResult, EvaluateTxRequest, EvaluateTxResult } from './types'

function parseJsonSafe(raw: string): any | null {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function submitTx(req: SubmitTxRequest): Promise<SubmitTxResult> {
  if (!config.useFabric) {
    throw new Error('fabric_disabled')
  }

  const { channel, chaincode, contractName, functionName, args, transientData } = req

  const contract = await getNetworkContract(channel, chaincode, contractName)

  const start = Date.now()
  const options: any = { arguments: args }
  if (transientData && Object.keys(transientData).length > 0) {
    options.transientData = transientData
  }

  const result = await (contract as any).submitAsync(functionName, options)
  const txId: string = result.getTransactionId()
  await result.getStatus()
  const end = Date.now()

  if (config.fabricDebug) {
    console.log(`✅ Tx committed: ${functionName}(${args.join(', ')}) - TxID: ${txId}`)
  } else {
    console.log(`✅ Tx submitted: ${functionName} - TxID: ${txId}`)
  }

  // fabric-gateway submitAsync does not return payload directly here; keep result empty for now
  const resultRaw = ''

  return {
    txId,
    resultRaw,
    result: parseJsonSafe(resultRaw),
    durationMs: end - start,
  }
}

export async function evaluateTx(req: EvaluateTxRequest): Promise<EvaluateTxResult> {
  if (!config.useFabric) {
    throw new Error('fabric_disabled')
  }

  const { channel, chaincode, contractName, functionName, args } = req

  const contract = await getNetworkContract(channel, chaincode, contractName)

  const start = Date.now()
  const buffer: Buffer = await contract.evaluateTransaction(functionName, ...args)
  const end = Date.now()

  const resultRaw = buffer.toString('utf8')
  const result = parseJsonSafe(resultRaw)

  if (config.fabricDebug) {
    console.log(`✅ Query executed: ${functionName}(${args.join(', ')})`)
  }

  return {
    resultRaw,
    result,
    durationMs: end - start,
  }
}
