import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { sendEmail, getAdminEmail } from '../lib/emailService'

export const waitlistRouter = Router()

waitlistRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { contact, amount = '', language = 'en', source = 'home' } = req.body

    if (!contact || typeof contact !== 'string' || contact.trim().length === 0) {
      return res.status(400).json({ error: 'contact_required' })
    }

    const lead = await prisma.waitlistLead.create({
      data: {
        contact: contact.trim(),
        amount: String(amount),
        language: String(language),
        source: String(source),
      },
    })

    // Non-blocking admin notification — failure must not affect response
    const adminEmail = await getAdminEmail(prisma).catch(() => 'admin@alwsm.sa')
    sendEmail({
      to: adminEmail,
      subject: `New waitlist sign-up — ${source}`,
      html: `<p>New waitlist lead:</p><ul><li><b>Contact:</b> ${contact.trim()}</li><li><b>Amount:</b> ${amount || '—'}</li><li><b>Language:</b> ${language}</li><li><b>Source:</b> ${source}</li><li><b>Time:</b> ${new Date().toISOString()}</li></ul>`,
      text: `New waitlist lead\nContact: ${contact.trim()}\nAmount: ${amount || '—'}\nSource: ${source}`,
    }).catch((err) => {
      console.error('⚠️ Waitlist email notification failed (non-blocking):', err?.message)
    })

    return res.status(201).json({ success: true, id: lead.id })
  } catch (e: any) {
    console.error('❌ Waitlist lead save failed:', e?.message)
    return res.status(500).json({ error: 'waitlist_save_failed' })
  }
})
