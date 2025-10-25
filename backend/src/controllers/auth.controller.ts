import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { Role } from '@prisma/client'
import prisma from '../lib/prisma'
export const authRouter = Router()

function signToken(user: { id: number; email: string; role: Role }) {
  const secret = process.env.JWT_SECRET || 'devsecret'
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, secret, { expiresIn: '7d' })
}

// POST /api/auth/login
authRouter.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const email = String(req.body?.email || '').toLowerCase().trim()
    if (!email) return res.status(400).json({ error: 'email_required' })

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, role: Role.INVESTOR },
    })

    const token = signToken(user as any)
    return res.json({ token, user: { id: user.id, email: user.email, role: user.role } })
  } catch (e) {
    return res.status(500).json({ error: 'login_failed' })
  }
})

export default authRouter
