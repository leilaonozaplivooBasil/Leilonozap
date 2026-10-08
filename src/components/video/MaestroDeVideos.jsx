import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useReducer, useRef, useState } from 'react';
import {
  estadoInicial, maestroReducer, ambienteEconomico, TEMPO_MAXIMO_MS, ESPERA_PARA_COMECAR_MS,
} from '@/lib/maestroDeVideos';
import { calarARadio } from '@/lib/somDoDestaque';

/**
 * MaestroDeVideos — UM por tela. Decide qual card toca, quando passa a vez e cuida
 * do som da visita. A regra está em src/lib/maestroDeVideos.js (pura, testada no
 * Node); aqui só se ligam os olhos (IntersectionObserver), o relógio e a aba.
 *
 * Uso: envolva a grade de cards com <MaestroDeVideos> e, em cada card, chame
 * `useCartaoDeVideo(id, temVideo)`. Sem o maestro por perto o hook devolve `null`
 * e o card se comporta como sempre se comportou.
 */
const Contexto = createContext(null);

/** O card está bem à vista? Metade do quadrado de mídia já basta. */
const FRACAO_VISIVEL = 0.5;

export default function MaestroDeVideos({ children }) {
  const [estado, despachar] = useReducer(maestroReducer, undefined, estadoInicial);
  const elementos = useRef(new Map());          // id → elemento do quadrado de mídia
  const observador = useRef(null);
  const idDoElemento = useRef(new WeakMap());

  // 🌱 Economia de dados / movimento reduzido: nada toca sozinho. A foto fica e o
  // ícone de play deixa a pessoa escolher — vídeo é opção, não obrigação.
  const economico = useMemo(() => {
    try {
      return ambienteEconomico({
        conexao: typeof navigator !== 'undefined' ? navigator.connection : null,
        prefereMenosMovimento: typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
      });
    } catch { return false; }
  }, []);
  const economicoRef = useRef(economico);

  const reordenar = useCallback(() => {
    const ids = [...elementos.current.keys()];
    ids.sort((a, b) => {
      const ea = elementos.current.get(a);
      const eb = elementos.current.get(b);
      if (!ea || !eb || ea === eb) return 0;
      const pos = ea.compareDocumentPosition(eb);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
    despachar({ tipo: 'ordenar', ids });
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    observador.current = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        const id = idDoElemento.current.get(e.target);
        if (!id || economicoRef.current) continue;     // modo econômico: só o toque libera
        despachar({ tipo: 'visivel', id, visivel: e.isIntersecting && e.intersectionRatio >= FRACAO_VISIVEL });
      }
    }, { threshold: [0, FRACAO_VISIVEL, 1] });
    for (const el of elementos.current.values()) observador.current.observe(el);
    return () => { observador.current?.disconnect(); observador.current = null; };
  }, []);

  const registrar = useCallback((id) => despachar({ tipo: 'registrar', id }), []);
  const sair = useCallback((id) => {
    const el = elementos.current.get(id);
    if (el) { observador.current?.unobserve(el); elementos.current.delete(id); }
    despachar({ tipo: 'sair', id });
  }, []);
  const vincular = useCallback((id, el) => {
    const antigo = elementos.current.get(id);
    if (antigo && antigo !== el) { observador.current?.unobserve(antigo); elementos.current.delete(id); }
    if (el) {
      elementos.current.set(id, el);
      idDoElemento.current.set(el, id);
      observador.current?.observe(el);
    }
    reordenar();
  }, [reordenar]);

  // 😴 aba ou app em segundo plano: ninguém toca (nem gasta dados nem bateria)
  useEffect(() => {
    const sync = () => despachar({ tipo: document.hidden ? 'pausar' : 'retomar' });
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  // ⏱️ O relógio da vez: começou, tem TEMPO_MAXIMO_MS; não começou em tempo, falhou.
  useEffect(() => {
    if (!estado.ativo || estado.pausado) return undefined;
    const id = estado.ativo;
    const t = setTimeout(
      () => despachar({ tipo: estado.tocando ? 'terminou' : 'falhou', id }),
      estado.tocando ? TEMPO_MAXIMO_MS : ESPERA_PARA_COMECAR_MS,
    );
    return () => clearTimeout(t);
  }, [estado.ativo, estado.rodada, estado.tocando, estado.pausado]);

  const valor = useMemo(() => ({
    estado,
    economico,
    registrar, sair, vincular,
    tocando: (id) => despachar({ tipo: 'tocando', id }),
    terminou: (id) => {
      despachar({ tipo: 'terminou', id });
      // no modo econômico o vídeo é UMA reprodução pedida pela pessoa: terminou, volta a foto
      if (economicoRef.current) despachar({ tipo: 'visivel', id, visivel: false });
    },
    falhou: (id) => despachar({ tipo: 'falhou', id }),
    assumir: (id) => despachar({ tipo: 'assumir', id }),
    ligarSom: () => { despachar({ tipo: 'som', ligado: true }); calarARadio(); },
    calarSom: () => despachar({ tipo: 'som', ligado: false }),
  }), [estado, economico, registrar, sair, vincular]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

/**
 * O que um card precisa saber do maestro. `null` quando não há maestro (ou o card
 * não tem vídeo): quem chama trata como "sem vídeo sincronizado".
 */
export function useCartaoDeVideo(chave, habilitado = true) {
  const ctx = useContext(Contexto);
  // o MESMO produto pode aparecer em duas grades (destaque e lista): cada card é um card
  const unico = useId();
  const id = `${chave ?? 'card'}:${unico}`;
  const ativoNoMaestro = Boolean(ctx && habilitado && chave);
  const [jaAtivou, setJaAtivou] = useState(false);

  const registrar = ctx?.registrar;
  const sair = ctx?.sair;
  const vincular = ctx?.vincular;
  useEffect(() => {
    if (!ativoNoMaestro) return undefined;
    registrar(id);
    return () => sair(id);
  }, [ativoNoMaestro, id, registrar, sair]);

  const ref = useCallback((el) => { if (ativoNoMaestro) vincular(id, el); }, [ativoNoMaestro, id, vincular]);

  const ativo = ativoNoMaestro && ctx.estado.ativo === id;
  useEffect(() => { if (ativo) setJaAtivou(true); }, [ativo]);

  if (!ativoNoMaestro) return null;
  const e = ctx.estado;
  return {
    ref,
    ativo,
    deveTocar: ativo && !e.pausado,
    tocando: ativo && e.tocando && !e.pausado,
    rodada: e.rodada,
    som: e.som,
    jaAtivou: jaAtivou || ativo,
    economico: ctx.economico,
    assumir: () => ctx.assumir(id),
    aoTocando: () => ctx.tocando(id),
    aoFim: () => ctx.terminou(id),
    aoErro: () => ctx.falhou(id),
    ligarSom: ctx.ligarSom,
    calarSom: ctx.calarSom,
    aoSomBloqueado: ctx.calarSom,
  };
}
