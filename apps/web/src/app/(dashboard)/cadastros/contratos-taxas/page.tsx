'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { Plus, Trash2, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Pencil } from 'lucide-react'

const ADQUIRENTES = [
  { value: 'REDE', label: 'Rede' },
  { value: 'CIELO', label: 'Cielo' },
  { value: 'ALELO', label: 'Alelo' },
  { value: 'PLUXEE', label: 'Pluxee' },
  { value: 'VR_BENEFICIOS', label: 'VR Benefícios' },
  { value: 'TICKET', label: 'Ticket' },
  { value: 'VEROCARD', label: 'Verocard' },
  { value: 'UP_BRASIL', label: 'Up Brasil/Policard' },
  { value: 'BEN_VISA_VALE', label: 'Ben Visa Vale' },
  { value: 'STONE', label: 'Stone' },
  { value: 'GETNET', label: 'GetNet' },
  { value: 'PAGSEGURO', label: 'PagSeguro' },
  { value: 'OUTROS', label: 'Outros' },
]

const MODALIDADES = [
  { value: 'CREDITO_A_VISTA', label: 'Crédito à Vista' },
  { value: 'CREDITO_PARCELADO', label: 'Crédito Parcelado' },
  { value: 'DEBITO', label: 'Débito' },
  { value: 'VOUCHER', label: 'Voucher/Benefício' },
  { value: 'PIX', label: 'Pix' },
]

const BANDEIRAS = [
  { value: '', label: 'Todas as bandeiras' },
  { value: 'VISA', label: 'Visa' },
  { value: 'MASTERCARD', label: 'Mastercard' },
  { value: 'ELO', label: 'Elo' },
  { value: 'AMEX', label: 'Amex' },
  { value: 'HIPERCARD', label: 'Hipercard' },
  { value: 'OUTROS', label: 'Outros' },
]

interface Item {
  id?: string
  modalidade: string
  bandeira?: string
  parcelas?: number | ''
  taxa: number | ''
}

interface Contrato {
  id: string
  nome: string
  adquirente: string
  numeroMatriz?: string
  ativo: boolean
  vigenciaInicio: string
  itens: Item[]
}

const itemVazio = (): Item => ({ modalidade: 'CREDITO_A_VISTA', bandeira: '', parcelas: '', taxa: '' })

