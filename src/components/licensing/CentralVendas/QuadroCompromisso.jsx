import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Loader2, Plus, Trash2, CalendarPlus, CalendarDays, ListChecks, CheckCircle2,
  ChevronLeft, ChevronRight, ChevronDown, X, ArrowRight, User, LayoutGrid,
  Briefcase, Dumbbell, Home, Target, Clock, Megaphone, Wallet, GraduationCap,
  Lightbulb, AlertTriangle, Rocket, Sparkles, Camera,
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { plataforma } from '@/api/plataformaAdapter';
import { Button } from '@/components/ui/button';
import useArrastavel from '@/hooks/useArrastavel';
import {
  ESTADO_ABERTO, LISTAS_MODELO, CARD_EXEMPLO, CORES_LISTA, ICONES_LISTA,
  estaFeito, progressoChecklist, atrasado, marcarFeito, reabrir,
  alternarItem, adicionarItem, removerItem, cartoesDaLista, feitosNaMesa, semLista,
  tarefaDoCartao, resumoDoQuadro, reordenarListas,
} from '@/lib/quadroCompromisso';
import { assistenteDaLista, faltaResponder, gerarDaEntrevista, resumoDaFicha } from '@/lib/assistenteDeLista';
import { ferramentaDe } from '@/lib/ferramentaDaTarefa';
import { getFotoPerfil } from '@/lib/selosCargo';
import { HABITOS } from '@/lib/metodo';

// 🗂️ O NOSSO QUADRO — a mesa de trabalho do Compromisso (DIR-76/76.1).
//
// A REGRA mora em lib/quadroCompromisso.js. Aqui é a CARA, e ela foi tirada
// dos prints do quadro do dono no MeisterTask, item por item (DIR-76.1):
//
//   • CABEÇALHO DE COLUNA COLORIDO DE PONTA A PONTA — barra sólida alta, com
//     ícone à esquerda, nome em CAIXA ALTA e o número à direita. É o que dá a
//     cara de ferramenta grande: no quadro dele, é a primeira coisa que se vê.
//   • CARD BRANCO sobre a coluna. Contraste alto, sombra baixa, canto redondo.
//     Card branco sobre fundo escuro é o que faz a mesa "saltar" da tela.
//   • FAIXA DE STATUS NO TOPO DO CARD, largura inteira: verde "Concluída",
//     laranja "Atrasado". No MeisterTask ela é a segunda coisa que o olho pega,
//     antes do título — e é por isso que dá pra varrer o quadro sem ler nada.
//   • RODAPÉ DE METADADOS em chips: data com ícone de calendário, contador do
//     checklist "2/5" com ícone de lista. Nunca texto solto.
//   • AVATAR no canto do card.
//   • COLUNA RECOLHIDA vira barra vertical DA COR DELA, com o nome girado.
//
// ⛔ SEM EMOJI. Ordem do dono: "está muito ainda aparecendo emoji". Emoji
// muda de desenho em cada sistema e dá cara de rascunho; ícone é desenhado,
// alinha na linha de base e aceita a cor do tema.

// As cores das listas — sólidas e saturadas, como as seções do MeisterTask.
const PALETA = {
  grafite: { barra: '#2E3A4E', claro: 'rgba(46,58,78,0.14)' },
  ambar: { barra: '#EF9A2E', claro: 'rgba(239,154,46,0.14)' },
  roxo: { barra: '#7C5CD6', claro: 'rgba(124,92,214,0.14)' },
  rosa: { barra: '#E8467C', claro: 'rgba(232,70,124,0.14)' },
  teal: { barra: '#17A8A0', claro: 'rgba(23,168,160,0.14)' },
  verde: { barra: '#2FA36B', claro: 'rgba(47,163,107,0.14)' },
};
// as CHAVES vêm da lib (uma verdade só); aqui moram só os valores de cor
const paleta = (cor) => PALETA[cor] || PALETA.grafite;

// Os desenhos dos ícones que a lib nomeia. A lib guarda o NOME; aqui mora o
// desenho — trocar de pacote de ícones um dia não mexe em nenhum dado gravado.
const DESENHO = {
  lista: ListChecks, trabalho: Briefcase, academia: Dumbbell, casa: Home,
  alvo: Target, relogio: Clock, marketing: Megaphone, dinheiro: Wallet,
  estudo: GraduationCap, ideia: Lightbulb, alerta: AlertTriangle, foguete: Rocket,
};
// Enquanto a pessoa não escolhe, o ícone é DEDUZIDO do nome — a lista nasce
// com cara certa sem ninguém ter que abrir menu nenhum. Escolher é opção, não
// obrigação: é o que o dono chamou de "ficar igual as outras" sozinha.
const PALPITE = [
  [/trabalho|comercial|neg[óo]cio|empresa/i, 'trabalho'],
  [/academia|treino|corrida|f[íi]sic|malha/i, 'academia'],
  [/pessoal|casa|fam[íi]lia/i, 'casa'],
  [/meta|objetivo|resultado/i, 'alvo'],
  [/reuni|agenda|semana|hoje/i, 'relogio'],
  [/marketing|conte[úu]do|social/i, 'marketing'],
  [/financeir|caixa|contrato|cobran/i, 'dinheiro'],
  [/estudo|leitura|forma[çc][ãa]o|mentoria/i, 'estudo'],
];
const nomeDoIcone = (lista) => lista?.icone
  || PALPITE.find(([re]) => re.test(String(lista?.nome || '')))?.[1]
  || 'lista';
