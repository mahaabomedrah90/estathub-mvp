import AWS from 'aws-sdk'

// إعداد AWS SES
const ses = new AWS.SES({
  region: process.env.AWS_REGION || 'eu-central-1'
})

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