export default function ContratosTaxasPage() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [expandido, setExpandido] = useState<string | null>(null)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Contrato | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Form state
  const [nome, setNome] = useState('')
  const [adquirente, setAdquirente] = useState('REDE')
  const [numeroMatriz, setNumeroMatriz] = useState('')
  const [itens, setItens] = useState<Item[]>([itemVazio()])

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const r = await api.get('/contratos-taxas').catch(() => ({ data: [] }))
    setContratos(r.data)
  }

  function abrirNovo() {
    setEditando(null)
    setNome('')
    setAdquirente('REDE')
    setNumeroMatriz('')
    setItens([itemVazio()])
    setModal(true)
  }

  function abrirEditar(c: Contrato) {
    setEditando(c)
    setNome(c.nome)
    setAdquirente(c.adquirente)
    setNumeroMatriz(c.numeroMatriz ?? '')
    setItens(c.itens.map(i => ({ ...i, bandeira: i.bandeira ?? '', parcelas: i.parcelas ?? '' })))
    setModal(true)
  }

  function addItem() { setItens(p => [...p, itemVazio()]) }
  function removeItem(i: number) { setItens(p => p.filter((_, idx) => idx !== i)) }
  function updateItem(i: number, campo: string, valor: any) {
    setItens(p => p.map((item, idx) => idx === i ? { ...item, [campo]: valor } : item))
  }

  async function salvar() {
    if (!nome || itens.some(i => i.taxa === '')) return
    setSalvando(true)
    const payload = {
      nome,
      adquirente,
      numeroMatriz: numeroMatriz || undefined,
      itens: itens.map(i => ({
        modalidade: i.modalidade,
        bandeira: i.bandeira || undefined,
        parcelas: i.parcelas !== '' ? Number(i.parcelas) : undefined,
        taxa: Number(i.taxa),
      })),
    }
    try {
      if (editando) {
        await api.put(`/contratos-taxas/${editando.id}`, payload)
      } else {
        await api.post('/contratos-taxas', payload)
      }
      setModal(false)
      carregar()
    } finally {
      setSalvando(false)
    }
  }

  async function toggleAtivo(c: Contrato) {
    await api.patch(`/contratos-taxas/${c.id}/ativo`, { ativo: !c.ativo })
    carregar()
  }

  async function deletar(id: string) {
    if (!confirm('Excluir este contrato?')) return
    await api.delete(`/contratos-taxas/${id}`)
    carregar()
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos de Taxas</h1>
          <p className="text-gray-500 text-sm mt-1">Cadastre o MDR contratado com cada adquirente para habilitar a Auditoria de Taxas</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Contrato
        </button>
      </div>

      {contratos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">📄</div>
          <p className="font-medium text-gray-600">Nenhum contrato cadastrado</p>
          <p className="text-sm text-gray-400 mt-1">Cadastre as taxas contratadas para detectar cobranças indevidas</p>
          <button onClick={abrirNovo} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            Cadastrar primeiro contrato
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {contratos.map(c => (
            <div key={c.id} className={`bg-white rounded-xl border overflow-hidden ${!c.ativo ? 'opacity-60' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{c.nome}</span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{ADQUIRENTES.find(a => a.value === c.adquirente)?.label ?? c.adquirente}</span>
                    {c.numeroMatriz && <span className="text-xs text-gray-400">EC: {c.numeroMatriz}</span>}
                    {!c.ativo && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Inativo</span>}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{c.itens.length} produto{c.itens.length !== 1 ? 's' : ''} cadastrado{c.itens.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => abrirEditar(c)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => toggleAtivo(c)} className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title={c.ativo ? 'Desativar' : 'Ativar'}>
                    {c.ativo ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5" />}
                  </button>
                  <button onClick={() => deletar(c.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => setExpandido(expandido === c.id ? null : c.id)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                    {expandido === c.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {expandido === c.id && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs uppercase">
                        <th className="text-left pb-2">Modalidade</th>
                        <th className="text-left pb-2">Bandeira</th>
                        <th className="text-left pb-2">Parcelas</th>
                        <th className="text-right pb-2">Taxa Contratada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {c.itens.map((item, i) => (
                        <tr key={i}>
                          <td className="py-2 text-gray-700">{MODALIDADES.find(m => m.value === item.modalidade)?.label}</td>
                          <td className="py-2 text-gray-600">{item.bandeira ? BANDEIRAS.find(b => b.value === item.bandeira)?.label : 'Todas'}</td>
                          <td className="py-2 text-gray-600">{item.parcelas ? `${item.parcelas}x` : 'Todas'}</td>
                          <td className="py-2 text-right font-semibold text-blue-700">{Number(item.taxa).toFixed(4)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editando ? 'Editar Contrato' : 'Novo Contrato de Taxa'}</h2>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do contrato</label>
                  <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Rede Crédito" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adquirente</label>
                  <select value={adquirente} onChange={e => setAdquirente(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                    {ADQUIRENTES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Número do contrato / EC (opcional)</label>
                <input value={numeroMatriz} onChange={e => setNumeroMatriz(e.target.value)} placeholder="Ex: 1032252623" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Taxas por produto</label>
                  <button onClick={addItem} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <Plus className="h-3 w-3" /> Adicionar linha
                  </button>
                </div>

                <div className="space-y-2">
                  {itens.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-3">
                      <div className="col-span-4">
                        <select value={item.modalidade} onChange={e => updateItem(i, 'modalidade', e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-900">
                          {MODALIDADES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <select value={item.bandeira ?? ''} onChange={e => updateItem(i, 'bandeira', e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-900">
                          {BANDEIRAS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input type="number" value={item.parcelas} onChange={e => updateItem(i, 'parcelas', e.target.value)} placeholder="Parc." min={1} max={24} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-gray-900" />
                      </div>
                      <div className="col-span-2">
                        <div className="relative">
                          <input type="number" value={item.taxa} onChange={e => updateItem(i, 'taxa', e.target.value)} placeholder="0.00" step="0.0001" min={0} max={100} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 pr-5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        {itens.length > 1 && (
                          <button onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Parcela em branco = vale para todas. Bandeira em branco = vale para todas.</p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando || !nome} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar contrato'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


