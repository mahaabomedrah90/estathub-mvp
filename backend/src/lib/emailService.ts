import AWS from 'aws-sdk'
import { PrismaClient } from '@prisma/client'

// إعداد AWS SES
const ses = new AWS.SES({
  region: process.env.AWS_REGION || 'eu-central-1'
})

export async function getAdminEmail(prisma?: PrismaClient): Promise<string> {
  if (process.env.ADMIN_EMAIL) return process.env.ADMIN_EMAIL
  if (prisma) {
    try {
      const setting = await prisma.settings.findUnique({ where: { key: 'adminEmail' } })
      if (setting?.value) return setting.value
    } catch {
      // fall through to default
    }
  }
  return 'admin@alwsm.sa'
}

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const params = {
      Destination: {
        ToAddresses: [options.to]
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: options.html
          },
          Text: {
            Charset: 'UTF-8',
            Data: options.text || options.html.replace(/<[^>]*>/g, '')
          }
        },
        Subject: {
          Charset: 'UTF-8',
          Data: options.subject
        }
      },
      Source: process.env.EMAIL_FROM || 'noreply@alwsm.sa'
    }

    await ses.sendEmail(params).promise()
    console.log('✅ Email sent successfully to:', options.to)
    return true
  } catch (error: any) {
    console.error('❌ Failed to send email:', error.message)
    return false
  }
}

