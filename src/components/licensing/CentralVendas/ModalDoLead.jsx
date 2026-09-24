import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Search, Handshake, Star, PhoneCall, CalendarPlus, UserPlus, Loader2, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { plataforma } from '@/api/plataformaClient';
import { ABAS_DO_MODAL, filtrarPorNome, novoContatoParaGravar, duplicadoNaMinhaLista, podeCriarContato, resumoDaQualificacao } from '@/lib/leadDoQuadro';
import { aceitaConfirmacao, motivoEmPalavras } from '@/lib/duplicadoDeContato';

/**
 * 🤝 "TUDO AQUI" — o painel do lead, aberto de dentro do card do quadro.
 *
 * 24/09/2026 — dono: "modal no quadro para que tudo possa ser feito lá (lista,
 * contatos, e mais). Da qualificação do lead à criação do contato novo. Sem
 * sair da página do quadro."
 *
 * O que ele junta, sem inventar tela nova por baixo:
 *   • MINHA LISTA — a Lista de Networking (só a minha; super admin vê todas),
 *     com a qualificação de cada um e as ações: vincular ao card, qualificar,
 *     registrar contato;
 *   • NOVO CONTATO — o "Adicionar pessoa" da Lista, com a mesma trava contra
 *     duplicado do CRM; ao salvar, já vincula ao card e abre a qualificação;
 *   • no topo, o cliente do card com Qualificar · Registrar contato · Agendar.
 *
 * Quem grava a qualificação e o registro é o pai (LeadDoCartao), com os modais
 * que já existem (DIR-46 e DIR-47). Este painel é um sobreposto fixo z-50, como
 * os outros modais do Método — os dois que ele abre montam DEPOIS dele na
 * árvore, então ficam por cima. Não use o <Dialog> da casa aqui: ele é z-[200]
 * e engoliria os modais de qualificação/registro embaixo dele.
 */
