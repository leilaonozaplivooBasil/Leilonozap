import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, Gavel, Trophy, Clock, PackageCheck, Truck, Wallet, BadgeCheck, Banknote, HandCoins, X } from 'lucide-react';
import { plataforma } from '@/api/plataformaClient';
import { situacaoDoCracha } from '@/lib/sessaoCliente';
import { rotuloDoContador, tempoRelativo, linkSeguro, marcarLidasLocal, intervaloDoSino } from '@/lib/sinoDoCliente';

// 🔔 O SINO DO CLIENTE — 28/09/2026. Dono: "precisamos implementar o mesmo padrão
// dos e-mails para notificações na tela do usuário. Principalmente 'alguém
// cobriu o lance, arrematou, pedido enviado' e etc — sem perturbações como PIX
// gerado, não tem cabimento receber esse aviso na tela ao logar."
//
// Por isso o sino NÃO salta nada na cara de ninguém: só o contador discreto.
// A pessoa abre quando quer. O que entra aqui é decidido no servidor
// (api/_lib/notificacoesNaTela.js), no mesmo gatilho do e-mail.
//
// Uma consulta só, compartilhada: o cabeçalho monta o sino duas vezes (desktop
// e celular, um deles escondido por CSS) e os dois leem o mesmo estado. Aba no
// fundo não consulta; crachá vencido para a consulta (as abas velhas que
// batiam 401 sem parar eram o item 13 da lista de pendências).

const CORES = { verde: '#1B7A48', verdeClaro: '#E8F3EC', marinho: '#1D2433', cinza: '#6B7280', borda: '#E5E7EB', bege: '#dabb98', navy: '#21222b' };

const ICONE = {
  superado: Gavel, ultima_hora: Clock, arrematou: Trophy,
  compra_confirmada: PackageCheck, compra_enviada: Truck,
  deposito: Wallet, kyc_aprovado: BadgeCheck, saque_pago: Banknote, comissao_paga_manual: HandCoins,
};

// ── o estado compartilhado ─────────────────────────────────────────────────
const VAZIO = { itens: [], naoLidas: 0, carregado: false, dono: null };
let estado = VAZIO;
const ouvintes = new Set();
let relogio = null;
let parado = false;
// Toda marcação local sobe a versão: uma consulta que saiu ANTES dela chega com
// as notificações ainda "não lidas" e desfaria o toque da pessoa — é descartada.
let versao = 0;
const emitir = () => ouvintes.forEach((f) => f());

async function atualizar() {
  if (parado || situacaoDoCracha() !== 'ok') return;
  if (typeof document !== 'undefined' && document.hidden) return;
  const saiuNa = versao;
  try {
    const r = await plataforma.functions.invoke('minhasNotificacoes', { acao: 'listar' });
    if (r?.error === 'nao_autenticado') { parado = true; return; }
    if (saiuNa !== versao) return;
    if (r?.success) { estado = { ...estado, itens: Array.isArray(r.itens) ? r.itens : [], naoLidas: Number(r.naoLidas) || 0, carregado: true }; emitir(); }
  } catch { /* rede caiu: tenta na próxima volta */ }
}
function agendar() {
  clearTimeout(relogio);
  relogio = setTimeout(async () => { await atualizar(); if (ouvintes.size && !parado) agendar(); }, intervaloDoSino());
}
const aoVoltarPraAba = () => { if (!document.hidden) atualizar(); };
function assinar(fn) {
  ouvintes.add(fn);
  if (ouvintes.size === 1) {
    parado = false;
    atualizar(); agendar();
    document.addEventListener('visibilitychange', aoVoltarPraAba);
  }
  return () => {
    ouvintes.delete(fn);
    if (!ouvintes.size) { clearTimeout(relogio); document.removeEventListener('visibilitychange', aoVoltarPraAba); }
  };
}
const ler = () => estado;
/** Troca de conta (sair/entrar com outra): zera o que era da anterior. */
function garantirDono(id) {
  if (estado.dono === id) return;
  estado = { ...VAZIO, dono: id }; parado = false; emitir();
  if (ouvintes.size) atualizar();
}
async function marcarLidas(ids = null) {
  versao += 1;
  estado = marcarLidasLocal(estado, ids); emitir();
  try { await plataforma.functions.invoke('minhasNotificacoes', ids ? { acao: 'lidas', ids } : { acao: 'lidas', todas: true }); } catch { /* a próxima volta acerta */ }
  atualizar();
}

