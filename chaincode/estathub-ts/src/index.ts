/// <reference types="node" />
import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api'

interface Holding { userId: string; propertyId: string; tokens: number }
interface Property { propertyId: string; totalTokens: number; remainingTokens: number }

function propKey(propertyId: string) { return `prop:${propertyId}` }
function holdKey(userId: string, propertyId: string) { return `hold:${userId}:${propertyId}` }

@Info({ title: 'EstathubContract', description: 'Real-estate tokenization contract' })
export class EstathubContract extends Contract {
  @Transaction()
  public async InitProperty(ctx: Context, propertyId: string, totalTokens: string): Promise<void> {
    const pkey = propKey(propertyId)
    const exists = await this.exists(ctx, pkey)
    if (exists) throw new Error('property_exists')
    const total = Number(totalTokens)
    if (!Number.isFinite(total) || total <= 0) throw new Error('invalid_total')
    const prop: Property = { propertyId, totalTokens: total, remainingTokens: total }
    await ctx.stub.putState(pkey, Buffer.from(JSON.stringify(prop)))
  }

  @Transaction()
  public async MintTokens(ctx: Context, propertyId: string, userId: string, tokens: string): Promise<void> {
    const qty = Number(tokens)
    if (!Number.isFinite(qty) || qty <= 0) throw new Error('invalid_tokens')

    const pkey = propKey(propertyId)
    const pbuf = await ctx.stub.getState(pkey)
    if (!pbuf || pbuf.length === 0) throw new Error('property_not_found')
    const prop = JSON.parse(pbuf.toString()) as Property
    if (prop.remainingTokens < qty) throw new Error('insufficient_remaining')

    prop.remainingTokens -= qty
    await ctx.stub.putState(pkey, Buffer.from(JSON.stringify(prop)))

    const hkey = holdKey(userId, propertyId)
    const hbuf = await ctx.stub.getState(hkey)
    let bal = 0
    if (hbuf && hbuf.length) {
      const holding = JSON.parse(hbuf.toString()) as Holding
      bal = holding.tokens
    }
    const updated: Holding = { userId, propertyId, tokens: bal + qty }
    await ctx.stub.putState(hkey, Buffer.from(JSON.stringify(updated)))

    await ctx.stub.setEvent('TokenMinted', Buffer.from(JSON.stringify({ propertyId, userId, tokens: qty })))
  }

  @Transaction()
  public async TransferTokens(ctx: Context, propertyId: string, fromUserId: string, toUserId: string, tokens: string): Promise<void> {
    const qty = Number(tokens)
    if (!Number.isFinite(qty) || qty <= 0) throw new Error('invalid_tokens')
    const fromKey = holdKey(fromUserId, propertyId)
    const toKey = holdKey(toUserId, propertyId)

    const fbuf = await ctx.stub.getState(fromKey)
    if (!fbuf || fbuf.length === 0) throw new Error('from_not_found')
    const fhold = JSON.parse(fbuf.toString()) as Holding
    if ((fhold.tokens || 0) < qty) throw new Error('insufficient_balance')

    const tbuf = await ctx.stub.getState(toKey)
    const thold = tbuf && tbuf.length ? (JSON.parse(tbuf.toString()) as Holding) : { userId: toUserId, propertyId, tokens: 0 }

    fhold.tokens -= qty
    thold.tokens += qty

    await ctx.stub.putState(fromKey, Buffer.from(JSON.stringify(fhold)))
    await ctx.stub.putState(toKey, Buffer.from(JSON.stringify(thold)))

    await ctx.stub.setEvent('TokenTransferred', Buffer.from(JSON.stringify({ propertyId, fromUserId, toUserId, tokens: qty })))
  }

  @Transaction(false)
  @Returns('number')
  public async GetBalance(ctx: Context, userId: string, propertyId: string): Promise<number> {
    const hkey = holdKey(userId, propertyId)
    const hbuf = await ctx.stub.getState(hkey)
    if (!hbuf || hbuf.length === 0) return 0
    const holding = JSON.parse(hbuf.toString()) as Holding
    return holding.tokens || 0
  }

  @Transaction(false)
  public async GetHoldings(ctx: Context, userId: string): Promise<string> {
    const results: Array<{ propertyId: string; tokens: number }> = []
    // Scan by range prefix to find all holdings for this user
    const startKey = `hold:${userId}:`
    const endKey = `hold:${userId};` // ';' next char after ':' in ASCII ordering to bound prefix
    const rangeIter = await ctx.stub.getStateByRange(startKey, endKey)
    
    try {
      while (true) {
        const res = await rangeIter.next()
        if (res.done) break
        
        if (res.value && res.value.value) {
          const obj = JSON.parse(res.value.value.toString()) as Holding
          results.push({ propertyId: obj.propertyId, tokens: obj.tokens || 0 })
        }
      }
    } finally {
      await rangeIter.close()
    }
    return JSON.stringify(results)
  }

  private async exists(ctx: Context, key: string): Promise<boolean> {
    const data = await ctx.stub.getState(key)
    return !!(data && data.length)
  }
}

export const contracts: any[] = [EstathubContract]