export function buildPasswordResetEmail(resetLink: string, isRTL: boolean = false): {
  subject: string
  html: string
  text: string
} {
  const subject = 'Reset your password - ALWSM'
  
  const html = `
    <!DOCTYPE html>
    <html dir="${isRTL ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        .security-note { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isRTL ? 'الوسم' : 'ALWSM'}</h1>
          <p>${isRTL ? 'منصة استثمار عقاري' : 'Real Estate Investment Platform'}</p>
        </div>
        
        <div class="content">
          <h2>${isRTL ? 'إعادة تعيين كلمة المرور' : 'Password Reset'}</h2>
          
          <p>${isRTL 
            ? 'لقد تلقيت هذا الطلب لأنك (أو شخص آخر) طلبت إعادة تعيين كلمة المرور لحسابك.'
            : 'You received this request because you (or someone else) requested a password reset for your account.'
          }</p>
          
          <div class="security-note">
            <strong>${isRTL ? 'ملاحظة أمنية:' : 'Security Note:'}</strong>
            ${isRTL 
              ? 'هذا الرابط صالح لمدة 30 دقيقة فقط. إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا الإيميل.'
              : 'This link is valid for 30 minutes only. If you didn\'t request a password reset, please ignore this email.'
            }
          </div>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">
              ${isRTL ? 'إعادة تعيين كلمة المرور' : 'Reset Password'}
            </a>
          </div>
          
          <p style="text-align: center; color: #666; font-size: 14px;">
            ${isRTL ? 'أو انسخ والصق الرابط التالي:' : 'Or copy and paste this link:'}<br>
            <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px; word-break: break-all;">
              ${resetLink}
            </code>
          </p>
        </div>
        
        <div class="footer">
          <p>${isRTL ? '© 2025 الوسم. جميع الحقوق محفوظة.' : '© 2025 ALWSM. All rights reserved.'}</p>
          <p>${isRTL ? 'هذا إيميل تلقائي، لا ترد عليه.' : 'This is an automated email, please do not reply.'}</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = isRTL
    ? `إعادة تعيين كلمة المرور - الوسم\n\nلقد طلبت إعادة تعيين كلمة المرور. اضغط على الرابط التالي:\n${resetLink}\n\nهذا الرابط صالح لمدة 30 دقيقة فقط.`
    : `Password Reset - ALWSM\n\nYou requested a password reset. Click the link below:\n${resetLink}\n\nThis link is valid for 30 minutes only.`

  return { subject, html, text }
}

export function buildDepositRequestAdminEmail(data: {
  userName: string
  userEmail: string
  amount: number
  bankReference?: string
  requestId: string
  createdAt: Date
}): { subject: string; html: string; text: string } {
  const subject = 'طلب إيداع جديد في منصة الوسم'
  const formattedDate = data.createdAt.toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })
  const amountFormatted = data.amount.toLocaleString('ar-SA')

  const html = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1E1958; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .field { margin: 12px 0; }
        .label { font-weight: bold; color: #555; }
        .value { color: #1E1958; font-size: 16px; }
        .amount { color: #41EAD4; font-size: 20px; font-weight: bold; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        .alert { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>منصة الوسم</h1>
          <p>إشعار طلب إيداع جديد</p>
        </div>
        <div class="content">
          <h2>طلب إيداع جديد بانتظار المراجعة</h2>
          <div class="field"><span class="label">اسم المستخدم: </span><span class="value">${data.userName}</span></div>
          <div class="field"><span class="label">البريد الإلكتروني: </span><span class="value">${data.userEmail}</span></div>
          <div class="field"><span class="label">المبلغ المطلوب إيداعه: </span><span class="amount">${amountFormatted} ريال سعودي</span></div>
          ${data.bankReference ? `<div class="field"><span class="label">رقم المرجع البنكي: </span><span class="value">${data.bankReference}</span></div>` : ''}
          <div class="field"><span class="label">رقم الطلب: </span><span class="value">${data.requestId}</span></div>
          <div class="field"><span class="label">وقت الطلب: </span><span class="value">${formattedDate}</span></div>
          <div class="alert">
            <strong>تذكير:</strong> يرجى التحقق من التحويل البنكي قبل الموافقة على الطلب.
            لا تقم بالموافقة حتى تتأكد من استلام المبلغ فعلياً.
          </div>
        </div>
        <div class="footer">
          <p>© 2025 الوسم. هذا إيميل تلقائي، لا ترد عليه.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `طلب إيداع جديد في منصة الوسم\n\nالمستخدم: ${data.userName}\nالبريد: ${data.userEmail}\nالمبلغ: ${amountFormatted} ريال\n${data.bankReference ? `المرجع البنكي: ${data.bankReference}\n` : ''}رقم الطلب: ${data.requestId}\nالوقت: ${formattedDate}\n\nيرجى التحقق من التحويل قبل الموافقة.`

  return { subject, html, text }
}

export function buildDepositApprovedEmail(data: {
  userName: string
  amount: number
  newBalance: number
  requestId: string
}): { subject: string; html: string; text: string } {
  const subject = 'تمت الموافقة على طلب الإيداع / Deposit Request Approved'
  const amountFormatted = data.amount.toLocaleString('ar-SA')
  const balanceFormatted = data.newBalance.toLocaleString('ar-SA')

  const html = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1E1958; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .field { margin: 12px 0; }
        .label { font-weight: bold; color: #555; }
        .value { color: #1E1958; font-size: 16px; }
        .amount { color: #16a34a; font-size: 20px; font-weight: bold; }
        .success { background: #dcfce7; border: 1px solid #16a34a; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>منصة الوسم</h1>
          <p>إشعار الموافقة على الإيداع</p>
        </div>
        <div class="content">
          <h2>مرحباً ${data.userName}،</h2>
          <div class="success">
            <strong>تمت الموافقة على طلب الإيداع الخاص بك!</strong>
          </div>
          <div class="field"><span class="label">المبلغ المُودَع: </span><span class="amount">${amountFormatted} ريال سعودي</span></div>
          <div class="field"><span class="label">الرصيد الحالي: </span><span class="value">${balanceFormatted} ريال سعودي</span></div>
          <div class="field"><span class="label">رقم الطلب: </span><span class="value">${data.requestId}</span></div>
          <p>يمكنك الآن استخدام رصيدك للاستثمار في العقارات المتاحة على منصة الوسم.</p>
        </div>
        <div class="footer">
          <p>© 2025 الوسم. هذا إيميل تلقائي، لا ترد عليه.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `تمت الموافقة على طلب الإيداع\n\nمرحباً ${data.userName}،\n\nتمت الموافقة على طلب الإيداع الخاص بك.\nالمبلغ المُودَع: ${amountFormatted} ريال\nالرصيد الحالي: ${balanceFormatted} ريال\nرقم الطلب: ${data.requestId}`

  return { subject, html, text }
}

export function buildDepositRejectedEmail(data: {
  userName: string
  amount: number
  requestId: string
  adminNote?: string
}): { subject: string; html: string; text: string } {
  const subject = 'تم رفض طلب الإيداع / Deposit Request Rejected'
  const amountFormatted = data.amount.toLocaleString('ar-SA')

  const html = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1E1958; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .field { margin: 12px 0; }
        .label { font-weight: bold; color: #555; }
        .value { color: #1E1958; font-size: 16px; }
        .reject { background: #fee2e2; border: 1px solid #dc2626; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>منصة الوسم</h1>
          <p>إشعار رفض طلب الإيداع</p>
        </div>
        <div class="content">
          <h2>مرحباً ${data.userName}،</h2>
          <div class="reject">
            <strong>للأسف، تم رفض طلب الإيداع الخاص بك.</strong>
          </div>
          <div class="field"><span class="label">المبلغ المطلوب: </span><span class="value">${amountFormatted} ريال سعودي</span></div>
          <div class="field"><span class="label">رقم الطلب: </span><span class="value">${data.requestId}</span></div>
          ${data.adminNote ? `<div class="field"><span class="label">السبب: </span><span class="value">${data.adminNote}</span></div>` : ''}
          <p>إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع فريق الدعم وتزويدنا برقم الطلب.</p>
        </div>
        <div class="footer">
          <p>© 2025 الوسم. هذا إيميل تلقائي، لا ترد عليه.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `تم رفض طلب الإيداع\n\nمرحباً ${data.userName}،\n\nللأسف تم رفض طلب الإيداع.\nالمبلغ: ${amountFormatted} ريال\nرقم الطلب: ${data.requestId}${data.adminNote ? `\nالسبب: ${data.adminNote}` : ''}`

  return { subject, html, text }
}

export function buildVerificationEmail(verifyLink: string, isRTL: boolean = false): {
  subject: string
  html: string
  text: string
} {
  const subject = isRTL
    ? 'تأكيد بريدك الإلكتروني - الوسم'
    : 'Verify your email address - ALWSM'

  const html = `
    <!DOCTYPE html>
    <html dir="${isRTL ? 'rtl' : 'ltr'}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1E1958; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #41EAD4; color: #1E1958; padding: 14px 34px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        .info { background: #e0f2fe; border: 1px solid #0284c7; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isRTL ? 'الوسم' : 'ALWSM'}</h1>
          <p>${isRTL ? 'منصة استثمار عقاري' : 'Real Estate Investment Platform'}</p>
        </div>
        <div class="content">
          <h2>${isRTL ? 'تأكيد البريد الإلكتروني' : 'Verify Your Email'}</h2>
          <p>${isRTL
            ? 'شكراً لتسجيلك في منصة الوسم. اضغط على الزر أدناه لتأكيد بريدك الإلكتروني وتفعيل حسابك.'
            : 'Thank you for registering with ALWSM. Click the button below to verify your email and activate your account.'
          }</p>
          <div class="info">
            <strong>${isRTL ? 'ملاحظة:' : 'Note:'}</strong>
            ${isRTL
              ? 'هذا الرابط صالح لمدة 24 ساعة. إذا لم تقم بالتسجيل، يرجى تجاهل هذا الإيميل.'
              : 'This link is valid for 24 hours. If you did not register, please ignore this email.'
            }
          </div>
          <div style="text-align: center;">
            <a href="${verifyLink}" class="button">
              ${isRTL ? 'تأكيد البريد الإلكتروني' : 'Verify Email Address'}
            </a>
          </div>
          <p style="text-align: center; color: #666; font-size: 14px;">
            ${isRTL ? 'أو انسخ والصق الرابط التالي:' : 'Or copy and paste this link:'}<br>
            <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px; word-break: break-all;">
              ${verifyLink}
            </code>
          </p>
        </div>
        <div class="footer">
          <p>${isRTL ? '© 2025 الوسم. جميع الحقوق محفوظة.' : '© 2025 ALWSM. All rights reserved.'}</p>
          <p>${isRTL ? 'هذا إيميل تلقائي، لا ترد عليه.' : 'This is an automated email, please do not reply.'}</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = isRTL
    ? `تأكيد البريد الإلكتروني - الوسم\n\nاضغط على الرابط أدناه لتأكيد بريدك الإلكتروني:\n${verifyLink}\n\nهذا الرابط صالح لمدة 24 ساعة.`
    : `Verify Your Email - ALWSM\n\nClick the link below to verify your email address:\n${verifyLink}\n\nThis link is valid for 24 hours.`

  return { subject, html, text }
}

