'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { CheckCircle, ArrowRight, Building2, User, Mail, Lock, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const PLANOS = [
  {
    id: 'BASICO',
    nome: 'Básico',
    preco: 'R$ 197',
    descricao: '1 CNPJ · até 5 mil transações/mês',
    recursos: ['Importação EDI', 'Conciliação automática', 'Relatórios', 'Alertas por e-mail'],
    destaque: false,
  },
  {
    id: 'PROFISSIONAL',
    nome: 'Profissional',
    preco: 'R$ 397',
    descricao: 'Até 5 CNPJs · 50 mil transações/mês',
    recursos: ['Tudo do Básico', 'API Rede integrada', 'Exportação TOTVS/ERP', 'Conferência bancária OFX'],
    destaque: true,
  },
  {
    id: 'ENTERPRISE',
    nome: 'Enterprise',
    preco: 'R$ 797',
    descricao: 'CNPJs e transações ilimitados',
    recursos: ['Tudo do Profissional', 'Grupo empresarial', 'Suporte prioritário', 'Onboarding dedicado'],
    destaque: false,
  },
]

const INPUT = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mt-1 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400'

export default function CadastroPage() {
  const router = useRouter()
  const [etapa, setEtapa] = useState<'plano' | 'dados'>('plano')
  const [plano, setPlano] = useState('PROFISSIONAL')
  const [form, setForm] = useState({
    nomeEmpresa: '',
    cnpj: '',
    nomeAdmin: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    telefone: '',
  })
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  function campo(field: keyof typeof form) {
    return {
      value: form[field],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm(f => ({ ...f, [field]: e.target.value })),
    }
  }

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (form.senha !== form.confirmarSenha) {
      setErro('As senhas não coincidem')
      return
    }
    setCarregando(true)
    try {
      const r = await api.post('/public/cadastro', {
        nomeEmpresa: form.nomeEmpresa,
        cnpj: form.cnpj,
        nomeAdmin: form.nomeAdmin,
        email: form.email,
        senha: form.senha,
        telefone: form.telefone || undefined,
        plano,
      })
      localStorage.setItem('token', r.data.token)
      router.push('/')
    } catch (e: any) {
      setErro(e?.response?.data?.erro ?? 'Erro ao criar conta. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">C</span>
          </div>
          <span className="font-black text-gray-900 text-lg">ConciliaPro</span>
        </div>
        <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900">
          Já tenho conta <ChevronRight className="inline h-3.5 w-3.5" />
        </Link>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center py-12 px-4">

        {/* Etapa 1 — Escolha do plano */}
        {etapa === 'plano' && (
          <div className="w-full max-w-3xl">
            <div className="text-center mb-8">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">14 dias grátis · sem cartão</p>
              <h1 className="text-3xl font-black text-gray-900">Escolha seu plano</h1>
              <p className="text-gray-500 mt-2">Você pode mudar a qualquer momento</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {PLANOS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPlano(p.id)}
                  className={`text-left p-5 rounded-2xl border-2 transition-all relative
                    ${plano === p.id
                      ? 'border-blue-500 bg-blue-50 shadow-md shadow-blue-100'
                      : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  {p.destaque && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider">
                      Mais popular
                    </span>
                  )}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-black text-gray-900">{p.nome}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{p.descricao}</p>
                      <p className="text-lg font-black text-gray-900 mt-2">{p.preco}<span className="text-xs font-normal text-gray-400">/mês</span></p>
                    </div>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
                      ${plano === p.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                      {plano === p.id && <div className="h-2 w-2 bg-white rounded-full" />}
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {p.recursos.map(r => (
                      <li key={r} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setEtapa('dados')}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-xl transition-colors shadow-sm"
              >
                Continuar com plano {PLANOS.find(p => p.id === plano)?.nome}
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-xs text-gray-400 mt-3">
                14 dias gratuitos · Preços definidos em breve · Cancele quando quiser
              </p>
            </div>
          </div>
        )}

        {/* Etapa 2 — Dados da empresa */}
        {etapa === 'dados' && (
          <div className="w-full max-w-lg">
            <button onClick={() => setEtapa('plano')} className="text-sm text-gray-400 hover:text-gray-600 mb-6 flex items-center gap-1">
              ← Voltar
            </button>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
              <div className="mb-6">
                <span className="inline-block bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full mb-3">
                  Plano {PLANOS.find(p => p.id === plano)?.nome} · 14 dias grátis
                </span>
                <h2 className="text-xl font-black text-gray-900">Criar sua conta</h2>
                <p className="text-sm text-gray-500 mt-1">Preencha os dados da empresa e do responsável</p>
              </div>

              <form onSubmit={cadastrar} className="space-y-4">
                <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5" /> Dados da Empresa
                  </p>
                  <div>
                    <label className="text-xs text-gray-500">Razão Social / Nome da Empresa</label>
                    <input {...campo('nomeEmpresa')} required placeholder="Ex: Empório Villa Borghese Ltda"
                      className={INPUT} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">CNPJ</label>
                      <input {...campo('cnpj')} required placeholder="00.000.000/0000-00"
                        className={INPUT} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Telefone (opcional)</label>
                      <input {...campo('telefone')} placeholder="(11) 99999-9999"
                        className={INPUT} />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                    <User className="h-3.5 w-3.5" /> Responsável
                  </p>
                  <div>
                    <label className="text-xs text-gray-500">Nome completo</label>
                    <input {...campo('nomeAdmin')} required placeholder="Seu nome"
                      className={INPUT} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 flex items-center gap-1"><Mail className="h-3 w-3" /> E-mail</label>
                    <input {...campo('email')} type="email" required placeholder="voce@empresa.com.br"
                      className={INPUT} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 flex items-center gap-1"><Lock className="h-3 w-3" /> Senha</label>
                      <input {...campo('senha')} type="password" required placeholder="mín. 6 caracteres"
                        className={INPUT} />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Confirmar senha</label>
                      <input {...campo('confirmarSenha')} type="password" required placeholder="repita a senha"
                        className={INPUT} />
                    </div>
                  </div>
                </div>

                {erro && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                    {erro}
                  </div>
                )}

                <button type="submit" disabled={carregando}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors shadow-sm mt-2">
                  {carregando ? 'Criando conta...' : 'Criar conta gratuitamente'}
                  {!carregando && <ArrowRight className="h-4 w-4" />}
                </button>

                <p className="text-center text-xs text-gray-400">
                  Ao criar sua conta você concorda com os{' '}
                  <Link href="/termos-de-uso" target="_blank" className="underline">Termos de Uso</Link>
                  {' '}e{' '}
                  <Link href="/politica-de-privacidade" target="_blank" className="underline">Política de Privacidade</Link>
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
