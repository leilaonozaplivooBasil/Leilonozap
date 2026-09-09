import { useEffect, useState } from 'react';
import { ouvirPedidoDeTour } from '@/lib/pedidoDeTour';

// 🖐️ O TOUR DESTA TELA — a assinatura do pedido, num lugar só (09/09/2026).
//
// O botão "Como Funciona" mora no topo da Top College e não sabe como cada
// tela ensina a si mesma: ele só PEDE (src/lib/pedidoDeTour.js). Quem sabe
// atender, atende.
//
// Este hook é o lado de quem atende. Existe porque a mesma ligação —
// escutar o pedido, comparar o id, abrir a mãozinha — ia se repetir em cada
// tela nova, e régua copiada é como este projeto já perdeu `vendedor` e
// `influenciador` do selo de cargo: a cópia que fica pra trás quebra calada.
//
//   const [tourAberto, setTourAberto] = useTourDaTela('diario');
//   <TourGuiado ativo={tourAberto} passos={PASSOS} onFechar={() => setTourAberto(false)} />
//
// ⚠️ O id tem que bater com o de TOURS_DISPONIVEIS, senão o botão verde
// aparece e clicar nele não faz nada — pior que não ter botão. O teste
// tests/tourGuiadoAlvos.test.mjs cobra esse par.
export default function useTourDaTela(id) {
  const [aberto, setAberto] = useState(false);
  useEffect(() => ouvirPedidoDeTour((pedido) => { if (pedido === id) setAberto(true); }), [id]);
  return [aberto, setAberto];
}