export function maskIban(iban: string): string {
  const clean = iban.replace(/\s+/g, '')
  if (clean.length < 8) return '****'
  return `${clean.slice(0, 4)} **** **** **** **** ${clean.slice(-4)}`
}

export function buildWithdrawalApprovedEmail(data: {
  userName: string
  amount: number
  requestId: string
  bankName?: string
  ibanMasked?: string
  newBalance: number
  approvedAt: Date
}): { subject: string; html: string; text: string } {
  const subject = 'تم تنفيذ طلب السحب'
  const formattedDate = data.approvedAt.toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })
  const amountFormatted  = data.amount.toLocaleString('ar-SA')
  const balanceFormatted = data.newBalance.toLocaleString('ar-SA')

  const html = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1E1958; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .field { margin: 12px 0; }
        .label { font-weight: bold; color: #555; }
        .value { color: #1E1958; font-size: 16px; }
        .amount { color: #dc2626; font-size: 20px; font-weight: bold; }
        .balance { color: #16a34a; font-size: 16px; font-weight: bold; }
        .success { background: #dcfce7; border: 1px solid #16a34a; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .note { background: #fef9c3; border: 1px solid #ca8a04; padding: 12px 15px; border-radius: 6px; margin: 20px 0; font-size: 13px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>منصة الوسم</h1>
          <p>إشعار تنفيذ طلب السحب</p>
        </div>
        <div class="content">
          <h2>مرحباً ${data.userName}،</h2>
          <div class="success">
            <strong>تم تنفيذ طلب السحب الخاص بك بنجاح.</strong><br>
            تم تحويل مبلغ السحب من منصة الوسم إلى حسابك البنكي.
          </div>
          <div class="field"><span class="label">المبلغ المحوّل: </span><span class="amount">${amountFormatted} ريال سعودي</span></div>
          ${data.bankName ? `<div class="field"><span class="label">البنك: </span><span class="value">${data.bankName}</span></div>` : ''}
          ${data.ibanMasked ? `<div class="field"><span class="label">رقم الآيبان: </span><span class="value" style="font-family:monospace">${data.ibanMasked}</span></div>` : ''}
          <div class="field"><span class="label">رقم الطلب: </span><span class="value">${data.requestId}</span></div>
          <div class="field"><span class="label">تاريخ التنفيذ: </span><span class="value">${formattedDate}</span></div>
          <div class="field"><span class="label">الرصيد المتبقي في المحفظة: </span><span class="balance">${balanceFormatted} ريال سعودي</span></div>
          <div class="note">
            إذا لم يظهر المبلغ في حسابك البنكي خلال المدة المعتادة، يرجى التواصل مع البنك أو فريق الدعم مع الإشارة إلى رقم الطلب.
          </div>
        </div>
        <div class="footer">
          <p>© 2025 الوسم. هذا إيميل تلقائي، لا ترد عليه.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = [
    'تم تنفيذ طلب السحب - الوسم',
    '',
    `مرحباً ${data.userName}،`,
    'تم تنفيذ طلب السحب الخاص بك وتحويل المبلغ إلى حسابك البنكي.',
    '',
    `المبلغ المحوّل: ${amountFormatted} ريال سعودي`,
    data.bankName  ? `البنك: ${data.bankName}` : '',
    data.ibanMasked ? `رقم الآيبان: ${data.ibanMasked}` : '',
    `رقم الطلب: ${data.requestId}`,
    `تاريخ التنفيذ: ${formattedDate}`,
    `الرصيد المتبقي: ${balanceFormatted} ريال سعودي`,
    '',
    'إذا لم يظهر المبلغ في حسابك البنكي خلال المدة المعتادة، يرجى التواصل مع البنك أو فريق الدعم.',
  ].filter(Boolean).join('\n')

  return { subject, html, text }
}

export function buildAdminWithdrawalRequestEmail(data: {
  investorName: string
  investorEmail: string
  investorPhone?: string
  amount: number
  requestId: string
  customerIbanMasked?: string
  customerBankName?: string
  createdAt: Date
}): { subject: string; html: string; text: string } {
  const subject = 'طلب سحب جديد يحتاج مراجعة'
  const formattedDate = data.createdAt.toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })
  const amountFormatted = data.amount.toLocaleString('ar-SA')

  const html = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1E1958; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .field { margin: 12px 0; }
        .label { font-weight: bold; color: #555; }
        .value { color: #1E1958; font-size: 16px; }
        .amount { color: #dc2626; font-size: 20px; font-weight: bold; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
        .alert { background: #fee2e2; border: 1px solid #dc2626; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .btn { display: inline-block; background: #1E1958; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; margin-top: 16px; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>منصة الوسم</h1>
          <p>إشعار طلب سحب جديد</p>
        </div>
        <div class="content">
          <h2>طلب سحب جديد يحتاج مراجعة</h2>
          <p>تم إنشاء طلب سحب جديد من أحد المستثمرين ويحتاج إلى مراجعة الإدارة.</p>
          <div class="field"><span class="label">اسم المستثمر: </span><span class="value">${data.investorName}</span></div>
          <div class="field"><span class="label">البريد الإلكتروني: </span><span class="value">${data.investorEmail}</span></div>
          ${data.investorPhone ? `<div class="field"><span class="label">رقم الجوال: </span><span class="value">${data.investorPhone}</span></div>` : ''}
          <div class="field"><span class="label">المبلغ المطلوب سحبه: </span><span class="amount">${amountFormatted} ريال سعودي</span></div>
          <div class="field"><span class="label">رقم الطلب: </span><span class="value">${data.requestId}</span></div>
          ${data.customerBankName ? `<div class="field"><span class="label">البنك: </span><span class="value">${data.customerBankName}</span></div>` : ''}
          ${data.customerIbanMasked ? `<div class="field"><span class="label">رقم الآيبان: </span><span class="value" style="font-family:monospace">${data.customerIbanMasked}</span></div>` : ''}
          <div class="field"><span class="label">وقت الطلب: </span><span class="value">${formattedDate}</span></div>
          <div class="alert">
            <strong>تنبيه:</strong> يرجى مراجعة الطلب والتحقق من بيانات الحساب البنكي قبل الموافقة على صرف المبلغ.
          </div>
          <div style="text-align: center;">
            <a href="https://www.alwsm.sa/admin/withdrawals" class="btn">مراجعة طلبات السحب</a>
          </div>
        </div>
        <div class="footer">
          <p>© 2025 الوسم. هذا إيميل تلقائي، لا ترد عليه.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = [
    'طلب سحب جديد يحتاج مراجعة - الوسم',
    '',
    'تم إنشاء طلب سحب جديد من أحد المستثمرين ويحتاج إلى مراجعة الإدارة.',
    '',
    `اسم المستثمر: ${data.investorName}`,
    `البريد الإلكتروني: ${data.investorEmail}`,
    data.investorPhone ? `رقم الجوال: ${data.investorPhone}` : '',
    `المبلغ: ${amountFormatted} ريال سعودي`,
    `رقم الطلب: ${data.requestId}`,
    data.customerBankName ? `البنك: ${data.customerBankName}` : '',
    data.customerIbanMasked ? `الآيبان: ${data.customerIbanMasked}` : '',
    `وقت الطلب: ${formattedDate}`,
    '',
    'رابط المراجعة: https://www.alwsm.sa/admin/withdrawals',
  ].filter(Boolean).join('\n')

  return { subject, html, text }
}

export function buildWithdrawalRejectedEmail(data: {
  userName: string
  amount: number
  requestId: string
  adminNote?: string
  rejectedAt: Date
}): { subject: string; html: string; text: string } {
  const subject = 'تعذر تنفيذ طلب السحب'
  const formattedDate = data.rejectedAt.toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })
  const amountFormatted = data.amount.toLocaleString('ar-SA')
  const noteText = data.adminNote || 'لم يتم توضيح سبب الرفض. يرجى التواصل مع فريق الدعم.'

  const html = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1E1958; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .field { margin: 12px 0; }
        .label { font-weight: bold; color: #555; }
        .value { color: #1E1958; font-size: 16px; }
        .amount { color: #dc2626; font-size: 20px; font-weight: bold; }
        .reject { background: #fee2e2; border: 1px solid #dc2626; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .note { background: #fef9c3; border: 1px solid #ca8a04; padding: 12px 15px; border-radius: 6px; margin: 20px 0; font-size: 13px; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>منصة الوسم</h1>
          <p>إشعار بشأن طلب السحب</p>
        </div>
        <div class="content">
          <h2>مرحباً ${data.userName}،</h2>
          <div class="reject">
            <strong>تعذر تنفيذ طلب السحب الخاص بك من منصة الوسم.</strong>
          </div>
          <div class="field"><span class="label">المبلغ المطلوب: </span><span class="amount">${amountFormatted} ريال سعودي</span></div>
          <div class="field"><span class="label">رقم الطلب: </span><span class="value">${data.requestId}</span></div>
          <div class="field"><span class="label">تاريخ المراجعة: </span><span class="value">${formattedDate}</span></div>
          <div class="field"><span class="label">سبب الرفض: </span><span class="value">${noteText}</span></div>
          <div class="note">
            لم يتم خصم أي مبلغ من محفظتك. يمكنك إعادة تقديم طلب سحب جديد أو التواصل مع فريق الدعم مع الإشارة إلى رقم الطلب.
          </div>
        </div>
        <div class="footer">
          <p>© 2025 الوسم. هذا إيميل تلقائي، لا ترد عليه.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = [
    'تعذر تنفيذ طلب السحب - الوسم',
    '',
    `مرحباً ${data.userName}،`,
    'تعذر تنفيذ طلب السحب الخاص بك من منصة الوسم.',
    '',
    `المبلغ المطلوب: ${amountFormatted} ريال سعودي`,
    `رقم الطلب: ${data.requestId}`,
    `تاريخ المراجعة: ${formattedDate}`,
    `سبب الرفض: ${noteText}`,
    '',
    'لم يتم خصم أي مبلغ من محفظتك.',
  ].join('\n')

  return { subject, html, text }
}

export function buildNewUserAdminEmail(data: {
  userName: string
  userEmail: string
  role: string
  createdAt: Date
}): { subject: string; html: string; text: string } {
  const subject = 'مستخدم جديد سجّل في منصة الوسم'
  const formattedDate = data.createdAt.toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' })
  const roleLabel = data.role === 'INVESTOR' ? 'مستثمر' : data.role === 'OWNER' ? 'مالك عقار' : data.role

  const html = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1E1958; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .field { margin: 12px 0; }
        .label { font-weight: bold; color: #555; }
        .value { color: #1E1958; }
        .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>منصة الوسم</h1>
          <p>إشعار تسجيل مستخدم جديد</p>
        </div>
        <div class="content">
          <h2>مستخدم جديد انضم للمنصة</h2>
          <div class="field"><span class="label">الاسم: </span><span class="value">${data.userName}</span></div>
          <div class="field"><span class="label">البريد الإلكتروني: </span><span class="value">${data.userEmail}</span></div>
          <div class="field"><span class="label">نوع الحساب: </span><span class="value">${roleLabel}</span></div>
          <div class="field"><span class="label">وقت التسجيل: </span><span class="value">${formattedDate}</span></div>
        </div>
        <div class="footer">
          <p>© 2025 الوسم. هذا إيميل تلقائي، لا ترد عليه.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `مستخدم جديد في منصة الوسم\n\nالاسم: ${data.userName}\nالبريد: ${data.userEmail}\nنوع الحساب: ${roleLabel}\nوقت التسجيل: ${formattedDate}`

  return { subject, html, text }
}

// ── Owner Final Acceptance Gate (Phase 7e) ─────────────────────────────────────
// preparationFee is the owner-side onboarding charge from the locked fee snapshot.
// These emails NOTIFY only — they never confirm collection or recognize revenue.

const alwsmEmailShell = (title: string, inner: string): string => `
  <!DOCTYPE html>
  <html dir="rtl">
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.8; color: #333; direction: rtl; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1E1958; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .row { margin: 8px 0; }
        .label { color: #6b7280; }
        .button { display: inline-block; background: #1E1958; color: #fff; padding: 12px 22px; border-radius: 6px; text-decoration: none; margin: 18px 0; }
        .note { background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 6px; margin: 16px 0; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h2>منصة الوسم</h2></div>
        <div class="content">
          <h3>${title}</h3>
          ${inner}
        </div>
      </div>
    </body>
  </html>`

// Notify the OWNER that the admin has opened the final acceptance gate.
export function buildOwnerFinalAcceptanceRequestEmail(data: {
  ownerName?: string
  propertyName?: string
  preparationFee?: number
  finalAcceptanceUrl?: string
}): { subject: string; html: string; text: string } {
  const subject = 'مطلوب موافقتك النهائية على إدراج العقار'
  const name = data.ownerName?.trim() || 'عميلنا الكريم'
  const property = data.propertyName?.trim() || 'العقار'
  const fee = Number(data.preparationFee) || 0
  const feeLine = fee > 0
    ? `رسوم تجهيز العقار المطلوبة: <strong dir="ltr">${fee.toLocaleString('en-US')} ر.س</strong>`
    : 'لا توجد رسوم تجهيز مطلوبة لهذا الطلب.'
  const url = data.finalAcceptanceUrl || ''

  const inner = `
    <p class="row">مرحبًا ${name}،</p>
    <p class="row">أصبحت بيانات إدراج العقار <strong>${property}</strong> جاهزة لمراجعتك واعتمادك النهائي.</p>
    <p class="row">${feeLine}</p>
    ${url ? `<a href="${url}" class="button">مراجعة الاتفاقية والدفع</a>` : ''}
    <div class="note">صياغة الاتفاقية والإقرارات مسودة أولية خاضعة لإجراءات المنصة والمراجعة القانونية. هذا الإشعار لا يؤكد استلام أي مبلغ.</div>`

  const text = `مطلوب موافقتك النهائية على إدراج العقار\n\nمرحبًا ${name}،\nأصبحت بيانات إدراج العقار "${property}" جاهزة لمراجعتك واعتمادك النهائي.\n${fee > 0 ? `رسوم تجهيز العقار المطلوبة: ${fee.toLocaleString('en-US')} ر.س` : 'لا توجد رسوم تجهيز مطلوبة لهذا الطلب.'}\n${url ? `للمراجعة: ${url}` : ''}\n\nصياغة الاتفاقية مسودة خاضعة لإجراءات المنصة. هذا الإشعار لا يؤكد استلام أي مبلغ.`

  return { subject, html: alwsmEmailShell(subject, inner), text }
}

// Notify the ADMIN that the owner has submitted final acceptance.
export function buildAdminOwnerFinalAcceptedEmail(data: {
  propertyName?: string
  ownerName?: string
  preparationFee?: number
  paymentStatus?: string
  paymentReference?: string
  receiptKeyPresent?: boolean
  adminLeadUrl?: string
}): { subject: string; html: string; text: string } {
  const subject = 'موافقة نهائية جديدة من المالك'
  const property = data.propertyName?.trim() || 'غير محدد'
  const owner = data.ownerName?.trim() || 'غير محدد'
  const fee = Number(data.preparationFee) || 0
  const payLabel = data.paymentStatus === 'SUBMITTED' ? 'تم تقديم إثبات السداد'
    : data.paymentStatus === 'NOT_REQUIRED' ? 'غير مطلوب'
    : (data.paymentStatus || 'غير محدد')
  const url = data.adminLeadUrl || ''

  const inner = `
    <p class="row">قدّم المالك موافقته النهائية على إدراج العقار.</p>
    <div class="row"><span class="label">اسم العقار:</span> <strong>${property}</strong></div>
    <div class="row"><span class="label">المالك:</span> ${owner}</div>
    <div class="row"><span class="label">رسوم التجهيز:</span> <span dir="ltr">${fee.toLocaleString('en-US')} ر.س</span></div>
    <div class="row"><span class="label">حالة السداد:</span> ${payLabel}</div>
    ${data.paymentReference ? `<div class="row"><span class="label">مرجع التحويل:</span> ${data.paymentReference}</div>` : ''}
    <div class="row"><span class="label">إيصال السداد:</span> ${data.receiptKeyPresent ? 'مرفق' : 'غير مرفق'}</div>
    ${url ? `<a href="${url}" class="button">فتح الطلب في لوحة التحكم</a>` : ''}
    <div class="note">يرجى مراجعة الموافقة وإيصال السداد (إن وُجد) قبل الاعتماد النهائي. هذا الإشعار لا يؤكد تحصيل المبلغ فعليًا.</div>`

  const text = `موافقة نهائية جديدة من المالك\n\nاسم العقار: ${property}\nالمالك: ${owner}\nرسوم التجهيز: ${fee.toLocaleString('en-US')} ر.س\nحالة السداد: ${payLabel}\n${data.paymentReference ? `مرجع التحويل: ${data.paymentReference}\n` : ''}إيصال السداد: ${data.receiptKeyPresent ? 'مرفق' : 'غير مرفق'}\n${url ? `الرابط: ${url}\n` : ''}\nيرجى مراجعة الموافقة والإيصال قبل الاعتماد النهائي. هذا الإشعار لا يؤكد تحصيل المبلغ فعليًا.`

  return { subject, html: alwsmEmailShell(subject, inner), text }
}
