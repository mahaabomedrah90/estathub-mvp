export interface TxRequestBase {
  channel?: string
  chaincode?: string
  contractName?: string
  functionName: string
  args: string[]
  transientData?: Record<string, string>
}

export interface SubmitTxRequest extends TxRequestBase {}

export interface EvaluateTxRequest extends TxRequestBase {}

export interface SubmitTxResult {
  txId: string
  resultRaw?: string
  result?: any
  durationMs: number
}

export interface EvaluateTxResult {
  resultRaw: string
  result: any | null
  durationMs: number
}
