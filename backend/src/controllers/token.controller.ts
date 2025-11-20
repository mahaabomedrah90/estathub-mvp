import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { auth } from '../middleware/auth'
import { requireRole } from '../middleware/roles'
import { $Enums, Role } from '@prisma/client'
import { isFabricEnabled, submitMintTokens } from '../lib/fabric'

export const tokenRouter = Router()

tokenRouter.post('/api/tokens/mint', auth(true), requireRole([Role.ADMIN, Role.OWNER] as unknown as string[]), async (req: Request & { user?: any }, res: Response) => {
  try {
    const { propertyId, userEmail, userId, tokens } = req.body || {}
   const pid = String(propertyId)
    const qty = Number(tokens)
    if (!pid || !Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({ error: 'invalid_input' })
    }

    let targetUser = null as null | { id: string; email: string; tenantId: string }
    if (userId) {
      targetUser = await prisma.user.findUnique({ where: { id: String(userId) } })

    } else if (userEmail) {
      targetUser = await prisma.user.findUnique({ where: { email: String(userEmail).toLowerCase().trim() } })
    }
    if (!targetUser) return res.status(404).json({ error: 'user_not_found' })

    const prop = await prisma.property.findUnique({ where: { id: pid } })
    if (!prop) return res.status(404).json({ error: 'property_not_found' })
    if (prop.remainingTokens < qty) return res.status(400).json({ error: 'insufficient_remaining_tokens' })

    let fabricResult: { txId: string; dbTx?: any } | undefined
    console.log('🔗 Fabric enabled:', isFabricEnabled())
    
    if (isFabricEnabled()) {
      try {
        console.log('🪙 Calling Fabric submitMintTokens...', { propertyId: pid, userId: targetUser.id, tokens: qty })
        fabricResult = await submitMintTokens({ propertyId: Number(pid), userId: Number(targetUser.id), tokens: qty })
        console.log('✅ Fabric mint successful, txId:', fabricResult.txId, 'dbTx:', fabricResult.dbTx?.id)
      } catch (fabricError: any) {
        console.error('❌ Fabric mint failed:', fabricError.message || fabricError)
        // Continue without blockchain - save to DB only
      }
    }

    // Only create database records if Fabric didn't already create them
    let dbTx: any
    console.log('🔍 fabricResult:', fabricResult)
    console.log('🔍 fabricResult?.dbTx:', fabricResult?.dbTx)
    
    if (!fabricResult?.dbTx) {
      console.log('🔍 Fabric did not create dbTx, creating it in controller...')
      await prisma.$transaction(async tx => {
        await tx.property.update({ where: { id: pid }, data: { remainingTokens: { decrement: qty } } })
        if (targetUser) {
          await tx.holding.upsert({
            where: { userId_propertyId: { userId: targetUser.id, propertyId: pid } },
            update: { tokens: { increment: qty } },
            create: { userId: targetUser.id, propertyId: pid, tokens: qty },
          })
          // Record on-chain reference if available
          dbTx = await tx.transaction.create({
            data: {
              userId: targetUser.id,
              tenantId: targetUser.tenantId,
              type: $Enums.TransactionType.TOKEN_MINT,
              amount: qty,
              note: 'Admin/Owner mint',
              blockchainTxId: fabricResult?.txId,
            },
          })
        }
      })
    } else {
      // Still need to update property and holdings even if Fabric created the transaction
      await prisma.$transaction(async tx => {
                if (targetUser) {
        await tx.holding.upsert({
        where: { userId_propertyId: { userId: targetUser.id, propertyId: pid } },
        update: { tokens: { increment: qty } },
        create: { userId: targetUser.id, propertyId: pid, tokens: qty },
        })
        }
      })
      dbTx = fabricResult.dbTx
    }

    return res.json({ 
      ok: true, 
      message: 'tokens_minted', 
      data: { 
        propertyId: pid, 
        userId: targetUser.id, 
        tokens: qty, 
        blockchainTxId: fabricResult?.txId,
        dbTransaction: dbTx,
        mintedTokens: qty,
        assetId: pid,
        status: 'SUCCESS',
        metadata: {
          orderId: `ORDER-${Date.now()}`,
          fabricResponse: fabricResult
        }
      } 
    })
  } catch (e: any) {
    console.error('❌ Token mint error:', e.message || e)
    return res.status(500).json({ error: 'mint_failed', details: e.message })
  }
})

tokenRouter.get('/api/holdings', async (_req: Request, res: Response) => {
  try {
    const rows = await prisma.holding.findMany({ include: { property: true, user: true }, orderBy: { id: 'asc' } })
    const data = rows.map(r => ({
      id: r.id,
      user: { id: r.userId, email: r.user.email },
      property: { id: r.propertyId, name: r.property.title, tokenPrice: r.property.tokenPrice },
      tokens: r.tokens,
      value: (r.tokens || 0) * (r.property.tokenPrice || 0),
      createdAt: r.createdAt,
    }))
    return res.json(data)
  } catch (e) {
    return res.status(500).json({ error: 'failed_to_list_holdings' })
  }
})

export default tokenRouter
