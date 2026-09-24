// 🔐 QUEM PODE ABRIR O LAUDO — a Fase 3 (10/09/2026).
//
// Dono: "PDF só para o gestor admin e para Ailton Ávilla."
//
// São duas regras de natureza diferente, e o arquivo mantém as duas separadas
// de propósito:
//
//   1. POR PAPEL — super admin e administrador. Essa envelhece bem: quem
//      entrar nesses papéis amanhã já entra com o laudo.
//   2. POR PESSOA — uma lista de ids. Essa APODRECE, e está aqui assumida
//      como dívida, com nome e data, não escondida no meio de um `if`.
//
// ⚠️ POR QUE A LISTA DE ID EXISTE
// Ailton tem `role: 'user'` no banco. Nenhuma checagem de papel o alcança —
// e inventar um papel novo só pra ele seria pior: mudaria o que ele enxerga
// em TODA a plataforma pra resolver um botão. A lista é o menor estrago
// possível, e é reversível numa linha.
//
// ONDE ESTA REGRA VALE (10/09/2026)
// Em dois lugares, e eles são diferentes:
//   • na FILA DO GESTOR (Comprovacoes.jsx) ela decide se o botão do laudo
//     aparece — mas a fila inteira já mora atrás de `gestao` (= super_admin,
//     em Licensing.jsx), então lá ela só restringe, nunca libera;
//   • na TELA SÓ-LAUDO (PainelLaudo.jsx) ela é a única porta. É por ali que
//     quem está nesta lista chega, sem a fila e sem os botões de aprovar e
//     reprovar — que mexeriam no dia das pessoas.
//
// 🔴 O LIMITE HONESTO, MEDIDO NO BANCO EM 10/09/2026:
// Isto é uma porta mais estreita, NÃO um cofre. `metodo_tarefas` está com
// RLS ligada, mas com policy `USING (true)` pra `public` no SELECT, no UPDATE
// e no DELETE — e todo navegador fala com o Supabase como `anon`. Os dados já
// estão ao alcance de qualquer sessão logada, com ou sem esta regra. O que
// esta camada faz é não ENTREGAR o poder de decisão junto com a leitura.
// Fechar aquilo de verdade é trabalho no servidor, e não cabia nesta fase.
import { visibilidadeDoUsuario } from './visibilidadePorPapel.js';

/**
 * As pessoas liberadas por NOME, fora da matriz de papéis.
 *
 * Toda linha aqui é dívida: guarda `quem`, `quando` e `porQue` pra que daqui
 * a seis meses dê pra saber se ainda faz sentido — em vez de um id solto que
 * ninguém tem coragem de apagar.
 */
export const LAUDO_LIBERADO_POR_PESSOA = Object.freeze([
  Object.freeze({
    id: 'af8f3ea05853e7bd96077e70',
    quem: 'Ailton Ávilla',
    quando: '2026-09-10',
    porQue: 'pedido do dono: ele atende a reclamação junto com a gestão, mas tem role "user"',
  }),
]);

/**
 * 📄 24/09/2026 — O LAUDO DO PRÓPRIO DIA: quem pode gerar o laudo SÓ DE SI.
 *
 * Dono: "dê ao Emannuel no ADM do X-Game a opção de gerar seu próprio
 * relatório (laudo) em PDF."
 *
 * É uma porta diferente da de cima, de propósito: quem está aqui NÃO vê o
 * laudo de mais ninguém — o seletor de pessoa trava nele mesmo. Emannuel é
 * diretor de operação com `role: 'user'`; a matriz de papéis não o alcança
 * e liberá-lo pela lista de cima entregaria o dia de toda a equipe junto.
 * Mesma dívida, mesma regra: quem, quando e por quê.
 */
export const LAUDO_DO_PROPRIO_DIA = Object.freeze([
  Object.freeze({
    id: '2b7c054de6c3ae61deea8d74',
    quem: 'Emannuel Alves de Lima',
    quando: '2026-09-24',
    porQue: 'pedido do dono: ele quer conferir o próprio dia (a pendência do acordar) e levar o PDF, sem ver o de mais ninguém',
  }),
]);

/**
 * O alcance do laudo pra quem está olhando:
 *   'todos'   — gestor admin e a lista nominal de cima (escolhe a pessoa);
 *   'proprio' — só o próprio dia (o seletor trava na própria pessoa);
 *   null      — não abre.
 */
export function escopoDoLaudo(usuario) {
  if (podeVerLaudo(usuario)) return 'todos';
  const id = String(usuario?.id || '');
  if (id && LAUDO_DO_PROPRIO_DIA.some((p) => p.id === id)) return 'proprio';
  return null;
}

/** Quem pode gerar o laudo em PDF de QUALQUER pessoa da equipe. */
export function podeVerLaudo(usuario) {
  if (!usuario) return false;
  const vis = visibilidadeDoUsuario(usuario);
  // "gestor admin": o dono da plataforma e o administrador. Financeiro e
  // diretoria NÃO entram — eles têm visão total do NEGÓCIO, e o laudo é
  // registro de conduta de uma pessoa, que é outra conversa.
  if (vis.superAdmin || vis.adminGeral) return true;
  const id = String(usuario?.id || '');
  return !!id && LAUDO_LIBERADO_POR_PESSOA.some((p) => p.id === id);
}
