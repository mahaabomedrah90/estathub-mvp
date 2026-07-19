import { getSetting } from '../controllers/settings.controller'

export async function getPlatformFeeRate(): Promise<number> {
  const raw = await getSetting('platformFee', '5')
  return parseFloat(raw) || 5
}

export function calcPlatformFee(investmentAmount: number, feeRatePct: number): number {
  return parseFloat((investmentAmount * feeRatePct / 100).toFixed(2))
}
