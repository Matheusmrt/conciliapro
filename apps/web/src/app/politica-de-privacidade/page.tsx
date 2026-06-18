import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidade — ConciliaPro',
  description: 'Política de Privacidade e tratamento de dados pessoais conforme a LGPD (Lei 13.709/2018)',
}

export default function PoliticaPrivacidadePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/login" className="text-xl font-bold text-blue-600">
            Concilia<span className="text-gray-900">Pro</span>
          </Link>
          <span className="text-xs text-gray-400">Última atualização: 17 de junho de 2026</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Política de Privacidade</h1>
        <p className="text-gray-500 mb-10">Em conformidade com a Lei Geral de Proteção de Dados Pessoais — LGPD (Lei nº 13.709/2018)</p>

        <div className="space-y-10 text-gray-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Controlador dos Dados</h2>
            <p>
              O <strong>ConciliaPro</strong> é operado por <strong>JD Fernandes e Filhos Ltda</strong>, CNPJ 01.325.134/0001-45,
              doravante denominado "Controlador", responsável pelo tratamento dos dados pessoais coletados nesta plataforma.
            </p>
            <p className="mt-2">
              Contato do encarregado (DPO): <a href="mailto:privacidade@conciliapro.com.br" className="text-blue-600 hover:underline">privacidade@conciliapro.com.br</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Dados Coletados</h2>
            <p className="mb-2">Coletamos os seguintes dados pessoais para operação da plataforma:</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700">Dado</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700">Finalidade</th>
                    <th className="text-left px-4 py-2 font-semibold text-gray-700">Base Legal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['Nome completo', 'Identificação do usuário no sistema', 'Execução de contrato'],
                    ['Endereço de e-mail', 'Login, notificações e recuperação de senha', 'Execução de contrato'],
                    ['CNPJ da empresa', 'Identificação do estabelecimento comercial', 'Execução de contrato'],
                    ['Dados de transações financeiras', 'Conciliação de cartões e relatórios', 'Execução de contrato'],
                    ['Endereço IP e logs de acesso', 'Segurança, auditoria e prevenção a fraudes', 'Legítimo interesse'],
                    ['Cookies de sessão', 'Manter o usuário autenticado', 'Consentimento'],
                  ].map(([dado, fin, base]) => (
                    <tr key={dado}>
                      <td className="px-4 py-2 font-medium text-gray-800">{dado}</td>
                      <td className="px-4 py-2 text-gray-600">{fin}</td>
                      <td className="px-4 py-2 text-gray-600">{base}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Como Usamos seus Dados</h2>
            <ul className="space-y-2 list-none">
              {[
                'Autenticação e controle de acesso ao sistema',
                'Processamento e conciliação de transações com adquirentes (Cielo, Rede, Stone etc.)',
                'Envio de notificações, alertas e relatórios por e-mail',
                'Recuperação de senha via link temporário',
                'Auditoria de acessos e segurança da plataforma',
                'Cumprimento de obrigações legais e regulatórias',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Compartilhamento de Dados</h2>
            <p className="mb-3">Seus dados podem ser compartilhados com os seguintes terceiros, estritamente para operação do serviço:</p>
            <ul className="space-y-2">
              {[
                ['Adquirentes (Cielo, Rede, Stone, GetNet etc.)', 'Coleta de dados de transações via API autorizada pelo próprio cliente'],
                ['Pluggy (Open Finance)', 'Intermediário de conexão com instituições financeiras'],
                ['Render.com', 'Infraestrutura de hospedagem (servidores nos EUA — transferência internacional coberta por cláusulas contratuais padrão)'],
                ['Cloudflare R2', 'Armazenamento de documentos fiscais enviados pelo operador'],
                ['Locaweb', 'Envio de e-mails transacionais via SMTP'],
              ].map(([empresa, desc]) => (
                <li key={empresa} className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                  <p className="font-medium text-gray-800">{empresa}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-gray-600">Não vendemos, alugamos ou compartilhamos dados pessoais com terceiros para fins de marketing.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Retenção de Dados</h2>
            <p>
              Os dados são mantidos enquanto o contrato de prestação de serviço estiver ativo. Após o encerramento,
              os dados são retidos por <strong>5 anos</strong> para cumprimento de obrigações legais (Código Civil,
              legislação fiscal e trabalhista), sendo então excluídos permanentemente ou anonimizados.
            </p>
            <p className="mt-2">
              Tokens de recuperação de senha são excluídos automaticamente após <strong>2 horas</strong> de inatividade.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Segurança dos Dados</h2>
            <ul className="space-y-2">
              {[
                'Senhas armazenadas com hash SHA-256 + SALT — nunca em texto plano',
                'Comunicação criptografada via HTTPS/TLS em todos os endpoints',
                'Autenticação por token JWT com expiração de 8 horas',
                'Isolamento de dados por empresa (multi-tenant) — cada cliente acessa apenas seus próprios dados',
                'Logs de acesso e auditoria para rastreamento de operações',
                'Backups automáticos do banco de dados realizados pela infraestrutura de hospedagem',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 w-2 h-2 rounded-full bg-green-600 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Direitos do Titular (Art. 18 da LGPD)</h2>
            <p className="mb-3">Você tem os seguintes direitos sobre seus dados pessoais:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ['Confirmação e Acesso', 'Confirmar se tratamos seus dados e acessar uma cópia'],
                ['Correção', 'Corrigir dados incompletos, inexatos ou desatualizados'],
                ['Anonimização / Exclusão', 'Solicitar anonimização ou exclusão de dados desnecessários'],
                ['Portabilidade', 'Receber seus dados em formato estruturado para outro fornecedor'],
                ['Revogação do Consentimento', 'Revogar consentimentos dados anteriormente'],
                ['Oposição', 'Se opor ao tratamento realizado com base em legítimo interesse'],
              ].map(([dir, desc]) => (
                <div key={dir} className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                  <p className="font-semibold text-blue-800 text-xs">{dir}</p>
                  <p className="text-blue-700 text-xs mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-4">
              Para exercer seus direitos, envie solicitação para{' '}
              <a href="mailto:privacidade@conciliapro.com.br" className="text-blue-600 hover:underline">
                privacidade@conciliapro.com.br
              </a>
              . Responderemos em até <strong>15 dias úteis</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Cookies</h2>
            <p>Utilizamos apenas cookies estritamente necessários para operação do sistema:</p>
            <ul className="mt-2 space-y-1">
              <li><strong>Token JWT</strong> (localStorage): mantém a sessão autenticada por até 8 horas.</li>
              <li><strong>Preferências de interface</strong> (localStorage): tema, filtros selecionados.</li>
            </ul>
            <p className="mt-2">Não utilizamos cookies de rastreamento, publicidade ou analytics de terceiros.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Alterações nesta Política</h2>
            <p>
              Esta política pode ser atualizada periodicamente. Notificaremos usuários sobre alterações relevantes
              por e-mail com antecedência mínima de 15 dias. O uso continuado da plataforma após as alterações
              implica aceitação da nova versão.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Contato e Autoridade</h2>
            <p>
              Para dúvidas sobre esta política:{' '}
              <a href="mailto:privacidade@conciliapro.com.br" className="text-blue-600 hover:underline">
                privacidade@conciliapro.com.br
              </a>
            </p>
            <p className="mt-2">
              Você também pode peticionar à <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong>:{' '}
              <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                www.gov.br/anpd
              </a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">ConciliaPro © 2026 — JD Fernandes e Filhos Ltda — CNPJ 01.325.134/0001-45</p>
          <div className="flex gap-4 text-xs">
            <Link href="/termos-de-uso" className="text-blue-600 hover:underline">Termos de Uso</Link>
            <Link href="/login" className="text-gray-400 hover:underline">Voltar ao login</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
