import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { X, Mail, Phone, UserPlus, ShoppingCart, Gavel, Calendar, MessageCircle, StickyNote, Save, GitBranch, Coins, Clock, Pencil } from 'lucide-react';
import { fmtBR } from '@/lib/money';
import { ROLE_LABEL } from '@/lib/crmUnifiedCustomers';
import { estagioDe } from '@/lib/esteiraCaptacao';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '-');

// 🔎 Funil real do cliente: quando entrou, quem indicou e cada compra/arremate
// — substitui o resumo vago ("Cadastro + Loja Virtual, R$ 617") por uma linha
// do tempo que qualquer vendedor consegue usar pra decidir o próximo passo.
// 📝 DIR-24 Fase 4 (30/08/2026): anotações + data de retorno + próximo passo
// em QUALQUER cliente (antes só cliente manual tinha notas — a maioria, que
// vem da Loja, ficava muda). Salvar chama onSaveNotes, que faz upsert na
// tabela customers pelo e-mail/telefone — na recarga a nota FUNDE de volta na
// linha automática (regra de fusão da DIR-24 em crmUnifiedCustomers.js).
const ICONE_EVENTO = {
  cadastro: UserPlus, deposito: Coins, compra: ShoppingCart, arremate: Gavel,
  oportunidade: GitBranch, followup: Calendar, reuniao: Calendar, recontato: Clock,
};

