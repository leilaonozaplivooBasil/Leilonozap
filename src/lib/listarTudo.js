// listarTudo — carrega TODAS as linhas de uma entidade, em blocos de 1000.
//
// Por que existe (DIR-20, 30/08/2026): o Supabase corta qualquer resposta em
// 1.000 linhas por padrão e NÃO avisa — pedir `.list('-created_date', 5000)`
// devolve só as 1.000 mais novas, sem erro. A Gestão de Estoque já tinha
// descoberto isso em 20/08 e paginado na mão; o CRM não, e o "Valor Investido
// em Estoque" somava só os 1.000 produtos mais novos (R$ 9.595 em vez dos
// R$ 28.133 reais). Esta função é o padrão único: quem precisa da tabela
// INTEIRA usa ela, nunca um limit alto numa tacada só.
//
// Paginação por CURSOR (keyset em `id`), não por offset: um cadastro ou uma
// exclusão no meio do carregamento desloca as linhas de um offset e a página
// seguinte repete ou PULA uma linha. Ancorando no último `id` lido, cada
// bloco continua de onde o anterior parou. `id` serve de âncora porque é
// único e o adapter já ordena por ele em toda consulta (Ponto 93 em
// src/api/plataformaAdapter.js).
const PAGE = 1000;
const MAX_BLOCOS = 50; // trava de segurança contra laço infinito

/**
 * @param entidade um handle de plataforma.entities (ex.: plataforma.entities.Product)
 * @param filtroBase filtros fixos aplicados a todo bloco (ex.: { catalog_active: true })
 * @returns todas as linhas, sem ordem garantida além de id crescente
 */
export async function listarTudo(entidade, filtroBase = {}) {
  const tudo = [];
  const vistos = new Set();
  let ultimoId = '';
  for (let bloco_n = 0; bloco_n < MAX_BLOCOS; bloco_n++) {
    const filtro = ultimoId ? { ...filtroBase, id: { $gt: ultimoId } } : { ...filtroBase };
    const bloco = await entidade.filter(filtro, 'id', PAGE);
    if (!Array.isArray(bloco) || bloco.length === 0) break;
    for (const linha of bloco) {
      if (!linha?.id || vistos.has(linha.id)) continue;
      vistos.add(linha.id);
      tudo.push(linha);
    }
    ultimoId = bloco[bloco.length - 1]?.id || '';
    if (bloco.length < PAGE || !ultimoId) break;
  }
  return tudo;
}