const iconeDaLista = (lista) => DESENHO[nomeDoIcone(lista)] || ListChecks;

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const dataCurta = (iso) => {
  const s = String(iso || '');
  if (s.length < 10) return '';
  return `${Number(s.slice(8, 10))} de ${MES[Number(s.slice(5, 7)) - 1] || ''}`;
};

/** Foto da pessoa — ou as iniciais, quando ela ainda não subiu foto. */
function Foto({ user, nome, tamanho = 26 }) {
  const foto = getFotoPerfil(user);
  const n = String(nome || user?.full_name || '').trim();
  const iniciais = n ? n.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') : '';
  const estilo = { width: tamanho, height: tamanho };
  if (foto) return <img src={foto} alt={n} title={n} style={estilo} className="rounded-full object-cover shrink-0 ring-2 ring-white/70" />;
  if (!iniciais) return <span style={estilo} title="sem responsável" className="rounded-full bg-[#DFE1E6] text-[#5E6C84] inline-flex items-center justify-center shrink-0"><User style={{ width: tamanho * 0.5, height: tamanho * 0.5 }} /></span>;
  return (
    <span style={{ ...estilo, fontSize: tamanho * 0.36 }} title={n}
      className="rounded-full bg-[#0B5FFF] text-white font-extrabold inline-flex items-center justify-center shrink-0 ring-2 ring-white/70">
      {iniciais}
    </span>
  );
}

