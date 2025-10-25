import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthedRequest extends Request {
  user?: any
}

export function auth(required: boolean = true) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const h = String(req.headers.authorization || '')
    const token = h.startsWith('Bearer ') ? h.slice(7) : ''
    if (!token) {
      return required ? res.status(401).json({ error: 'unauthorized' }) : next()
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret')
      req.user = payload
      return next()
    } catch {
      return required ? res.status(401).json({ error: 'unauthorized' }) : next()
    }
  }
}

export default auth
