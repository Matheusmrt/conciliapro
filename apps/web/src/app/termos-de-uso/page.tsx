import Link from 'next/link'

export const metadata = {
  title: 'Termos de Uso — ConciliaPro',
  description: 'Termos de Uso e Contrato de Licença de Usuário Final (EULA) do ConciliaPro',
}

export default function TermosDeUsoPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Termos de Uso</h1>
        <p className="text-gray-500 mb-2">Contrato de Licença de Usuário Final — EULA</p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-10 text-sm text-amber-800">
          <strong>Leia com atenção.</strong> Ao acessar ou utilizar o ConciliaPro, você declara que leu, compreendeu
          e concorda com estes Termos de Uso em sua totalidade.
        </div>

        <div className="space-y-10 text-gray-700 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">1. Partes do Contrato</h2>
            <p>
              Este contrato é celebrado entre o <strong>ConciliaPro</strong>, operado por{' '}
              <strong>JD Fernandes e Filhos Ltda</strong>, CNPJ 01.325.134/0001-45 (<strong>"Licenciante"</strong>),
              e a pessoa física ou jurídica que utiliza a plataforma (<strong>"Licenciado"</strong>).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">2. Objeto do Contrato</h2>
            <p>
              O ConciliaPro é uma plataforma SaaS (Software as a Service) de <strong>conciliação de cartões de
              crédito e débito</strong>, que oferece as seguintes funcionalidades principais:
            </p>
            <ul className="mt-3 space-y-1.5">
              {[
                'Conciliação automática de vendas com repasses de adquirentes',
                'Gestão e resolução de divergências financeiras',
                'Agenda e previsão de recebimentos',
                'Auditoria de taxas MDR contratadas vs. cobradas',
                'Importação de arquivos de adquirentes (Cielo, Rede, Stone, GetNet etc.)',
                'Exportação de dados para ERPs e sistemas contábeis',
                'Gestão de documentos fiscais (boletos e notas fiscais)',
                'Alertas e notificações automáticas por e-mail',
                'Relatórios gerenciais e de fluxo de caixa',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">3. Licença de Uso</h2>
            <p>
              O Licenciante concede ao Licenciado uma licença <strong>não exclusiva, intransferível e revogável</strong> para
              utilizar a plataforma exclusivamente para fins de gestão financeira do estabelecimento comercial cadastrado,
              durante o período de vigência do contrato de assinatura.
            </p>
            <div className="mt-4 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              <p className="font-semibold text-red-800 mb-1">É expressamente proibido:</p>
              <ul className="space-y-1 text-red-700">
                {[
                  'Copiar, modificar, distribuir ou revender o software',
                  'Realizar engenharia reversa ou tentar obter o código-fonte',
                  'Utilizar a plataforma para fins ilegais ou fraudulentos',
                  'Compartilhar credenciais de acesso com terceiros não autorizados',
                  'Realizar ataques, scraping ou sobrecarregar os servidores da plataforma',
                  'Utilizar a plataforma para processar dados de empresas não cadastradas',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 flex-shrink-0">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">4. Planos e Pagamento</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {[
                { plano: 'Básico', desc: 'Até 2 estabelecimentos, funcionalidades essenciais de conciliação' },
                { plano: 'Profissional', desc: 'Até 10 estabelecimentos, todas as funcionalidades, suporte prioritário' },
                { plano: 'Enterprise', desc: 'Estabelecimentos ilimitados, API pública, suporte dedicado' },
              ].map(p => (
                <div key={p.plano} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <p className="font-semibold text-gray-900">{p.plano}</p>
                  <p className="text-gray-500 text-xs mt-1">{p.desc}</p>
                </div>
              ))}
            </div>
            <ul className="space-y-2">
              {[
                'O período de trial gratuito é de 14 dias, sem necessidade de cartão de crédito',
                'Após o trial, a assinatura é cobrada mensalmente via cartão de crédito ou boleto',
                'O não pagamento após 5 dias de vencimento suspende o acesso ao sistema',
                'Após 30 dias de inadimplência, os dados podem ser excluídos permanentemente',
                'Cancelamentos devem ser solicitados com 30 dias de antecedência',
                'Não há reembolso por frações de mês já cobradas',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">5. Obrigações do Licenciado</h2>
            <ul className="space-y-2">
              {[
                'Fornecer dados cadastrais verdadeiros, completos e atualizados',
                'Manter a confidencialidade de suas credenciais de acesso',
                'Notificar imediatamente em caso de suspeita de acesso não autorizado',
                'Utilizar a plataforma em conformidade com a legislação vigente',
                'Garantir que os dados financeiros importados são de sua própria empresa',
                'Manter backups independentes de seus dados financeiros críticos',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">6. Disponibilidade e SLA</h2>
            <p>
              O Licenciante empreenderá esforços razoáveis para manter a plataforma disponível <strong>24 horas por dia,
              7 dias por semana</strong>, com meta de uptime de <strong>99,5% mensal</strong>, excluindo janelas de
              manutenção programada (comunicadas com 24h de antecedência).
            </p>
            <p className="mt-2 text-gray-500">
              O Licenciante não garante disponibilidade ininterrupta e não se responsabiliza por interrupções causadas
              por terceiros (provedores de nuvem, adquirentes, falhas de internet).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">7. Limitação de Responsabilidade</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-4 space-y-2">
              <p>O ConciliaPro é uma ferramenta de <strong>auxílio à conciliação</strong>. O Licenciante:</p>
              <ul className="space-y-1.5 mt-2">
                {[
                  'Não se responsabiliza por decisões financeiras tomadas com base nos dados do sistema',
                  'Não garante a exatidão de dados fornecidos pelas adquirentes via API',
                  'Não se responsabiliza por perdas decorrentes de divergências não identificadas',
                  'Limita sua responsabilidade ao valor pago nos últimos 3 meses de assinatura',
                  'Não se responsabiliza por danos indiretos, lucros cessantes ou danos emergentes',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-gray-600">
                    <span className="mt-1 flex-shrink-0 text-gray-400">–</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">8. Propriedade Intelectual</h2>
            <p>
              Todo o código-fonte, design, marca, logotipo, textos e demais elementos da plataforma são de
              propriedade exclusiva do Licenciante, protegidos pela Lei de Direitos Autorais (Lei nº 9.610/98)
              e demais legislações aplicáveis.
            </p>
            <p className="mt-2">
              Os dados financeiros inseridos pelo Licenciado permanecem de sua propriedade. O Licenciante
              não utilizará esses dados para fins que não sejam a operação do serviço contratado.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">9. Vigência e Rescisão</h2>
            <ul className="space-y-2">
              {[
                'Este contrato vigora enquanto o Licenciado mantiver uma assinatura ativa',
                'O Licenciado pode rescindir a qualquer momento pelo painel de configurações',
                'O Licenciante pode rescindir imediatamente em caso de violação destes termos',
                'Após rescisão, os dados ficam disponíveis para exportação por 30 dias',
                'Após 30 dias da rescisão, todos os dados são excluídos permanentemente',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">10. Alterações nos Termos</h2>
            <p>
              O Licenciante reserva-se o direito de atualizar estes Termos a qualquer momento.
              Alterações serão comunicadas por e-mail com <strong>15 dias de antecedência</strong>.
              O uso continuado da plataforma após esse prazo implica aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">11. Lei Aplicável e Foro</h2>
            <p>
              Este contrato é regido pelas leis da <strong>República Federativa do Brasil</strong>.
              Fica eleito o foro da comarca de <strong>São Paulo/SP</strong> para dirimir quaisquer
              controvérsias, com renúncia a qualquer outro, por mais privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">12. Contato</h2>
            <p>
              Dúvidas sobre estes termos:{' '}
              <a href="mailto:juridico@conciliapro.com.br" className="text-blue-600 hover:underline">
                juridico@conciliapro.com.br
              </a>
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">ConciliaPro © 2026 — JD Fernandes e Filhos Ltda — CNPJ 01.325.134/0001-45</p>
          <div className="flex gap-4 text-xs">
            <Link href="/politica-de-privacidade" className="text-blue-600 hover:underline">Política de Privacidade</Link>
            <Link href="/login" className="text-gray-400 hover:underline">Voltar ao login</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
