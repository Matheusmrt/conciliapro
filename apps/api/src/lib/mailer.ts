import nodemailer from 'nodemailer'

export function criarTransporter() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT ?? 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    // Modo preview — usa Ethereal em dev
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })
}

export async function enviarEmail(para: string | undefined | null, assunto: string, html: string) {
  const transporter = criarTransporter()
  if (!transporter) {
    console.log(`[mailer] SMTP não configurado. E-mail para ${para}: ${assunto}`)
    return { ok: false, motivo: 'SMTP não configurado' }
  }

  const destino = para || process.env.SMTP_NOTIF_PARA || process.env.SMTP_USER
  if (!destino) return { ok: false, motivo: 'Nenhum destinatário configurado' }

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER
  await transporter.sendMail({ from, to: destino, subject: assunto, html })
  return { ok: true }
}

export function htmlAlertaDivergencias(empresa: string, divergencias: any[]) {
  const linhas = divergencias.map(d => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${d.tipo}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${d.adquirente ?? '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">
        R$ ${(Number(d.valorImpacto) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </td>
    </tr>`).join('')

  return `
  <!DOCTYPE html>
  <html>
  <body style="font-family:system-ui,sans-serif;color:#1e293b;background:#f8fafc;margin:0;padding:0">
    <div style="max-width:560px;margin:32px auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:#1e40af;padding:24px 28px">
        <h1 style="color:white;margin:0;font-size:18px">ConciliaPro</h1>
        <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px">${empresa}</p>
      </div>
      <div style="padding:28px">
        <h2 style="font-size:16px;margin:0 0 8px;color:#dc2626">⚠ Divergências em aberto</h2>
        <p style="color:#64748b;font-size:14px;margin:0 0 20px">
          ${divergencias.length} divergência${divergencias.length !== 1 ? 's' : ''} precisam de atenção.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#f8fafc">
              <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0">Tipo</th>
              <th style="padding:8px 12px;text-align:left;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0">Adquirente</th>
              <th style="padding:8px 12px;text-align:right;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0">Impacto</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
        <div style="margin-top:24px">
          <a href="${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/divergencias"
            style="display:inline-block;background:#1e40af;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
            Ver no ConciliaPro →
          </a>
        </div>
      </div>
      <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0">
        <p style="margin:0;font-size:11px;color:#94a3b8">Enviado automaticamente pelo ConciliaPro</p>
      </div>
    </div>
  </body>
  </html>`
}

export function htmlRelatorioDiario(empresa: string, data: any) {
  const fmt = (v: number) => `R$ ${(v / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

  return `
  <!DOCTYPE html>
  <html>
  <body style="font-family:system-ui,sans-serif;color:#1e293b;background:#f8fafc;margin:0;padding:0">
    <div style="max-width:560px;margin:32px auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:#1e40af;padding:24px 28px">
        <h1 style="color:white;margin:0;font-size:18px">ConciliaPro — Resumo Diário</h1>
        <p style="color:#bfdbfe;margin:4px 0 0;font-size:13px">${empresa} · ${new Date().toLocaleDateString('pt-BR')}</p>
      </div>
      <div style="padding:28px">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px">
          <div style="background:#f0fdf4;border-radius:8px;padding:12px;text-align:center">
            <div style="font-size:11px;color:#16a34a;font-weight:600;text-transform:uppercase">Taxa</div>
            <div style="font-size:24px;font-weight:800;color:#15803d">${data.taxaConciliacao}%</div>
          </div>
          <div style="background:#fef2f2;border-radius:8px;padding:12px;text-align:center">
            <div style="font-size:11px;color:#dc2626;font-weight:600;text-transform:uppercase">Divergências</div>
            <div style="font-size:24px;font-weight:800;color:#b91c1c">${data.divergenciasAbertas}</div>
          </div>
          <div style="background:#fff7ed;border-radius:8px;padding:12px;text-align:center">
            <div style="font-size:11px;color:#ea580c;font-weight:600;text-transform:uppercase">Sem Repasse</div>
            <div style="font-size:24px;font-weight:800;color:#c2410c">${data.semRepasse}</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <tr style="border-bottom:1px solid #f0f0f0">
            <td style="padding:8px 0;color:#64748b">Total de vendas</td>
            <td style="padding:8px 0;text-align:right;font-weight:600">${data.totalVendas}</td>
          </tr>
          <tr style="border-bottom:1px solid #f0f0f0">
            <td style="padding:8px 0;color:#64748b">Conciliadas</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#16a34a">${data.conciliadas}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b">Valor em divergência</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#dc2626">${fmt(Number(data.valorEmDivergencia ?? 0))}</td>
          </tr>
        </table>
        <div style="margin-top:24px">
          <a href="${process.env.FRONTEND_URL ?? 'http://localhost:3000'}"
            style="display:inline-block;background:#1e40af;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
            Abrir Dashboard →
          </a>
        </div>
      </div>
      <div style="padding:16px 28px;background:#f8fafc;border-top:1px solid #e2e8f0">
        <p style="margin:0;font-size:11px;color:#94a3b8">Enviado automaticamente pelo ConciliaPro</p>
      </div>
    </div>
  </body>
  </html>`
}