export default function CrmCustomerDetailModal({ customer, onClose, onSaveNotes, oportunidades = [], eventos = null, onCriarOportunidade, onEditarContato, podeEditarUsuarioApp = false }) {
  const [notas, setNotas] = useState(customer?.notes || '');
  const [followUp, setFollowUp] = useState(customer?.follow_up_date ? String(customer.follow_up_date).slice(0, 10) : '');
  const [proximoPasso, setProximoPasso] = useState(customer?.next_steps || '');
  const [salvando, setSalvando] = useState(false);
  // ✏️ DIR-37 — corrigir cadastro errado (telefone, nome...) sem sair do CRM
  const [editandoContato, setEditandoContato] = useState(false);
  const [contato, setContato] = useState({
    full_name: customer?.full_name || '', email: customer?.email || '',
    phone: customer?.phone || '', cpf: customer?.cpf || '',
  });
  const [salvandoContato, setSalvandoContato] = useState(false);
  if (!customer) return null;
  // Conta do app: só admin corrige (a pessoa é dona do próprio cadastro)
  const podeEditar = !!onEditarContato && (customer.user_id ? podeEditarUsuarioApp : true);
  const salvarContato = async () => {
    setSalvandoContato(true);
    try {
      await onEditarContato(customer, contato);
      setEditandoContato(false);
    } finally {
      setSalvandoContato(false);
    }
  };
  // 📜 DIR-36 — cronologia unificada (lib linhaDoTempoCliente) quando o pai
  // manda `eventos`; sem ela, cai no histórico antigo (compras + arremates).
  const passados = eventos?.passados || [
    ...(customer.purchases || []).map((p) => ({ em: p.date, tipo: 'compra', titulo: p.product_title || 'Produto', valor: p.amount })),
    ...(customer.auctions_list || []).map((a) => ({ em: a.date, tipo: 'arremate', titulo: a.title || 'Leilão', valor: a.amount })),
  ].sort((a, b) => new Date(b.em || 0) - new Date(a.em || 0));
  const futuros = eventos?.futuros || [];

  const digitos = String(customer.phone || '').replace(/\D/g, '');
  const linkZap = digitos ? `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}` : null;

  const salvar = async () => {
    if (!onSaveNotes) return;
    setSalvando(true);
    try {
      await onSaveNotes(customer, { notes: notas, follow_up_date: followUp || null, next_steps: proximoPasso });
      onClose();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="bg-white border-nz-borda max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b border-nz-borda flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-nz-tinta text-lg">{customer.full_name}</CardTitle>
            <div className="flex items-center gap-2">
              {podeEditar && !editandoContato && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setContato({ full_name: customer.full_name || '', email: customer.email || '', phone: customer.phone || '', cpf: customer.cpf || '' });
                    setEditandoContato(true);
                  }}
                  className="h-8 border-nz-borda text-nz-tinta"
                >
                  <Pencil className="w-4 h-4 mr-1" /> Editar
                </Button>
              )}
              {linkZap && (
                <a href={linkZap} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8">
                    <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
                  </Button>
                </a>
              )}
              <Button variant="ghost" size="icon" onClick={onClose} className="text-nz-tinta-fraca hover:text-nz-tinta">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-y-auto flex-1 p-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-nz-marrom-fundo text-nz-marrom-escuro">
              {ROLE_LABEL[customer.role_type] || 'Cliente'}
            </span>
            {/* DIR-37: não repetir "Cliente Cliente" quando tipo e status coincidem */}
            {(customer.status === 'cliente' ? 'Cliente' : customer.status === 'lead' ? 'Lead' : 'Inativo') !== (ROLE_LABEL[customer.role_type] || 'Cliente') && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-nz-verde-fundo text-nz-verde">
                {customer.status === 'cliente' ? 'Cliente' : customer.status === 'lead' ? 'Lead' : 'Inativo'}
              </span>
            )}
          </div>

          {editandoContato ? (
            /* ✏️ DIR-37 — corrigir o cadastro sem sair do CRM */
            <div className="rounded-lg border border-nz-verde/40 bg-nz-verde-fundo/40 p-3 space-y-3">
              <p className="text-sm font-semibold text-nz-tinta flex items-center gap-1.5">
                <Pencil className="w-4 h-4 text-nz-verde" /> Corrigir cadastro
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <p className="text-xs text-nz-tinta-fraca mb-1">Nome completo</p>
                  <Input value={contato.full_name} onChange={(e) => setContato({ ...contato, full_name: e.target.value })} className="bg-white border-nz-borda text-nz-tinta text-sm" />
                </div>
                <div>
                  <p className="text-xs text-nz-tinta-fraca mb-1">Telefone (WhatsApp)</p>
                  <Input value={contato.phone} onChange={(e) => setContato({ ...contato, phone: e.target.value })} className="bg-white border-nz-borda text-nz-tinta text-sm" />
                </div>
                <div>
                  <p className="text-xs text-nz-tinta-fraca mb-1">CPF</p>
                  <Input value={contato.cpf} onChange={(e) => setContato({ ...contato, cpf: e.target.value })} className="bg-white border-nz-borda text-nz-tinta text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-nz-tinta-fraca mb-1">E-mail{customer.user_id ? ' (é o login da conta — muda no painel Admin)' : ''}</p>
                  <Input value={contato.email} disabled={!!customer.user_id} onChange={(e) => setContato({ ...contato, email: e.target.value })} className="bg-white border-nz-borda text-nz-tinta text-sm disabled:opacity-60" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={salvarContato} disabled={salvandoContato || !contato.full_name.trim()} className="flex-1 bg-nz-verde hover:bg-nz-verde-claro text-white">
                  <Save className="w-4 h-4 mr-2" /> {salvandoContato ? 'Salvando...' : 'Salvar correção'}
                </Button>
                <Button variant="outline" onClick={() => setEditandoContato(false)} className="border-nz-borda text-nz-tinta">Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 text-sm text-nz-tinta">
              {customer.email && <p className="flex items-center gap-2 text-nz-tinta-fraca"><Mail className="w-4 h-4" />{customer.email}</p>}
              {customer.phone && <p className="flex items-center gap-2 text-nz-tinta-fraca"><Phone className="w-4 h-4" />{customer.phone}</p>}
              {customer.registered_at && <p className="flex items-center gap-2 text-nz-tinta-fraca"><Calendar className="w-4 h-4" />Cadastrado em {fmtDate(customer.registered_at)}</p>}
              {customer.referred_by_name && <p className="flex items-center gap-2 text-nz-tinta-fraca"><UserPlus className="w-4 h-4" />Indicado por {customer.referred_by_name}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-nz-cinza-fundo rounded-lg p-3 text-center">
              <p className="text-xs text-nz-tinta-fraca mb-1">Pedidos na Loja</p>
              <p className="text-xl font-bold text-nz-tinta">{customer.purchase_count || 0}</p>
            </div>
            <div className="bg-nz-cinza-fundo rounded-lg p-3 text-center">
              <p className="text-xs text-nz-tinta-fraca mb-1">Leilões Arrematados</p>
              <p className="text-xl font-bold text-nz-tinta">{customer.auctions_won || 0}</p>
            </div>
          </div>

          <div className="bg-nz-verde-fundo rounded-lg p-3 text-center">
            <p className="text-xs text-nz-tinta-fraca mb-1">Total Gasto</p>
            <p className="text-2xl font-bold text-nz-verde">R$ {fmtBR(customer.total_spent || 0)}</p>
          </div>

          {/* 🛤️ DIR-36 — a esteira DENTRO do cliente: negociações dele + criar nova */}
          {(onCriarOportunidade || oportunidades.length > 0) && (
            <div className="rounded-lg border border-nz-borda p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-nz-tinta flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-nz-verde" /> Esteira de captação
                </p>
                {onCriarOportunidade && (
                  <Button size="sm" onClick={() => onCriarOportunidade(customer)} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-8">
                    + Criar oportunidade
                  </Button>
                )}
              </div>
              {oportunidades.length === 0 ? (
                <p className="text-xs text-nz-tinta-fraca">Nenhuma negociação de aporte ou licença com este cliente ainda.</p>
              ) : (
                oportunidades.map((o) => (
                  <div key={o.id} className="flex items-center justify-between bg-nz-cinza-fundo border border-nz-borda rounded-lg px-2.5 py-1.5">
                    <span className="text-xs text-nz-tinta">{estagioDe(o.estagio).label}</span>
                    {Number(o.valor_previsto) > 0 && <span className="text-xs font-semibold text-nz-verde">R$ {fmtBR(o.valor_previsto)}</span>}
                  </div>
                ))
              )}
            </div>
          )}

          {/* 📝 Anotações + follow-up — em QUALQUER cliente */}
          {onSaveNotes && (
            <div className="rounded-lg border border-nz-borda p-3 space-y-3">
              <p className="text-sm font-semibold text-nz-tinta flex items-center gap-1.5">
                <StickyNote className="w-4 h-4 text-nz-verde" /> Anotações do vendedor
              </p>
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="O que foi conversado, o que o cliente quer, objeções..."
                className="bg-white border-nz-borda text-nz-tinta text-sm min-h-[70px]"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-nz-tinta-fraca mb-1">Voltar a falar em</p>
                  <Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className="bg-white border-nz-borda text-nz-tinta text-sm" />
                </div>
                <div>
                  <p className="text-xs text-nz-tinta-fraca mb-1">Próximo passo</p>
                  <Input value={proximoPasso} onChange={(e) => setProximoPasso(e.target.value)} placeholder="ex.: mandar foto do lote" className="bg-white border-nz-borda text-nz-tinta text-sm" />
                </div>
              </div>
              <p className="text-[11px] text-nz-tinta-fraca">Com data marcada, o cliente entra sozinho na fila "Quem contatar hoje" no dia.</p>
              <Button onClick={salvar} disabled={salvando} className="w-full bg-nz-verde hover:bg-nz-verde-claro text-white">
                <Save className="w-4 h-4 mr-2" /> {salvando ? 'Salvando...' : 'Salvar anotações'}
              </Button>
            </div>
          )}

          {/* 📜 DIR-36 — a HISTÓRIA do cliente numa lista só: o que vem (topo)
              e tudo o que já aconteceu (cadastro, depósito, compra, esteira) */}
          {futuros.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-nz-tinta mb-2">Próximos compromissos</p>
              <div className="space-y-2">
                {futuros.map((item, idx) => {
                  const Icone = ICONE_EVENTO[item.tipo] || Calendar;
                  return (
                    <div key={idx} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                      <Icone className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-nz-tinta truncate">{item.titulo}{item.detalhe ? ` — ${item.detalhe}` : ''}</p>
                        <p className="text-xs text-nz-tinta-fraca">{fmtDate(item.em)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-nz-tinta mb-2">Linha do tempo</p>
            {passados.length === 0 ? (
              <p className="text-sm text-nz-tinta-fraca">Nenhum movimento ainda — ainda é só um lead.</p>
            ) : (
              <div className="space-y-2">
                {passados.map((item, idx) => {
                  const Icone = ICONE_EVENTO[item.tipo] || ShoppingCart;
                  return (
                    <div key={idx} className="flex items-center justify-between bg-white border border-nz-borda rounded-lg p-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icone className={`w-4 h-4 flex-shrink-0 ${item.tipo === 'oportunidade' ? 'text-nz-verde' : item.tipo === 'deposito' ? 'text-amber-600' : 'text-nz-marrom'}`} />
                        <div className="min-w-0">
                          <p className="text-sm text-nz-tinta truncate">{item.titulo}{item.detalhe ? ` — ${item.detalhe}` : ''}</p>
                          <p className="text-xs text-nz-tinta-fraca">{fmtDate(item.em)}</p>
                        </div>
                      </div>
                      {Number(item.valor) > 0 && <p className="text-sm font-semibold text-nz-tinta flex-shrink-0 ml-2">R$ {fmtBR(item.valor)}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
