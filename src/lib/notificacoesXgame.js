// 🔔 O SINO — notificação persistente do X-GAME/Método (09/09/2026, DIR-130).
//
// O PEDIDO (dono): "está faltando um sininho de notificação... quando a
// pessoa abrir o aplicativo, tem que entrar uma mensagem como fosse a
// venda, e ficar ali até ela identificar, e fechar ou esperar um tempo, uns
// dez segundos, e dar a opção dela fechar. Não pode ter certeza que ela viu,
// e ficar no sininho pra ela ler... eu mandei essas duas notificações aí, a
// pessoa ficou com dificuldade de receber, só apareceu no quadro."
//
// Reaproveita `xgame_mensagens` (DIR-106/107) — o mesmo canal que já leva o
// "avisar" da Fila do Pronto pra dentro da plataforma — em vez de inventar
// uma tabela nova. Este arquivo só decide QUAL mensagem vira banner agora e
// QUANTO tempo falta pro botão de fechar liberar; ler/enviar continua nas
// mesmas funções puras de `mensagensXgame.js`.

/** Segundos que o banner fica com o "fechar" desabilitado — "não pode ter
 * certeza que ela viu" sem um mínimo de tempo na tela. */
export const SEGUNDOS_ANTES_DE_FECHAR = 10;

/**
 * Qual mensagem recebida vira banner agora: a mais ANTIGA ainda não lida e
 * que esta sessão ainda não descartou do banner (fechar o banner não marca
 * como lida — só sai da tela; continua no sino até a pessoa abrir de
 * verdade). Mais antiga primeiro: quem tem duas notificações represadas vê
 * a que está esperando há mais tempo, não a última que chegou por cima.
 */
export function proximaParaBanner(recebidas = [], idsDispensadosNaSessao = new Set()) {
  const pendentes = (Array.isArray(recebidas) ? recebidas : [])
    .filter((m) => m && !m.lida && !idsDispensadosNaSessao.has(m.id));
  if (!pendentes.length) return null;
  return pendentes.slice().sort((a, b) => String(a?.created_at || '').localeCompare(String(b?.created_at || '')))[0];
}
