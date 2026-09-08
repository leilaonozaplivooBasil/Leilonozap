// 🖼️ A FAMÍLIA VISUAL DA TAREFA — de onde vem o selo e a cena do momento
// quando o TÍTULO sozinho não converge (dono, 08/09/2026): "quando uma
// pessoa gera um horário através do quadro, através da lista, ou pela
// geração automática, está gerando uma imagem aleatória... precisa ter esse
// comando pra a imagem convergir, pra pessoa olhar e entender a imagem".
//
// A régua de título (SELOS em XGameJornada.jsx, CENAS em XGameCapas.jsx) já
// cobre bem as palavras do dia a dia (treino, leitura, venda…). O que ela
// não pega são as ações do Catálogo (Distribuir Tarefa) e da Rotina
// Perfeita escritas como frase de negócio — "Decidir com os números: o
// gargalo da empresa nesta semana" não tem "número" no vocabulário de
// nenhuma das duas listas.
//
// A SAÍDA: não inventar uma terceira régua. `ferramentaDaTarefa` já lê o
// título com uma cobertura mais larga (ela decide pra que Hábito o botão
// "abrir ferramenta" leva) e toda tarefa do X-Performance já grava o Hábito
// no banco. Aqui só se traduz Hábito → família visual, na MESMA linguagem
// dos 8 Hábitos do time que a pessoa já vê no resto do app.
import { ferramentaDaTarefa } from './ferramentaDaTarefa.js';

/** Hábito (1-8) → família visual. Só entram os que têm um selo/cena
 *  coerente nas telas — os demais ficam com o título ou o padrão. */
export const FAMILIA_POR_HABITO = {
  1: 'sonho', // Quadro dos Sonhos — gratidão, visualização
  2: 'compromisso', // a rotina do dia
  3: 'lista', // Lista de Networking
  4: 'contato', // Contato e Convite
  5: 'apresentacao', // Apresentação de Sucesso
  6: 'fechamento', // Acompanhamento e Fechamento
  7: 'verificacao', // Verificação do Progresso — números, visão estratégica
  8: 'treinamento', // Duplicação — treinar, ensinar
};

/**
 * A família visual de uma tarefa: o Hábito GRAVADO nela primeiro (quem
 * distribuiu já sabia pra onde ia); sem isso, o Hábito lido no título pela
 * mesma régua do botão "abrir ferramenta". `null` quando nem um nem outro
 * dizem nada — a tela decide o desenho padrão.
 */
export function familiaDaTarefa({ titulo, habito } = {}) {
  const gravado = FAMILIA_POR_HABITO[Number(habito)];
  if (gravado) return gravado;
  const ferramenta = ferramentaDaTarefa(titulo);
  return (ferramenta && FAMILIA_POR_HABITO[ferramenta.habito]) || null;
}
