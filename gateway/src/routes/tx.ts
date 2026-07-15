import { Router, Request, Response, NextFunction } from 'express'
import { submitTx, evaluateTx } from '../fabric/transactions'
import { SubmitTxRequest, EvaluateTxRequest } from '../fabric/types'

export const txRouter = Router()

function validateBody(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['body_must_be_object'] }
  }

  if (!body.functionName || typeof body.functionName !== 'string') {
    errors.push('functionName is required and must be a string')
  }

  if (!Array.isArray(body.args)) {
    errors.push('args must be an array of strings')
  }

  return { valid: errors.length === 0, errors }
}

txRouter.post('/v1/tx/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { valid, errors } = validateBody(req.body)
    if (!valid) {
      return res.status(400).json({ success: false, error: 'validation_error', details: errors })
    }

    const body: SubmitTxRequest = {
      channel: req.body.channel,
      chaincode: req.body.chaincode,
      contractName: req.body.contractName,
      functionName: req.body.functionName,
      args: req.body.args,
      transientData: req.body.transientData,
    }

    const result = await submitTx(body)

    return res.json({
      success: true,
      txId: result.txId,
      resultRaw: result.resultRaw,
      result: result.result,
      durationMs: result.durationMs,
      functionName: body.functionName,
    })
  } catch (err) {
    return next(err)
  }
})

txRouter.post('/v1/tx/evaluate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { valid, errors } = validateBody(req.body)
    if (!valid) {
      return res.status(400).json({ success: false, error: 'validation_error', details: errors })
    }

    const body: EvaluateTxRequest = {
      channel: req.body.channel,
      chaincode: req.body.chaincode,
      contractName: req.body.contractName,
      functionName: req.body.functionName,
      args: req.body.args,
      transientData: req.body.transientData,
    }

    const result = await evaluateTx(body)

    return res.json({
      success: true,
      resultRaw: result.resultRaw,
      result: result.result,
      durationMs: result.durationMs,
      functionName: body.functionName,
    })
  } catch (err) {
    return next(err)
  }
})
