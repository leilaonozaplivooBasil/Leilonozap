import { useRef } from "react";

// PONTO 89 — decide se uma mensagem do chat merece a "entrada de live" (estilo
// presente do TikTok). Só anima o que ACABOU de chegar:
//  • id ainda não visto nesta sessão (histórico e re-render de sync não repetem)
//  • e criada nos últimos segundos (abrir a sala não dispara o show inteiro)
// Puramente visual: não lê, não altera e não depende de nenhuma regra de lance.
const idsVistos = new Set();
const JANELA_MS = 12000;

export default function useEntradaShow(message) {
  const decidido = useRef(null);

  if (decidido.current === null) {
    const id = message?.id;
    const criadoEm = new Date(message?.created_date || message?.timestamp || 0).getTime();
    const recente = Number.isFinite(criadoEm) && Date.now() - criadoEm < JANELA_MS;

    if (!id) {
      decidido.current = false;
    } else if (idsVistos.has(id)) {
      decidido.current = false;
    } else {
      idsVistos.add(id);
      decidido.current = recente;
    }
  }

  return decidido.current;
}