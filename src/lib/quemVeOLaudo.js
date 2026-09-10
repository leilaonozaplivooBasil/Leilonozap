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
// 🔴 O LIMITE HONESTO DESTA REGRA (medido em 10/09/2026):
// Ela decide se o BOTÃO aparece. Ela não abre a tela: o painel de
// comprovações inteiro mora atrás de `gestao` (= super_admin), lá em
// Licensing.jsx (`gestao={visPapel.superAdmin}`). Ou seja: hoje Ailton
// continua sem chegar até o botão, mesmo estando nesta lista. Abrir a tela
// pra ele é decisão à parte — expõe a fila de comprovações de todo mundo,
// junto dos botões de aprovar e reprovar. Está fora desta fase de propósito.
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