/** Texto que vira campo ao clicar. Enter salva, Esc desiste, vazio não salva. */
function Editavel({ valor, onSalvar, className = '', placeholder = '', estilo }) {
  const [editando, setEditando] = useState(false);
  const [txt, setTxt] = useState(valor || '');
  useEffect(() => { if (!editando) setTxt(valor || ''); }, [valor, editando]);
  const salvar = () => {
    const t = txt.trim();
    setEditando(false);
    if (t && t !== (valor || '')) onSalvar(t);
  };
  if (!editando) {
    return (
      <span role="button" tabIndex={0} style={estilo}
        onClick={() => setEditando(true)}
        onKeyDown={(e) => { if (e.key === 'Enter') setEditando(true); }}
        className={`cursor-text rounded px-1 -mx-1 hover:bg-black/[0.06] ${className}`}
        title="clique pra editar"
      >{valor || <span className="opacity-40">{placeholder}</span>}</span>
    );
  }
  return (
    <input autoFocus value={txt} style={estilo}
      onChange={(e) => setTxt(e.target.value)}
      onBlur={salvar}
      onKeyDown={(e) => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') { setTxt(valor || ''); setEditando(false); } }}
      className={`rounded px-1 -mx-1 outline-none w-full bg-white ring-2 ring-[#0B5FFF]/40 ${className}`}
    />
  );
}

/**
 * 🎨 O painel de ÍCONE E COR da lista — o "Ícone de seção" do MeisterTask
 * (ordem do dono: "precisa selecionar emoji, tem que dar tudo isso pra ele").
 * Grade de ícones em cima, fileira de cores embaixo, exatamente como no print.
 */
function PainelDaLista({ lista, onEscolher, onFechar }) {
  return (
    <div className="absolute z-30 top-[46px] left-0 w-[230px] rounded-lg p-3 shadow-2xl"
      style={{ background: '#FFFFFF' }} data-teste="painel-da-lista"
      onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[12px] font-bold" style={{ color: '#172B4D' }}>Ícone da lista</p>
        <button type="button" onClick={onFechar} className="text-[#7A869A] hover:text-[#172B4D]"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {ICONES_LISTA.map((nome) => {
          const I = DESENHO[nome] || ListChecks;
          const ativo = nomeDoIcone(lista) === nome;
          return (
            <button key={nome} type="button" title={nome}
              onClick={() => onEscolher({ icone: nome })}
              className="h-8 rounded inline-flex items-center justify-center border transition-colors"
              style={ativo ? { borderColor: '#0B5FFF', background: '#E9F2FF' } : { borderColor: '#DFE1E6', background: '#FFFFFF' }}>
              <I className="w-4 h-4" style={{ color: ativo ? '#0B5FFF' : '#42526E' }} />
            </button>
          );
        })}
      </div>
      <p className="text-[12px] font-bold mt-3 mb-2" style={{ color: '#172B4D' }}>Cor</p>
      <div className="flex flex-wrap gap-2">
        {CORES_LISTA.map((cor) => (
          <button key={cor} type="button" title={cor}
            onClick={() => onEscolher({ cor })}
            className="w-7 h-7 rounded-full"
            style={{ background: paleta(cor).barra, outline: lista.cor === cor ? '2px solid #172B4D' : 'none', outlineOffset: 2 }} />
        ))}
      </div>
    </div>
  );
}

/**
 * 🤖 A ENTREVISTA do assistente. Uma pergunta por bloco, resposta em botão —
 * digitar só no que é número. A pessoa escreve o mínimo possível, que é o
 * ponto inteiro disto existir.
 */
function Entrevista({ assistente, onGerar, onFechar }) {
  const [resp, setResp] = useState({});
  const [subindo, setSubindo] = useState(false);
  const falta = faltaResponder(assistente, resp);

  const subirFoto = async (arquivo) => {
    if (!arquivo) return;
    setSubindo(true);
    try {
      const r = await plataforma.integrations.Core.UploadFile({ file: arquivo });
      const url = r?.file_url || r?.url || null;
      if (url) setResp((x) => ({ ...x, foto: url }));
      else toast.error('Não deu pra subir a foto');
    } catch { toast.error('Não deu pra subir a foto'); }
    finally { setSubindo(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,2,12,0.72)' }} onClick={onFechar}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden max-h-[88vh] flex flex-col"
        style={{ background: '#FFFFFF' }} onClick={(e) => e.stopPropagation()} data-teste="entrevista">
        <div className="px-5 py-4 flex items-start gap-3" style={{ background: '#0B5FFF' }}>
          <Sparkles className="w-5 h-5 text-white/90 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-[16px] font-extrabold text-white">{assistente.titulo}</p>
            <p className="text-[12px] text-white/80">{assistente.convite}</p>
          </div>
          <button type="button" onClick={onFechar} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {assistente.perguntas.map((p) => (
            <div key={p.id}>
              <p className="text-[13px] font-bold mb-2" style={{ color: '#172B4D' }}>
                {p.rotulo}
                {p.opcional && <span className="font-normal" style={{ color: '#7A869A' }}> — opcional</span>}
              </p>
              {p.ajuda && <p className="text-[11px] mb-2" style={{ color: '#7A869A' }}>{p.ajuda}</p>}

              {p.tipo === 'escolha' && (
                <div className="flex flex-wrap gap-2">
                  {p.opcoes.map((o) => {
                    const ativo = resp[p.id] === o.valor;
                    return (
                      <button key={String(o.valor)} type="button"
                        onClick={() => setResp((x) => ({ ...x, [p.id]: o.valor }))}
                        className="rounded-lg px-3 h-9 text-[13px] font-bold border-2 transition-colors"
                        style={ativo
                          ? { borderColor: '#0B5FFF', background: '#E9F2FF', color: '#0B5FFF' }
                          : { borderColor: '#DFE1E6', background: '#FFFFFF', color: '#42526E' }}>
                        {o.rotulo}
                      </button>
                    );
                  })}
                </div>
              )}

              {p.tipo === 'numero' && (
                <input type="number" inputMode="decimal" value={resp[p.id] ?? ''}
                  onChange={(e) => setResp((x) => ({ ...x, [p.id]: e.target.value }))}
                  className="w-32 rounded-lg h-10 px-3 text-[14px] outline-none border-2"
                  style={{ borderColor: '#DFE1E6', color: '#172B4D' }} placeholder="0" />
              )}

              {p.tipo === 'foto' && (
                <label className="inline-flex items-center gap-2 rounded-lg h-10 px-3 text-[13px] font-bold border-2 cursor-pointer"
                  style={{ borderColor: resp[p.id] ? '#2FA36B' : '#DFE1E6', color: resp[p.id] ? '#177245' : '#42526E' }}>
                  {subindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  {resp[p.id] ? 'foto guardada' : subindo ? 'subindo...' : 'escolher foto'}
                  <input type="file" accept="image/*" hidden onChange={(e) => subirFoto(e.target.files?.[0])} />
                </label>
              )}
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t" style={{ borderColor: '#DFE1E6' }}>
          <Button
            onClick={() => onGerar(resp)}
            disabled={falta.length > 0 || subindo}
            className="w-full h-11 font-bold text-white disabled:opacity-40"
            style={{ background: '#0B5FFF' }}
          >
            {falta.length > 0 ? `Falta responder ${falta.length}` : 'Montar a minha semana'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * A COLUNA. É componente próprio por um motivo técnico e um de projeto: o hook
 * de arrastar não pode ser chamado dentro de um `map`, e o cabeçalho precisa
 * ser arrastável pra reordenar ("o arrastar de um lado pro outro", ordem do
 * dono). O cabeçalho é a alça — o corpo continua livre pra rolar.
 */
function Coluna({
  lista, cartoes, dono, hoje, indice, painelAberto,
  onPainel, onMudarLista, onExcluirLista, onReordenar, onAssistente,
  onMudarCard, onExcluirCard, onVirarTarefa, onIr, valorNovo, onNovo, onCriar,
}) {
  const p = paleta(lista.cor);
  const Icone = iconeDaLista(lista);
  const assistente = assistenteDaLista(lista.nome);
  const jaTemFicha = !!lista.ficha?.assistente;
  const resumoFicha = resumoDaFicha(lista.ficha);

  const { arrastando, alcas, engolirCliqueDoArrasto } = useArrastavel({
    aoSoltar: ({ x, y }) => {
      const alvo = document.elementFromPoint(x, y)?.closest('[data-lista]');
      const destino = alvo?.getAttribute('data-indice');
      if (destino != null && Number(destino) !== indice) onReordenar(lista.id, Number(destino));
    },
  });

  return (
    <div data-lista={lista.id} data-lista-nome={lista.nome} data-indice={indice} data-teste="lista"
      className="shrink-0 w-[300px] rounded-lg overflow-visible relative"
      style={{ background: 'rgba(255,255,255,0.05)', opacity: arrastando ? 0.7 : 1 }}>

      {/* ── CABEÇALHO COLORIDO DE PONTA A PONTA, e é ele a alça do arrasto ── */}
      <div {...alcas} onClickCapture={engolirCliqueDoArrasto}
        className="flex items-center gap-2 px-3 h-[46px] rounded-t-lg"
        style={{ background: p.barra, cursor: arrastando ? 'grabbing' : 'grab' }}>
        <button type="button" onClick={() => onPainel(painelAberto ? null : lista.id)}
          title="ícone e cor da lista" className="shrink-0 hover:opacity-80">
          <Icone className="w-[18px] h-[18px] text-white/90" />
        </button>
        <Editavel
          valor={lista.nome}
          onSalvar={(n) => onMudarLista(lista, { nome: n })}
          estilo={{ color: '#FFFFFF' }}
          className="text-[13px] font-extrabold uppercase tracking-[0.08em] flex-1 min-w-0 truncate"
        />
        <span className="text-[12px] font-extrabold text-white/90 tabular-nums px-1.5">{cartoes.length}</span>
        <button type="button" onClick={() => onMudarLista(lista, { recolhida: true })} title="recolher"
          className="text-white/70 hover:text-white shrink-0"><ChevronLeft className="w-4 h-4" /></button>
        <button type="button" onClick={() => onExcluirLista(lista)} title="apagar lista"
          className="text-white/50 hover:text-white shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>

      {painelAberto && (
        <PainelDaLista lista={lista} onFechar={() => onPainel(null)}
          onEscolher={(m) => { onMudarLista(lista, m); }} />
      )}

      <div className="p-2.5 space-y-2.5 min-h-[80px]">
        {/* 🤖 O CONVITE do assistente — convite, nunca modal que abre sozinho */}
        {assistente && !jaTemFicha && (
          <button type="button" onClick={() => onAssistente(lista, assistente)} data-teste="convite-assistente"
            className="w-full rounded-lg p-3 text-left border-2 border-dashed hover:brightness-110 transition-[filter]"
            style={{ borderColor: p.barra, background: p.claro }}>
            <p className="text-[13px] font-extrabold inline-flex items-center gap-1.5 text-nz-tinta">
              <Sparkles className="w-4 h-4" style={{ color: p.barra }} /> {assistente.titulo}
            </p>
            <p className="text-[11px] mt-0.5 text-nz-tinta-fraca">{assistente.convite}</p>
          </button>
        )}
        {resumoFicha && (
          <p className="text-[11px] font-semibold px-1 text-nz-tinta-fraca" data-teste="ficha-da-lista">{resumoFicha}</p>
        )}

        {cartoes.map((cartao) => (
          <Cartao key={cartao.id} cartao={cartao} dono={dono} hoje={hoje}
            onMudar={onMudarCard} onExcluir={onExcluirCard} onVirarTarefa={onVirarTarefa} onIr={onIr} />
        ))}

        <div className="flex items-center gap-1.5">
          <input
            value={valorNovo}
            onChange={(e) => onNovo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onCriar(); }}
            placeholder="novo card"
            className="flex-1 rounded-lg px-3 h-10 text-[14px] outline-none placeholder:text-[#B3BAC5]"
            style={{ background: '#FFFFFF', color: '#172B4D', boxShadow: '0 1px 2px rgba(9,30,66,0.25)' }}
          />
          <Button size="sm" onClick={onCriar} disabled={!String(valorNovo || '').trim()}
            className="h-10 w-10 p-0 shrink-0 text-white" style={{ background: p.barra }}><Plus className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}

function Cartao({ cartao, dono, hoje, onMudar, onExcluir, onVirarTarefa, onIr }) {
  const [novoItem, setNovoItem] = useState('');
  const [sobre, setSobre] = useState(null);
  const { arrastando, alcas, engolirCliqueDoArrasto } = useArrastavel({
    aoSoltar: ({ x, y }) => {
      const alvo = document.elementFromPoint(x, y)?.closest('[data-lista]');
      setSobre(null);
      const destino = alvo?.getAttribute('data-lista');
      if (destino && destino !== cartao.lista_id) onMudar({ ...cartao, lista_id: destino });
    },
    aoMover: ({ x, y }) => setSobre(document.elementFromPoint(x, y)?.closest('[data-lista]')?.getAttribute('data-lista-nome') || null),
  });
  const feito = estaFeito(cartao);
  const prog = progressoChecklist(cartao);
  const venceu = atrasado(cartao, hoje);
  const habito = HABITOS.find((h) => h.n === cartao.habito);
  const ferramenta = habito ? { secao: habito.id, rotulo: habito.completo } : ferramentaDe(cartao);
  const agoraISO = () => new Date().toISOString();

  return (
    <div
      {...alcas}
      onClickCapture={engolirCliqueDoArrasto}
      data-teste="cartao-quadro"
      className="group rounded-lg overflow-hidden transition-shadow"
      style={{
        background: '#FFFFFF',
        boxShadow: arrastando ? '0 12px 28px rgba(0,0,0,0.35)' : '0 1px 2px rgba(9,30,66,0.25)',
        transform: arrastando ? 'scale(1.02)' : undefined,
        cursor: arrastando ? 'grabbing' : 'grab',
      }}
    >
      {/* ── A FAIXA DE STATUS, largura inteira, no topo — o traço do MeisterTask ── */}
      {(feito || venceu) && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold"
          style={feito ? { background: '#E3F5E9', color: '#177245' } : { background: '#FFE8DF', color: '#C4470F' }}>
          {feito ? <CheckCircle2 className="w-3.5 h-3.5" /> : <CalendarDays className="w-3.5 h-3.5" />}
          {feito ? 'Concluída' : 'Atrasado'}
        </div>
      )}

      <div className="p-3">
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => onMudar(feito ? reabrir(cartao) : marcarFeito(cartao, agoraISO()))}
            title={feito ? 'reabrir' : 'marcar concluída'}
            className="mt-0.5 w-[18px] h-[18px] rounded-full border-2 shrink-0 inline-flex items-center justify-center transition-colors"
            style={feito ? { background: '#2FA36B', borderColor: '#2FA36B' } : { borderColor: '#C1C7D0' }}
          >{feito && <CheckCircle2 className="w-3 h-3 text-white" />}</button>

          <div className="flex-1 min-w-0">
            <Editavel
              valor={cartao.titulo}
              onSalvar={(t) => onMudar({ ...cartao, titulo: t })}
              estilo={{ color: feito ? '#7A869A' : '#172B4D', textDecoration: feito ? 'line-through' : 'none' }}
              className="text-[15px] font-bold leading-snug block"
            />
          </div>
          <Foto user={dono} nome={cartao.responsavel_nome || dono?.full_name} />
        </div>

        {/* o checklist — o card que ele mais usa no quadro dele */}
        {prog.total > 0 && (
          <div className="mt-2.5 space-y-1.5">
            {cartao.checklist.map((item, i) => (
              <label key={i} className="flex items-start gap-2 text-[13px] leading-snug group/item cursor-pointer">
                <input type="checkbox" checked={!!item.feito} onChange={() => onMudar(alternarItem(cartao, i, agoraISO()))}
                  className="mt-0.5 w-[14px] h-[14px] accent-[#2FA36B] shrink-0" />
                <span className="flex-1" style={{ color: item.feito ? '#7A869A' : '#42526E', textDecoration: item.feito ? 'line-through' : 'none' }}>{item.texto}</span>
                <button type="button" onClick={(e) => { e.preventDefault(); onMudar(removerItem(cartao, i)); }}
                  className="opacity-0 group-hover/item:opacity-100 text-[#7A869A] hover:text-[#C4470F]"><X className="w-3.5 h-3.5" /></button>
              </label>
            ))}
          </div>
        )}
        {!feito && (
          <input
            value={novoItem}
            onChange={(e) => setNovoItem(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && novoItem.trim()) { onMudar(adicionarItem(cartao, novoItem)); setNovoItem(''); } }}
            placeholder={prog.total ? 'novo item' : 'lista de tarefas'}
            className="mt-2 w-full bg-transparent text-[13px] outline-none border-b border-transparent focus:border-[#0B5FFF]/40 placeholder:text-[#B3BAC5]"
            style={{ color: '#42526E' }}
          />
        )}

        {/* ── RODAPÉ DE METADADOS, tudo em chip com ícone ── */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px]" style={{ color: '#5E6C84' }}>
          <label className="inline-flex items-center gap-1 cursor-pointer relative font-semibold"
            style={venceu ? { color: '#C4470F' } : undefined} title="prazo">
            <CalendarDays className="w-3.5 h-3.5" />
            {cartao.prazo ? dataCurta(cartao.prazo) : 'prazo'}
            <input type="date" value={cartao.prazo || ''} onChange={(e) => onMudar({ ...cartao, prazo: e.target.value || null })}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
          </label>
          {prog.total > 0 && (
            <span className="inline-flex items-center gap-1 tabular-nums font-semibold"><ListChecks className="w-3.5 h-3.5" /> {prog.feitos}/{prog.total}</span>
          )}
          {habito && (
            <span className="rounded px-1.5 py-0.5 text-[11px] font-bold" style={{ background: '#E9F2FF', color: '#0B5FFF' }}>Hábito {habito.n}</span>
          )}
          {cartao.virou_tarefa_id && (
            <span className="rounded px-1.5 py-0.5 text-[11px] font-bold" style={{ background: '#E3F5E9', color: '#177245' }}>no dia</span>
          )}
        </div>

        {sobre && <p className="mt-2 text-[12px] font-bold" style={{ color: '#0B5FFF' }}>soltar em “{sobre}”</p>}

        <div className="mt-2.5 flex items-center gap-3 text-[12px] font-bold">
          {ferramenta && !feito && (
            <button type="button" onClick={() => onIr?.(ferramenta.secao, ferramenta.sub)} title={`Abrir ${ferramenta.rotulo}`}
              className="inline-flex items-center gap-1 hover:underline" style={{ color: '#0B5FFF' }}>
              abrir <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          {!feito && (
            <button
              type="button"
              disabled={!!cartao.virou_tarefa_id}
              onClick={() => onVirarTarefa(cartao)}
              title={cartao.virou_tarefa_id ? 'já está no seu dia' : 'entra na sua Master Task de hoje'}
              className="inline-flex items-center gap-1 hover:underline disabled:no-underline"
              style={{ color: cartao.virou_tarefa_id ? '#B3BAC5' : venceu ? '#C4470F' : '#5E6C84' }}
            ><CalendarPlus className="w-3.5 h-3.5" /> {cartao.virou_tarefa_id ? 'já está no dia' : venceu ? 'remarcar pra hoje' : 'pro meu dia'}</button>
          )}
          <button type="button" onClick={() => onExcluir(cartao)}
            className="ml-auto opacity-0 group-hover:opacity-100 text-[#B3BAC5] hover:text-[#C4470F]"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}

export default function QuadroCompromisso({ currentUser, hojeISO, onIr, onTarefaCriada }) {
  const uid = currentUser?.id || null;
  const hoje = hojeISO || new Date().toISOString().slice(0, 10);
  const [listas, setListas] = useState([]);
  const [cartoes, setCartoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [novo, setNovo] = useState({});
  const [novaLista, setNovaLista] = useState('');
  const [feitoAberto, setFeitoAberto] = useState(false);
  const [painelDe, setPainelDe] = useState(null);      // id da lista com o painel aberto
  const [entrevistando, setEntrevistando] = useState(null); // { lista, assistente }

  const carregar = useCallback(async () => {
    if (!uid) { setCarregando(false); return; }
    const [l, c] = await Promise.all([
      supabase.from('metodo_quadro_listas').select('*').eq('user_id', uid).order('ordem', { ascending: true }),
      supabase.from('metodo_quadro').select('*').eq('user_id', uid).order('ordem', { ascending: true }),
    ]);
    setListas(l.error || !Array.isArray(l.data) ? [] : l.data);
    setCartoes(c.error || !Array.isArray(c.data) ? [] : c.data);
    setCarregando(false);
  }, [uid]);
  useEffect(() => { carregar(); }, [carregar]);

  const resumo = useMemo(() => resumoDoQuadro(cartoes, hoje), [cartoes, hoje]);
  const orfaos = useMemo(() => semLista(cartoes), [cartoes]);
  const feitos = useMemo(() => feitosNaMesa(cartoes, hoje), [cartoes, hoje]);

  const criarLista = async (nome, cor) => {
    const n = String(nome || '').trim();
    if (!n || !uid) return null;
    const linha = { user_id: uid, nome: n, cor: cor || CORES_LISTA[listas.length % CORES_LISTA.length], ordem: listas.length };
    const { data, error } = await supabase.from('metodo_quadro_listas').insert(linha).select().single();
    if (error) { toast.error('Não deu pra criar a lista'); return null; }
    setListas((ls) => [...ls, data]);
    return data;
  };
  const mudarLista = async (lista, mudanca) => {
    setListas((ls) => ls.map((l) => (l.id === lista.id ? { ...l, ...mudanca } : l)));
    const { error } = await supabase.from('metodo_quadro_listas').update({ ...mudanca, updated_at: new Date().toISOString() }).eq('id', lista.id);
    if (error) { toast.error('Não salvou — recarregando'); carregar(); }
  };
  // 🖐️ arrastar a lista de um lado pro outro. A ordem é RENUMERADA inteira e
  // gravada lista por lista: ordem com buraco volta embaralhada na próxima
  // leitura, e aí a mesa "se mexe sozinha" sem ninguém ter mexido.
  const reordenar = async (id, paraIndice) => {
    const nova = reordenarListas(listas, id, paraIndice);
    if (nova === listas) return;
    setListas(nova);
    await Promise.all(nova.map((l) => supabase.from('metodo_quadro_listas').update({ ordem: l.ordem }).eq('id', l.id)));
  };

  // 🤖 a entrevista respondida vira os cards da semana + a ficha da lista
  const gerarDoAssistente = async (lista, assistente, respostas) => {
    const saida = gerarDaEntrevista(assistente.id, respostas);
    if (!saida) { toast.error('Falta responder alguma coisa'); return; }
    const linhas = saida.cards.map((c, i) => ({
      user_id: uid, lista_id: lista.id, titulo: c.titulo, checklist: c.checklist,
      coluna: ESTADO_ABERTO, ordem: cartoes.length + i,
    }));
    const { data, error } = await supabase.from('metodo_quadro').insert(linhas).select();
    if (error) { toast.error('Não deu pra montar a semana'); return; }
    setCartoes((cs) => [...cs, ...(Array.isArray(data) ? data : [])]);
    await mudarLista(lista, { ficha: saida.ficha });
    setEntrevistando(null);
    toast.success(`Semana montada: ${saida.cards.length} treinos em "${lista.nome}".`);
  };

  const excluirLista = async (lista) => {
    const abertos = cartoesDaLista(cartoes, lista.id).length;
    if (abertos > 0) { toast.message(`"${lista.nome}" ainda tem ${abertos} card${abertos > 1 ? 's' : ''} — mova ou conclua antes de apagar a lista.`); return; }
    setListas((ls) => ls.filter((l) => l.id !== lista.id));
    await supabase.from('metodo_quadro_listas').delete().eq('id', lista.id);
  };

  const comecarComModelo = async () => {
    const criadas = [];
    for (const l of LISTAS_MODELO) { const c = await criarLista(l.nome, l.cor); if (c) criadas.push(c); }
    if (criadas[0]) {
      const linha = { user_id: uid, lista_id: criadas[0].id, titulo: CARD_EXEMPLO.titulo, checklist: CARD_EXEMPLO.checklist, coluna: ESTADO_ABERTO, ordem: 0 };
      const { data } = await supabase.from('metodo_quadro').insert(linha).select().single();
      if (data) setCartoes((cs) => [...cs, data]);
    }
    toast.success('Quadro montado — edite o que quiser clicando em cima.');
  };

  const criar = async (listaId) => {
    const titulo = String(novo[listaId] || '').trim();
    if (!titulo || !uid) return;
    const f = ferramentaDe({ titulo });
    const linha = { user_id: uid, lista_id: listaId, titulo, coluna: ESTADO_ABERTO, habito: f?.habito || null, checklist: [], ordem: cartoes.length };
    const { data, error } = await supabase.from('metodo_quadro').insert(linha).select().single();
    if (error) { toast.error('Não deu pra salvar o card'); return; }
    setCartoes((cs) => [...cs, data]);
    setNovo((n) => ({ ...n, [listaId]: '' }));
  };
  const mudar = async (cartaoNovo) => {
    setCartoes((cs) => cs.map((c) => (c.id === cartaoNovo.id ? cartaoNovo : c)));
    const { id, created_date: _criado, ...resto } = cartaoNovo;
    const { error } = await supabase.from('metodo_quadro').update({ ...resto, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Não salvou — recarregando'); carregar(); }
  };
  const excluir = async (cartao) => {
    setCartoes((cs) => cs.filter((c) => c.id !== cartao.id));
    const { error } = await supabase.from('metodo_quadro').delete().eq('id', cartao.id);
    if (error) { toast.error('Não excluiu — recarregando'); carregar(); }
  };

  const virarTarefa = async (cartao) => {
    const linha = tarefaDoCartao(cartao, { userId: uid, dataISO: hoje });
    if (!linha) { toast.message('Este card já entrou no seu dia.'); return; }
    let criada = null;
    try { criada = await plataforma.entities.MetodoTarefa.create(linha); }
    catch (e) { console.error(e); toast.error('Não deu pra pôr no dia'); return; }
    const carimbo = { virou_tarefa_id: criada?.id || 'sem-id', virou_tarefa_em: new Date().toISOString() };
    await mudar({ ...cartao, ...carimbo });
    toast.success(`"${cartao.titulo}" entrou na sua Master Task de hoje.`);
    onTarefaCriada?.(criada || { ...linha, id: carimbo.virou_tarefa_id });
  };

  useEffect(() => {
    if (!listas[0] || !orfaos.length) return;
    orfaos.forEach((c) => mudar({ ...c, lista_id: listas[0].id, coluna: ESTADO_ABERTO }));
  }, [listas.length, orfaos.length]);

  if (carregando) return <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-white/40" /></div>;

  return (
    <div className="space-y-4" data-teste="quadro-compromisso">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Foto user={currentUser} tamanho={40} />
          <div>
            <p className="text-[17px] font-extrabold tracking-tight text-nz-tinta inline-flex items-center gap-2">
              <LayoutGrid className="w-[18px] h-[18px] text-nz-verde" /> O nosso quadro
            </p>
            <p className="text-[12px] text-nz-tinta-fraca">as suas listas — o tempo fica no seu dia, não aqui</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[12px] font-bold">
          <span className="text-nz-tinta-fraca tabular-nums">{resumo.abertos} abertos</span>
          {resumo.atrasados > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded px-2 py-1" style={{ background: '#FFE8DF', color: '#C4470F' }}>
              <CalendarDays className="w-3.5 h-3.5" /> {resumo.atrasados} passou do prazo
            </span>
          )}
        </div>
      </div>

      {listas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/20 p-10 text-center space-y-3">
          <p className="text-[15px] font-bold text-nz-tinta">Sua mesa ainda está vazia.</p>
          <p className="text-[12px] text-nz-tinta-fraca max-w-md mx-auto">Comece com o modelo — Trabalho, Academia e Pessoal, com um card de exemplo — e mude tudo depois clicando em cima.</p>
          <Button onClick={comecarComModelo} className="bg-nz-verde hover:bg-nz-verde-claro text-white h-10 px-5 font-bold" data-teste="quadro-modelo">
            <Plus className="w-4 h-4 mr-1.5" /> Começar com o modelo
          </Button>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3 items-start">
          {listas.map((lista, indice) => {
            const daLista = cartoesDaLista(cartoes, lista.id);
            const p = paleta(lista.cor);
            const Icone = iconeDaLista(lista);

            // ── COLUNA RECOLHIDA: barra vertical DA COR DELA ──
            if (lista.recolhida) {
              return (
                <button
                  key={lista.id} type="button"
                  onClick={() => mudarLista(lista, { recolhida: false })}
                  data-lista={lista.id} data-lista-nome={lista.nome} data-indice={indice} data-teste="lista-recolhida"
                  title={`abrir ${lista.nome}`}
                  className="shrink-0 w-11 min-h-[260px] rounded-lg flex flex-col items-center py-3 gap-3 hover:brightness-110 transition-[filter]"
                  style={{ background: p.barra }}
                >
                  <ChevronRight className="w-4 h-4 text-white/80" />
                  <Icone className="w-4 h-4 text-white/80" />
                  <span className="text-[12px] font-extrabold text-white uppercase tracking-[0.14em]"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{lista.nome}</span>
                  <span className="mt-auto text-[12px] font-extrabold text-white/90 tabular-nums">{daLista.length}</span>
                </button>
              );
            }

            return (
              <Coluna
                key={lista.id}
                lista={lista}
                cartoes={daLista}
                dono={currentUser}
                hoje={hoje}
                indice={indice}
                painelAberto={painelDe === lista.id}
                onPainel={setPainelDe}
                onMudarLista={mudarLista}
                onExcluirLista={excluirLista}
                onReordenar={reordenar}
                onAssistente={(l, a) => setEntrevistando({ lista: l, assistente: a })}
                onMudarCard={mudar}
                onExcluirCard={excluir}
                onVirarTarefa={virarTarefa}
                onIr={onIr}
                valorNovo={novo[lista.id] || ''}
                onNovo={(v) => setNovo((n) => ({ ...n, [lista.id]: v }))}
                onCriar={() => criar(lista.id)}
              />
            );
          })}

          {/* ── NOVA LISTA: nasce com a MESMA CARA das outras (ordem do dono:
              "quando eu adicionar, precisa ficar igual as outras"). O cabeçalho
              já vem colorido, com o ícone que o nome sugere, ANTES de existir —
              a pessoa vê o resultado enquanto digita. ── */}
          <div className="shrink-0 w-[300px] rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }} data-teste="nova-lista">
            {(() => {
              const previa = { nome: novaLista, cor: CORES_LISTA[listas.length % CORES_LISTA.length] };
              const IconePrevia = iconeDaLista(previa);
              return (
                <div className="flex items-center gap-2 px-3 h-[46px]"
                  style={{ background: novaLista.trim() ? paleta(previa.cor).barra : 'rgba(255,255,255,0.10)' }}>
                  <IconePrevia className="w-[18px] h-[18px] text-white/90 shrink-0" />
                  <input
                    value={novaLista}
                    onChange={(e) => setNovaLista(e.target.value)}
                    onKeyDown={async (e) => { if (e.key === 'Enter' && novaLista.trim()) { await criarLista(novaLista); setNovaLista(''); } }}
                    placeholder="NOVA LISTA"
                    className="flex-1 min-w-0 bg-transparent text-[13px] font-extrabold uppercase tracking-[0.08em] text-white outline-none placeholder:text-white/50"
                  />
                  <button type="button" disabled={!novaLista.trim()}
                    onClick={async () => { await criarLista(novaLista); setNovaLista(''); }}
                    className="text-white/80 hover:text-white disabled:opacity-30 shrink-0"><Plus className="w-4 h-4" /></button>
                </div>
              );
            })()}
            <p className="px-3 py-3 text-[11px] text-nz-tinta-fraca">
              escreva o nome e aperte Enter — se for um contexto conhecido, o assistente monta a lista pra você
            </p>
          </div>
        </div>
      )}

      {entrevistando && (
        <Entrevista
          assistente={entrevistando.assistente}
          onFechar={() => setEntrevistando(null)}
          onGerar={(respostas) => gerarDoAssistente(entrevistando.lista, entrevistando.assistente, respostas)}
        />
      )}

      {feitos.length > 0 && (
        <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }} data-teste="quadro-feito">
          <button type="button" onClick={() => setFeitoAberto((v) => !v)}
            className="w-full flex items-center gap-2 px-3 h-[42px] text-[13px] font-extrabold uppercase tracking-[0.08em] text-white"
            style={{ background: '#2FA36B' }}>
            <CheckCircle2 className="w-[18px] h-[18px] text-white/90" />
            <span className="flex-1 text-left">Feito <span className="tabular-nums">{feitos.length}</span></span>
            <span className="text-[11px] font-semibold normal-case tracking-normal text-white/80">sai da mesa depois de 7 dias</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${feitoAberto ? 'rotate-180' : ''}`} />
          </button>
          {feitoAberto && (
            <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {feitos.map((cartao) => (
                <Cartao key={cartao.id} cartao={cartao} dono={currentUser} hoje={hoje} onMudar={mudar} onExcluir={excluir} onVirarTarefa={virarTarefa} onIr={onIr} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
