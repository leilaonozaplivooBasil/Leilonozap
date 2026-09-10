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

/** Quem pode gerar o laudo em PDF. */
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
