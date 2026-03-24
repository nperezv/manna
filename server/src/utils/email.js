const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
})

const FROM = `Manna <${process.env.EMAIL_FROM || 'manna@perezterry.org'}>`
const APP_URL = process.env.APP_URL || 'http://localhost:5173'

const sendInvitation = async ({ to, name, familyName, invitedBy, token }) => {
  const link = `${APP_URL}/unirse?token=${token}`
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,sans-serif;background:#f5f5f0;margin:0;padding:20px}
    .c{max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)}
    .h{background:#0d0d0d;padding:32px;text-align:center}
    .lt{color:#e6ad3c;font-size:28px;font-weight:800;letter-spacing:-.04em}
    .b{padding:36px 32px}
    h1{font-size:22px;font-weight:700;color:#0d0d0d;margin:0 0 12px}
    p{font-size:15px;color:#555;line-height:1.7;margin:0 0 20px}
    .badge{background:#fdf3dc;border:1px solid #e6ad3c;border-radius:10px;padding:14px 18px;margin:0 0 24px}
    .bn{font-size:16px;font-weight:700;color:#0d0d0d}
    .bs{font-size:13px;color:#888;margin-top:2px}
    .btn{display:block;background:#e6ad3c;color:#fff;text-decoration:none;text-align:center;padding:16px;border-radius:12px;font-size:16px;font-weight:700;margin:0 0 16px}
    .lk{font-size:13px;color:#aaa;text-align:center;word-break:break-all}
    .f{background:#f9f9f7;padding:20px 32px;text-align:center;font-size:12px;color:#aaa;border-top:1px solid #eee}
  </style></head><body>
  <div class="c">
    <div class="h"><div class="lt">manna</div></div>
    <div class="b">
      <h1>Hola${name ? `, ${name}` : ''}! 👋</h1>
      <p><strong>${invitedBy}</strong> te ha invitado a gestionar las finanzas familiares en Manna.</p>
      <div class="badge">
        <div class="bn">Familia ${familyName}</div>
        <div class="bs">Invitación pendiente · Caduca en 7 días</div>
      </div>
      <a href="${link}" class="btn">Aceptar invitación →</a>
      <p class="lk">${link}</p>
    </div>
    <div class="f">Manna · Administra lo que se te confió<br>Si no esperabas esta invitación, ignora este email.</div>
  </div></body></html>`

  await transporter.sendMail({
    from: FROM,
    to: name ? `${name} <${to}>` : to,
    subject: `${invitedBy} te invita a Manna — Familia ${familyName}`,
    html,
  })
}

const sendWelcome = async ({ to, name, familyName }) => {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,sans-serif;background:#f5f5f0;margin:0;padding:20px}
    .c{max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden}
    .h{background:#0d0d0d;padding:32px;text-align:center}
    .lt{color:#e6ad3c;font-size:28px;font-weight:800;letter-spacing:-.04em}
    .b{padding:36px 32px}
    h1{font-size:22px;font-weight:700;color:#0d0d0d;margin:0 0 12px}
    p{font-size:15px;color:#555;line-height:1.7;margin:0 0 16px}
    .f{background:#f9f9f7;padding:20px;text-align:center;font-size:12px;color:#aaa;border-top:1px solid #eee}
  </style></head><body>
  <div class="c">
    <div class="h"><div class="lt">manna</div></div>
    <div class="b">
      <h1>Bienvenido a Manna, ${name}! ✦</h1>
      <p>La cuenta de <strong>Familia ${familyName}</strong> ha sido creada correctamente.</p>
      <p>Empieza registrando tus ingresos del mes para que Manna calcule automáticamente tu diezmo y ofrenda de ayuno.</p>
    </div>
    <div class="f">Manna · Administra lo que se te confió</div>
  </div></body></html>`

  await transporter.sendMail({
    from: FROM,
    to: `${name} <${to}>`,
    subject: `Bienvenido a Manna, ${name}! ✦`,
    html,
  })
}

module.exports = { sendInvitation, sendWelcome }
