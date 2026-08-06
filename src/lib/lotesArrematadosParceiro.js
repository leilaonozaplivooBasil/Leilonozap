// 📦 Lotes REAIS já arrematados pela operação, escolhidos a dedo para consulta do
// Parceiro. A planilha é a mesma do arremate e os custos são os do nosso registro
// de compra. Leitura pura: nada aqui altera estoque, produtos ou financeiro.
export const LOTES_ARREMATADOS = [
  {
    nome: 'Lote 46-48 — Rio de Janeiro',
    dataArremate: '16/04/2026',
    arquivo: 'LOTE 46-48 ARREMATADO 16-04-2026 RIO DE JANEIRO.xlsx',
    url: 'https://media.base44.com/files/public/68d536db3c26ff51f79c4137/dd5358f44_LOTE46-48-ARREMATADO16042026RIODEJANEIRO.xlsx',
    custos: { arremate: 18666, taxaPct: 7, frete: 2500, outros: 200 },
  },
  {
    nome: 'Lote 46-48 — Rio de Janeiro (completo)',
    dataArremate: '16/04/2026',
    arquivo: 'LOTE 46-48 RIO DE JANEIRO COMPLETO.xlsx',
    url: 'https://media.base44.com/files/public/68d536db3c26ff51f79c4137/a5df823e9_LOTE46-48-RIODEJANEIRO-COMPLETO.xlsx',
    custos: { arremate: 18666, taxaPct: 7, frete: 2500, outros: 200 },
  },
  {
    nome: 'Lote 51 — Rio de Janeiro',
    dataArremate: '2026',
    arquivo: 'LOTE 51 RIO DE JANEIRO COMPLETO.xlsx',
    url: 'https://media.base44.com/files/public/68d536db3c26ff51f79c4137/f74b163a8_LOTE51-RIODEJANEIRO-COMPLETO.xlsx',
    custos: { arremate: 18612.06, taxaPct: 7, frete: 2500, outros: 0 },
  },
];

// Lê a planilha do lote e devolve o lote no formato do analisador.
export async function carregarLoteArrematado(XLSX, lerPlanilhaMercadoLivre, loteDaPlanilha, item) {
  const resposta = await fetch(item.url);
  if (!resposta.ok) throw new Error('Não foi possível carregar a planilha deste lote.');
  const buffer = await resposta.arrayBuffer();
  const lido = lerPlanilhaMercadoLivre(XLSX, XLSX.read(buffer, { type: 'array' }), item.arquivo);
  const lote = loteDaPlanilha(lido, item.custos);
  return { ...lote, id: item.url, nome: item.nome, data: item.dataArremate };
}