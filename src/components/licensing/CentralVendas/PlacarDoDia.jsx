import React, { useState } from 'react';
import { Info, X } from 'lucide-react';
import {
  vibrar, VIBRA_TOQUE, fmtReais, CICLO_DIAS_UTEIS, TOKEN_MAX, META_VENDAS_CICLO,
  AVISOS_ANTES_DE_ZERAR, OFENSIVA_META, horaDeMin, VOTACAO_INICIO_MIN, VOTACAO_FIM_MIN,
} from '@/lib/xgame';
import { DIAS_FIXO } from '@/lib/distribuicaoFixo';
import { alertaDoDia, explicacoesDoPlacar } from '@/lib/placarDoDia';
import { furaOFoco } from '@/lib/capaDasVisoes';
import RelogioDeTeste from './RelogioDeTeste';

const fmtToken = (n) => Number(n ?? 0).toFixed(2).replace('.', ',');

// 🎯 O PLACAR DO DIA — DIR-180 (24/09/2026)
//
// Dono, com o print da tela do Compromisso: "pra gente deixar isso ainda mais
// limpo... pra ficar ainda melhor visual e a pessoa entender melhor... o que
// você ainda melhoraria pra ficar ainda mais bonito?"
//
// TRÊS COISAS ESTAVAM ATRAPALHANDO, e as três viraram conserto aqui:
//
// 1) OS QUATRO NÚMEROS NÃO TINHAM HIERARQUIA. Human Token, MvM, Cotação e
//    X-Pay tinham o MESMO tamanho, a MESMA borda, o MESMO cartão branco —
//    nada dizia qual importa. Só que o Human Token JÁ É a soma dos outros
//    (ele come MvM + Produção + Real Time + Estudo + Vendas). Agora ele é o
//    número GRANDE, sozinho, com a liga; os outros três viram uma linha
//    fina embaixo. Uma leitura, em vez de quatro.
//
// 2) O FOGO E O PLACAR ESTAVAM SEPARADOS POR ATÉ QUATRO AVISOS. Entre a
//    linha do 🔥 e os números moravam liberação, não-votou, atraso do pronto
//    e aviso do pronto. Com dois disparando junto a pessoa lia três blocos
//    vermelhos ANTES do próprio número — e os dois vermelhos dizem a mesma
//    coisa. Agora: UM alerta, o mais grave (alertaDoDia, na lib pura), e o
//    fogo virou o CABEÇALHO do mesmo bloco dos números.
//
// 3) O ⓘ NÃO EXISTIA NO CELULAR. Os quatro cartões carregavam a metodologia
//    inteira dentro de `title=`, que só abre com o MOUSE PARADO em cima. No
//    telefone NUNCA abre — a explicação do Human Token são ~1000 caracteres
//    presos num lugar que ninguém no celular alcança. Agora tocar no número
//    abre uma folha por baixo, com o texto inteiro.
export default function PlacarDoDia({
  xgame, ciclo = null, recebido, fogo, hojeFechou = false, ehHoje = true,
  liberacao = null, teste = null,
  // 🎴 DIR-183 — dentro de uma visão o placar inteiro some ("some a moeda,
  // some tudo"), mas o DIA ZERADO não pode sumir: ele é de hora marcada e
  // custa o dia inteiro. Neste modo só ele aparece, e mais nada.
  somenteAlertaQueFura = false,
}) {
  const [folha, setFolha] = useState(null);
  const abrir = (id) => { vibrar(VIBRA_TOQUE); setFolha(id); };

  if (!xgame) return null;

  const textos = explicacoesDoPlacar({
    metaVendasCiclo: META_VENDAS_CICLO,
    votacaoInicio: horaDeMin(VOTACAO_INICIO_MIN),
    votacaoFim: horaDeMin(VOTACAO_FIM_MIN),
    diasFixo: DIAS_FIXO,
    valorDia: fmtReais(xgame.xpay.valorDia),
    pesoReferencia: xgame.xpay.pesoReferencia,
    cicloDiasUteis: CICLO_DIAS_UTEIS,
  });

  const alerta = ehHoje ? alertaDoDia({
    naoVotou: Boolean(xgame.perdeu_por_nao_votar),
    atrasouPronto: Boolean(xgame.perdeu_por_atraso_pronto),
    emAvisoPronto: Boolean(xgame.em_aviso_pronto),
    avisosPronto: xgame.avisos_pronto ?? 0,
    avisosAntesDeZerar: AVISOS_ANTES_DE_ZERAR,
    horaFimVotacao: horaDeMin(VOTACAO_FIM_MIN),
    liberacao,
  }) : null;

  const token = ciclo ? ciclo.total : xgame.token_dia;
  const medalha = ciclo ? ciclo.liga.emoji : xgame.faixa.medalha;
  const ligaLabel = ciclo ? ciclo.liga.label : xgame.faixa.label;
  const estudoEmDia = !ciclo || ciclo.estudoEmDiaCompleto;

  if (somenteAlertaQueFura) {
    if (!alerta || !furaOFoco(alerta.tipo)) return null;
    return (
      <div
        data-teste="alerta-do-dia"
        data-tipo={alerta.tipo}
        data-fura-o-foco="sim"
        className="rounded-xl border-2 border-red-500 bg-red-50 px-3 py-2.5 text-center"
      >
        <p className="text-sm font-extrabold text-red-700">{alerta.titulo}</p>
        <p className="mt-0.5 text-[11px] text-red-600">{alerta.texto}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-teste="placar-do-dia">
      {/* ── UM alerta, o mais grave — nunca a pilha de quatro ── */}
      {alerta && (
        <div
          data-teste="alerta-do-dia"
          data-tipo={alerta.tipo}
          className={`rounded-xl border-2 px-3 py-2.5 text-center ${
            alerta.tom === 'grave' ? 'border-red-500 bg-red-50'
              : alerta.tom === 'aviso' ? 'border-amber-500 bg-amber-50'
                : 'border-nz-verde bg-emerald-50'}`}
        >
          <p className={`text-sm font-extrabold ${
            alerta.tom === 'grave' ? 'text-red-700' : alerta.tom === 'aviso' ? 'text-amber-700' : 'text-emerald-700'}`}
          >{alerta.titulo}</p>
          <p className={`text-[11px] mt-0.5 ${
            alerta.tom === 'grave' ? 'text-red-600' : alerta.tom === 'aviso' ? 'text-amber-700/90' : 'text-emerald-600'}`}
          >{alerta.texto}</p>
        </div>
      )}

      <div className="rounded-2xl border border-nz-borda bg-white p-4">
        {/* ── o cabeçalho: o FOGO do dia ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {ehHoje && (
              <>
                <p className="text-sm font-bold text-nz-tinta">
                  🔥 {fogo.dias} {fogo.dias === 1 ? 'dia' : 'dias'} de ofensiva
                  {fogo.congelou && <span className="ml-2 text-[10px] font-semibold text-sky-600">🧊 congelador usado</span>}
                </p>
                <p className="text-[11px] text-nz-tinta-fraca">
                  {hojeFechou
                    ? 'hoje FECHADO ✔ — o fogo continua'
                    : `feche ${Math.round(OFENSIVA_META * 100)}% do dia pra ${fogo.dias > 0 ? 'manter o fogo' : 'acender o fogo'}`}
                  {!fogo.congelou && ' · 1 congelador automático por ofensiva'}
                </p>
              </>
            )}
          </div>
        </div>

        {/* ── O NÚMERO. Um só. É ele que é o jogo. ── */}
        <button
          type="button"
          onClick={() => abrir('token')}
          data-teste="numero-token"
          className="mt-3 flex w-full items-end gap-2 rounded-xl px-1 py-1 text-left transition-colors hover:bg-nz-cinza-fundo/60"
        >
          <span className="text-3xl leading-none" aria-hidden="true">{medalha}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-nz-tinta-fraca">
              Human Token <Info className="w-3 h-3" />
            </span>
            <span className="block text-4xl font-extrabold leading-none text-nz-tinta tabular-nums">{fmtToken(token)}</span>
          </span>
        </button>
        <p className="mt-1.5 px-1 text-[10px] text-nz-tinta-fraca">
          {estudoEmDia
            ? `${ligaLabel} do ciclo · teto ${fmtToken(TOKEN_MAX)}`
            : 'trava 19,99 pra Platina — estudo em atraso no ciclo'}
        </p>

        {/* ── e os três que o alimentam, finos, embaixo ── */}
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-nz-borda/50 pt-3">
          <NumeroFino
            marca="mvm"
            rotulo="MvM oficial"
            valor={recebido.media !== null ? fmtToken(recebido.media) : '—'}
            rodape={recebido.media !== null ? xgame.frase_mvm : 'sem voto ainda'}
            alerta={recebido.media !== null && recebido.media < 4}
            onAbrir={abrir}
          />
          <NumeroFino
            marca="cotacao"
            rotulo="Cotação"
            valor={fmtToken(xgame.cotacao)}
            rodape={`dia ${xgame.dia_util} de ${CICLO_DIAS_UTEIS}`}
            onAbrir={abrir}
          />
          <NumeroFino
            marca="xpay"
            rotulo={`X-Pay ${ehHoje ? 'hoje' : 'do dia'}`}
            valor={fmtReais(xgame.xpay.ganho)}
            verde
            rodape={xgame.xpay.perdido > 0 ? `− ${fmtReais(xgame.xpay.perdido)} perdido` : `${fmtReais(xgame.xpay.emJogo)} em jogo`}
            alerta={xgame.xpay.perdido > 0}
            onAbrir={abrir}
          />
        </div>
        {xgame.xpay.pesoFalta > 0 && (
          <p className="mt-2 text-[10px] font-semibold text-amber-600" data-teste="xpay-faltam">
            dia vale {fmtReais(xgame.xpay.valorDia)} · peso {xgame.xpay.somaPesos} de {xgame.xpay.pesoReferencia}: falta {xgame.xpay.pesoFalta} pro dia completo
          </p>
        )}

        {/* 🧪 o relógio de teste, lá no fundo — fora da fileira de navegação */}
        {teste && (
          <div className="mt-3 flex justify-end border-t border-nz-borda/40 pt-2">
            <RelogioDeTeste teste={teste} />
          </div>
        )}
      </div>

      {folha && textos[folha] && (
        <FolhaExplicacao titulo={textos[folha].titulo} texto={textos[folha].texto} onFechar={() => setFolha(null)} />
      )}
    </div>
  );
}

// um dos três números de apoio: toca e a explicação abre
function NumeroFino({ marca, rotulo, valor, rodape, verde = false, alerta = false, onAbrir }) {
  return (
    <button
      type="button"
      onClick={() => onAbrir(marca)}
      data-teste={`numero-${marca}`}
      className="rounded-xl px-1 py-1 text-left transition-colors hover:bg-nz-cinza-fundo/60"
    >
      <span className="flex items-start gap-1 text-[9px] font-semibold uppercase leading-tight tracking-wide text-nz-tinta-fraca">
        <span className="min-w-0">{rotulo}</span><Info className="w-2.5 h-2.5 shrink-0 translate-y-px" />
      </span>
      <span className={`block text-lg font-bold leading-tight tabular-nums ${verde ? 'text-nz-verde' : 'text-nz-tinta'}`}>{valor}</span>
      <span className={`block truncate text-[9px] ${alerta ? 'font-semibold text-red-600' : 'text-nz-tinta-fraca'}`}>{rodape}</span>
    </button>
  );
}

// 📱 A FOLHA — a explicação que o `title=` nunca conseguiu mostrar no celular.
function FolhaExplicacao({ titulo, texto, onFechar }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      data-teste="folha-explicacao"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <button type="button" aria-label="fechar" onClick={onFechar} className="absolute inset-0 bg-black/60" />
      <div className="relative max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <p className="text-base font-extrabold text-nz-tinta">{titulo}</p>
          <button
            type="button"
            onClick={onFechar}
            aria-label="fechar"
            data-teste="folha-fechar"
            className="shrink-0 rounded-full p-1 text-nz-tinta-fraca hover:bg-nz-cinza-fundo hover:text-nz-tinta"
          ><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-nz-tinta-fraca">{texto}</p>
      </div>
    </div>
  );
}