// ── a tela ──────────────────────────────────────────────────────────────────
export default function SinoDoCliente({ currentUser, temaClaro = false, className = '' }) {
  const id = currentUser?.id || null;
  const { itens, naoLidas, carregado } = useSyncExternalStore(assinar, ler, ler);
  const [aberto, setAberto] = useState(false);
  const botao = useRef(null);
  const painel = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { garantirDono(id); }, [id]);

  const fechar = useCallback(() => setAberto(false), []);
  useEffect(() => {
    if (!aberto) return undefined;
    atualizar();
    const fora = (e) => { if (!painel.current?.contains(e.target) && !botao.current?.contains(e.target)) fechar(); };
    const esc = (e) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('mousedown', fora); document.addEventListener('touchstart', fora, { passive: true }); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('touchstart', fora); document.removeEventListener('keydown', esc); };
  }, [aberto, fechar]);

  if (!id) return null;
  const rotulo = rotuloDoContador(naoLidas);

  const abrirItem = (n) => {
    if (!n.lida_em) marcarLidas([n.id]);
    fechar();
    const destino = linkSeguro(n.link);
    if (destino) navigate(destino);
  };

  return (
    <>
      <button
        ref={botao}
        type="button"
        data-teste="sino"
        aria-label={rotulo ? `Notificações: ${naoLidas} novas` : 'Notificações'}
        aria-expanded={aberto}
        onClick={() => setAberto((v) => !v)}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${temaClaro ? 'text-nz-tinta hover:bg-black/5' : 'text-gray-300 hover:text-white hover:bg-white/10'} ${className}`}
      >
        <Bell className="h-[22px] w-[22px]" />
        {rotulo && (
          <span
            data-teste="sino-contador"
            className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-extrabold leading-none"
            style={{
              background: temaClaro ? CORES.verde : `linear-gradient(150deg, #ecd3ae, ${CORES.bege})`,
              color: temaClaro ? '#fff' : CORES.navy,
              border: `2px solid ${temaClaro ? '#fff' : '#131418'}`,
            }}
          >{rotulo}</span>
        )}
      </button>

      {aberto && createPortal(
        <div
          ref={painel}
          role="dialog"
          aria-label="Notificações"
          data-teste="sino-painel"
          className="fixed z-[70] right-2 left-2 sm:left-auto sm:right-4 sm:w-[380px] overflow-hidden rounded-2xl bg-white shadow-2xl"
          style={{ top: 'calc(var(--nz-entalhe, 0px) + 64px)', border: `1px solid ${CORES.borda}`, maxHeight: 'min(70vh, 560px)', display: 'flex', flexDirection: 'column' }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${CORES.borda}` }}>
            <p className="text-[15px] font-extrabold" style={{ color: CORES.marinho }}>Notificações</p>
            <div className="flex items-center gap-1">
              {naoLidas > 0 && (
                <button type="button" data-teste="sino-marcar-todas" onClick={() => marcarLidas()} className="rounded-md px-2 py-1 text-xs font-semibold hover:bg-gray-100" style={{ color: CORES.verde }}>
                  Marcar todas como lidas
                </button>
              )}
              <button type="button" aria-label="Fechar" onClick={fechar} className="rounded-full p-1.5 hover:bg-gray-100" style={{ color: CORES.cinza }}>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
            {!itens.length ? (
              <div data-teste="sino-vazio" className="px-6 py-10 text-center">
                <Bell className="mx-auto mb-3 h-8 w-8" style={{ color: CORES.borda }} />
                <p className="text-sm font-semibold" style={{ color: CORES.marinho }}>{carregado ? 'Nada por aqui ainda' : 'Carregando…'}</p>
                {carregado && (
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: CORES.cinza }}>
                    Quando cobrirem seu lance, você arrematar ou seu pedido sair pra entrega, aparece aqui.
                  </p>
                )}
              </div>
            ) : (
              <ul>
                {itens.map((n) => {
                  const Icone = ICONE[n.tipo] || Bell;
                  const nova = !n.lida_em;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        data-teste="sino-item"
                        data-nova={nova ? 'sim' : 'nao'}
                        onClick={() => abrirItem(n)}
                        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
                        style={{ background: nova ? CORES.verdeClaro : 'transparent', borderBottom: `1px solid ${CORES.borda}` }}
                      >
                        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: nova ? '#fff' : '#F3F4F6', color: CORES.verde }}>
                          <Icone className="h-[18px] w-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className={`truncate text-sm ${nova ? 'font-extrabold' : 'font-semibold'}`} style={{ color: CORES.marinho }}>{n.titulo}</span>
                            <span className="shrink-0 text-[11px]" style={{ color: CORES.cinza }}>{tempoRelativo(n.criada_em)}</span>
                          </span>
                          <span className="mt-0.5 block text-[13px] leading-snug" style={{ color: '#374151' }}>{n.texto}</span>
                        </span>
                        {nova && <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: CORES.verde }} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