export default function ModalDoLead({
  aberto, onFechar, cartao, dono, hoje, clientes = [], carregando = false,
  onVincular, onDesvincular, onQualificar, onContatar, onAgendar, agendando = false, onCriado,
}) {
  const [aba, setAba] = useState('lista');
  const [termo, setTermo] = useState('');
  const [novo, setNovo] = useState({ nome: '', telefone: '', email: '' });
  const [confirmouOutro, setConfirmouOutro] = useState(false);
  const [criando, setCriando] = useState(false);

  const vinculado = useMemo(() => (cartao?.cliente_id ? clientes.find((c) => c.id === cartao.cliente_id) || null : null), [clientes, cartao?.cliente_id]);
  const filtrados = useMemo(() => filtrarPorNome(clientes, termo, 30), [clientes, termo]);
  const candidato = useMemo(() => novoContatoParaGravar(novo, dono, hoje), [novo, dono, hoje]);
  const duplicado = useMemo(() => (candidato ? duplicadoNaMinhaLista(clientes, candidato) : null), [clientes, candidato]);
  const podeCriar = !!candidato && podeCriarContato(duplicado, confirmouOutro) && !criando;

  if (!aberto) return null;

  const criar = async () => {
    if (!podeCriar) return;
    setCriando(true);
    try {
      const gravado = await plataforma.entities.Customer.create(candidato);
      const c = { ...candidato, ...(gravado || {}) };
      toast.success(`${c.full_name} entrou na sua lista`);
      setNovo({ nome: '', telefone: '', email: '' }); setConfirmouOutro(false);
      await onCriado?.(c);
    } catch (e) {
      toast.error(`Não consegui cadastrar: ${e?.message || e}`);
    } finally { setCriando(false); }
  };

  const chip = 'inline-flex items-center gap-1 rounded-full border border-nz-borda bg-white px-2.5 py-1 text-[11px] font-bold text-nz-tinta hover:border-nz-verde/50 hover:bg-nz-verde-fundo disabled:opacity-50';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-teste="modal-do-lead">
      <Card className="bg-white border-nz-borda max-w-xl w-full max-h-[88vh] overflow-hidden flex flex-col">
        <CardContent className="p-5 overflow-y-auto space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-bold text-nz-tinta flex items-center gap-2"><Handshake className="w-5 h-5 text-nz-verde" /> Lead deste card</p>
              <p className="text-sm text-nz-tinta-fraca truncate">{cartao?.titulo || 'card'}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onFechar} data-teste="fechar-modal-lead"><X className="w-5 h-5 text-nz-tinta-fraca" /></Button>
          </div>

          {/* o cliente do card, com as ações — ou o convite pra escolher um */}
          <div className="rounded-xl border border-nz-borda bg-nz-verde-fundo/40 p-3" data-teste="cliente-do-card">
            {cartao?.cliente_id ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-nz-tinta truncate">{cartao.cliente_nome}{vinculado && resumoDaQualificacao(vinculado) ? <span className="ml-2 text-[11px] font-semibold text-nz-verde">{resumoDaQualificacao(vinculado)}</span> : null}</p>
                  <button type="button" onClick={onDesvincular} className="text-[11px] text-nz-tinta-fraca hover:text-nz-tinta" data-teste="modal-desvincular">tirar do card</button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button type="button" className={chip} onClick={() => onQualificar?.(vinculado || { id: cartao.cliente_id, full_name: cartao.cliente_nome })} data-teste="modal-qualificar"><Star className="w-3.5 h-3.5 text-amber-500" /> Qualificar</button>
                  <button type="button" className={chip} onClick={() => onContatar?.(vinculado || { id: cartao.cliente_id, full_name: cartao.cliente_nome })} data-teste="modal-contatar"><PhoneCall className="w-3.5 h-3.5 text-nz-verde" /> Registrar contato</button>
                  <button type="button" className={chip} onClick={onAgendar} disabled={agendando} data-teste="modal-agendar">{agendando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5 text-nz-verde" />} Agendar no Google</button>
                </div>
              </>
            ) : (
              <p className="text-sm text-nz-tinta-fraca">Este card ainda não tem cliente. Escolha um da sua lista ou cadastre um novo abaixo.</p>
            )}
          </div>

          {/* as abas: minha lista · novo contato */}
          <div className="flex gap-1 rounded-lg bg-nz-verde-fundo/60 p-1" role="tablist">
            {ABAS_DO_MODAL.map((a) => (
              <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} onClick={() => setAba(a.id)}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-bold ${aba === a.id ? 'bg-white text-nz-tinta shadow-sm' : 'text-nz-tinta-fraca hover:text-nz-tinta'}`} data-teste={`aba-${a.id}`}>
                {a.id === 'novo' ? <UserPlus className="inline w-3.5 h-3.5 mr-1" /> : <Search className="inline w-3.5 h-3.5 mr-1" />}{a.rotulo}
              </button>
            ))}
          </div>

          {aba === 'lista' ? (
            <div data-teste="aba-lista-conteudo">
              <div className="flex items-center gap-2 rounded-lg border border-nz-borda px-2">
                <Search className="w-3.5 h-3.5 text-nz-tinta-fraca" />
                <Input autoFocus value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="buscar na minha lista…" className="border-none h-9 text-sm focus-visible:ring-0" data-teste="modal-busca" />
              </div>
              <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
                {carregando ? <p className="text-xs text-nz-tinta-fraca px-1 py-2">carregando…</p>
                  : filtrados.length === 0 ? (
                    <p className="text-xs text-nz-tinta-fraca px-1 py-2" data-teste="modal-lista-vazia">
                      {clientes.length ? 'ninguém com esse nome' : 'sua lista está vazia — cadastre o primeiro em "Novo contato"'}
                    </p>
                  ) : filtrados.map((c) => {
                    const ehOCartao = c.id === cartao?.cliente_id;
                    const quali = resumoDaQualificacao(c);
                    return (
                      <div key={c.id} className={`flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-1.5 ${ehOCartao ? 'border-nz-verde bg-nz-verde-fundo' : 'border-nz-borda'}`} data-teste="modal-contato">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-nz-tinta truncate">{c.full_name || 'Sem nome'}</p>
                          <p className="text-[11px] text-nz-tinta-fraca truncate">{[c.phone, c.email].filter(Boolean).join(' · ') || 'sem telefone nem e-mail'}{quali ? ` · ${quali}` : ' · não qualificado'}</p>
                        </div>
                        {!ehOCartao && <button type="button" className={chip} onClick={() => onVincular?.(c)} data-teste="modal-vincular"><Handshake className="w-3.5 h-3.5" /> Vincular</button>}
                        <button type="button" className={chip} onClick={() => onQualificar?.(c)} title="Qualificar" data-teste="modal-qualificar-linha"><Star className="w-3.5 h-3.5 text-amber-500" /></button>
                        <button type="button" className={chip} onClick={() => onContatar?.(c)} title="Registrar contato" data-teste="modal-contatar-linha"><PhoneCall className="w-3.5 h-3.5 text-nz-verde" /></button>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : (
            <div className="space-y-2" data-teste="aba-novo-conteudo">
              <Input value={novo.nome} onChange={(e) => setNovo((n) => ({ ...n, nome: e.target.value }))} placeholder="nome (obrigatório)" className="h-9 text-sm" data-teste="novo-nome" autoFocus />
              <div className="grid grid-cols-2 gap-2">
                <Input value={novo.telefone} onChange={(e) => setNovo((n) => ({ ...n, telefone: e.target.value }))} placeholder="telefone" inputMode="tel" className="h-9 text-sm" data-teste="novo-telefone" />
                <Input value={novo.email} onChange={(e) => setNovo((n) => ({ ...n, email: e.target.value }))} placeholder="e-mail" inputMode="email" className="h-9 text-sm" data-teste="novo-email" />
              </div>
              {duplicado && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-[12px] text-amber-900" data-teste="novo-duplicado" data-motivo={duplicado.motivo}>
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p><b>{duplicado.pessoa.full_name || 'Alguém'}</b> já está na sua lista com {motivoEmPalavras(duplicado.motivo)}.</p>
                    {aceitaConfirmacao(duplicado.motivo) ? (
                      <label className="mt-1 inline-flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={confirmouOutro} onChange={(e) => setConfirmouOutro(e.target.checked)} data-teste="novo-e-outra-pessoa" /> é outra pessoa mesmo
                      </label>
                    ) : (
                      <p className="mt-1">Use o que já existe: vincule pela aba "Minha lista".</p>
                    )}
                  </div>
                </div>
              )}
              <Button onClick={criar} disabled={!podeCriar} className="w-full bg-nz-verde hover:bg-nz-verde-claro text-white font-bold" data-teste="novo-salvar">
                {criando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Cadastrar e vincular ao card
              </Button>
              <p className="text-[11px] text-nz-tinta-fraca">Entra na sua Lista de Networking com o seu carimbo, vira o cliente deste card e já abre a qualificação.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
