// 🔊 SOM DA INTERFACE — um lugar só para o retorno sonoro dos botões.
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE ISTO EXISTE (17/09/2026)
// ═══════════════════════════════════════════════════════════════════════════
// Pedido do dono: som ao avançar e ao concluir as etapas do Ritual do
// Amanhecer, "e posteriormente vamos aplicar em mais funções do Método".
//
// O projeto JÁ tinha som — preso dentro de `src/pages/AuctionRoom.jsx`, num
// `useCallback` que ninguém de fora alcança. Copiar aquele bloco para cada tela
// nova é como as listas fixas de banner nasceram: três cópias, três verdades.
// Aqui é o oposto: quem quiser som importa esta função e chama.
//
// ═══════════════════════════════════════════════════════════════════════════
// AS QUATRO REGRAS QUE FAZEM ISSO NÃO QUEBRAR NADA
// ═══════════════════════════════════════════════════════════════════════════
// 1. NUNCA LANÇA. Tudo dentro de try/catch, e o catch é mudo. Navegador sem
//    Web Audio, aba sem permissão, aparelho sem saída de som — a função volta
//    em silêncio e quem chamou nem percebe.
// 2. NUNCA É ESPERADA. É síncrona e não devolve promessa. Ninguém consegue,
//    nem por engano, escrever `await som(...)` e travar um salvamento atrás
//    de um bipe.
// 3. NASCE NO PRIMEIRO CLIQUE. O AudioContext é criado na primeira chamada, e
//    não na montagem da tela. Navegador bloqueia áudio antes de um gesto do
//    usuário; criando aqui, o gesto É o clique que pediu o som. Sem isso, o
//    contexto nasceria suspenso e o primeiro som sairia mudo.
// 4. ZERO ARQUIVO. O som é sintetizado na hora (osciladores). Nada para
//    baixar, nada para faltar no cache, funciona offline e não atrasa tela.
//
// ═══════════════════════════════════════════════════════════════════════════
// SILÊNCIO É DIREITO DE QUEM ACORDA ÀS 4:40
// ═══════════════════════════════════════════════════════════════════════════
// O ritual começa 04:40. Tem gente fazendo do lado de quem dorme. O
// interruptor fica no navegador da pessoa (localStorage), não numa coluna do
// banco: é preferência de aparelho, não de conta — o mesmo usuário pode querer
// som no computador e silêncio no celular da cabeceira.

const CHAVE_SILENCIO = 'nz_som_desligado';

let contexto = null;

/** Liga/desliga o som neste aparelho. */
export function silenciarSom(desligado) {
  try { localStorage.setItem(CHAVE_SILENCIO, desligado ? '1' : '0'); } catch { /* sem storage, segue com som */ }
}

/** O som está desligado NESTE aparelho? */
export function somDesligado() {
  try { return localStorage.getItem(CHAVE_SILENCIO) === '1'; } catch { return false; }
}

// Cada som é uma receita curta. Tudo curto de propósito: retorno de botão que
// dura mais que ~0,3s vira ruído e a pessoa desliga o som inteiro.
const RECEITAS = {
  // avançar etapa: uma nota curta e limpa, subindo de leve
  passo: [{ de: 620, para: 780, dur: 0.12, vol: 0.18 }],
  // concluir o ritual: duas notas, a segunda mais alta — "terminou"
  conclusao: [
    { de: 660, para: 660, dur: 0.11, vol: 0.2 },
    { de: 990, para: 990, dur: 0.22, vol: 0.2, atraso: 0.1 },
  ],
  // algo não deu certo: uma nota baixa e curta, sem drama
  erro: [{ de: 300, para: 220, dur: 0.16, vol: 0.16 }],
};

/**
 * Toca um som da interface. Nome desconhecido, som desligado, navegador sem
 * áudio: volta em silêncio, sem erro.
 *
 * @param {'passo'|'conclusao'|'erro'} nome
 */
export function som(nome) {
  try {
    const receita = RECEITAS[nome];
    if (!receita) return;
    if (somDesligado()) return;
    if (typeof window === 'undefined') return;

    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!contexto) contexto = new Ctx();
    // Aba que ficou parada suspende o contexto sozinha; o clique atual é o
    // gesto que autoriza religar. `resume` devolve promessa — ignorada de
    // propósito (regra 2): o som deste clique pode sair mudo, o próximo sai.
    if (contexto.state === 'suspended') contexto.resume().catch(() => {});

    const agora = contexto.currentTime;
    for (const nota of receita) {
      const osc = contexto.createOscillator();
      const ganho = contexto.createGain();
      osc.connect(ganho);
      ganho.connect(contexto.destination);
      osc.type = 'sine';
      const t = agora + (nota.atraso || 0);
      osc.frequency.setValueAtTime(nota.de, t);
      if (nota.para !== nota.de) osc.frequency.exponentialRampToValueAtTime(nota.para, t + nota.dur);
      // 🔴 ATAQUE E QUEDA SUAVES, não corte seco. Ligar e desligar um
      // oscilador no volume cheio produz um "clique" (descontinuidade na
      // onda) que soa pior que o som pretendido.
      ganho.gain.setValueAtTime(0.0001, t);
      ganho.gain.exponentialRampToValueAtTime(nota.vol, t + 0.012);
      ganho.gain.exponentialRampToValueAtTime(0.0001, t + nota.dur);
      osc.start(t);
      osc.stop(t + nota.dur + 0.02);
    }
  } catch {
    // 🔇 mudo de propósito: som é enfeite, nunca motivo de erro na tela.
  }
}

export default som;
