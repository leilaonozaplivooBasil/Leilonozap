import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { file_url } = await req.json();
    
    if (!file_url) {
      return Response.json({ error: 'file_url obrigatório' }, { status: 400 });
    }

    console.log('📄 Processando nota fiscal:', file_url);

    const prompt = `
    Você é um especialista em análise de notas fiscais. Extraia TODOS os dados com MÁXIMA PRECISÃO.

    ═══════════════════════════════════════════════════════════════
    ESTRUTURA DA NOTA FISCAL:
    ═══════════════════════════════════════════════════════════════

    🎯 IDENTIFICAÇÃO DO FORMATO:

    **FORMATO 1: TABELA COM MATERIAL_SAP (prioridade)**
    Se houver uma coluna "MATERIAL_SAP", cada linha é um produto/lote separado:
    - MATERIAL_SAP = número do lote
    - DESCRIÇÃO = descrição do produto
    - QUANTIDADE: procure por "PEDIDO", "NOVO ESTOQUE", "QUANTIDADE" ou similar
    - VALOR TOTAL: procure por "TOTAL PEDIDO 1", "TOTAL NOVO ESTOQUE", "TOTAL PEDIDO", "VALOR" ou similar

    EXEMPLO COMPLETO (9 linhas):
    | MATERIAL_SAP | DESCRIÇÃO                                  | NOVO ESTOQUE | TOTAL NOVO ESTOQUE |
    |--------------|-------------------------------------------|--------------|---------------------|
    | 5132610      | CAIXA AMPLIFICADA 900W LENOXX LCA15      | 2            | 520,611             |
    | 5092664      | MULTIPROCESS BRITANIA ALL IN ONE BMP900  | 10           | 812,91              |
    | 5128075      | MULTIPROCESS MONDIAL MPN01BP PT/INX 127V | 11           | 1243,06875          |
    | 5132301      | FRITADEIRA ELET LENOXX PRF903P 127V      | 3            | 208,67175           |
    | 5146009      | PAN PRESSAO ELET SL BRITANIA BPP02G PR/PT| 10           | 1333,5              |
    | 5092664      | MULTIPROCESS BRITANIA ALL IN ONE BMP900  | 5            | 406,455             |
    | 5114354      | PAN PRESSAO ELET 5L MONDIAL PE38 PT/INX  | 10           | 1278,3225           |
    | 5103581      | MULTIPROCESSAD PHILIPS WALITA VIVA 127V  | 10           | 1358,175            |
    | 5178208      | TORRE DE SOM PHILCO PCX35000 3500W       | 2            | 1650,915            |

    TOTAL DA NOTA: R$ 8.812,63

    CÁLCULO:
    - Total produtos: 2+10+11+3+10+5+10+10+2 = 63
    - Valor total: 520.61+812.91+1243.07+208.67+1333.5+406.46+1278.32+1358.18+1650.92 = 8812.63

    EXTRAIR COMO:
    {
      "numero_leilao": "LOTE-001",
      "valor_total": 8812.63,
      "lotes": [
        {"numero_lote": "5132610", "valor_lote": 520.61, "produtos": [{"descricao": "CAIXA AMPLIFICADA 900W LENOXX LCA15", "quantidade": 2}]},
        {"numero_lote": "5092664", "valor_lote": 812.91, "produtos": [{"descricao": "MULTIPROCESS BRITANIA ALL IN ONE BMP900", "quantidade": 10}]},
        {"numero_lote": "5128075", "valor_lote": 1243.07, "produtos": [{"descricao": "MULTIPROCESS MONDIAL MPN01BP PT/INX 127V", "quantidade": 11}]},
        {"numero_lote": "5132301", "valor_lote": 208.67, "produtos": [{"descricao": "FRITADEIRA ELET LENOXX PRF903P 127V", "quantidade": 3}]},
        {"numero_lote": "5146009", "valor_lote": 1333.5, "produtos": [{"descricao": "PAN PRESSAO ELET SL BRITANIA BPP02G PR/PT", "quantidade": 10}]},
        {"numero_lote": "5092664-2", "valor_lote": 406.46, "produtos": [{"descricao": "MULTIPROCESS BRITANIA ALL IN ONE BMP900", "quantidade": 5}]},
        {"numero_lote": "5114354", "valor_lote": 1278.32, "produtos": [{"descricao": "PAN PRESSAO ELET 5L MONDIAL PE38 PT/INX", "quantidade": 10}]},
        {"numero_lote": "5103581", "valor_lote": 1358.18, "produtos": [{"descricao": "MULTIPROCESSAD PHILIPS WALITA VIVA 127V", "quantidade": 10}]},
        {"numero_lote": "5178208", "valor_lote": 1650.92, "produtos": [{"descricao": "TORRE DE SOM PHILCO PCX35000 3500W", "quantidade": 2}]}
      ]
    }

    ⚠️ CRÍTICO:
    1. Extraia TODAS as linhas da tabela, não pule nenhuma
    2. A quantidade SEMPRE vem da coluna NOVO ESTOQUE/PEDIDO
    3. Some TODAS as quantidades para obter total_produtos
    4. Some TODOS os valores para obter valor_total
    5. Se houver total na nota (ex: R$ 8.812,63), use esse valor exato

    ═══════════════════════════════════════════════════════════════

    **FORMATO 2: LEILÃO TRADICIONAL**
    Se NÃO houver MATERIAL_SAP, procure por:
    - "Nr. Do LEILÃO:" ou "Nº LEILÃO:" seguido de um NÚMERO
    - "LOTE:" seguido do número do lote
    - "DISCRIMINAÇÃO DO BEM" com produtos
    - "TOTAL:" ou "VALOR TOTAL:" no final

    REGRA: Quando encontrar "01 produto + 02 outro", separe em produtos individuais.

    ═══════════════════════════════════════════════════════════════
    REGRAS DE CONVERSÃO:
    ═══════════════════════════════════════════════════════════════

    1. SEMPRE converta valores removendo "R$", pontos de milhar, trocando vírgula por ponto
    2. Se não encontrar número de leilão, use "LOTE-001"
    3. MATERIAL_SAP é SEMPRE o número do lote quando presente
    4. Cada linha com MATERIAL_SAP é um lote separado com 1 produto
    5. A quantidade do produto vem da coluna (NOVO ESTOQUE, PEDIDO, etc) - NÃO use 1 como padrão!
    6. valor_total = SOMA de TODOS os valores de TODOS os lotes
    7. total_produtos = SOMA de TODAS as quantidades de TODOS os lotes (ex: se tem lote com 2, 10, 11, 3... total = 2+10+11+3+...)
    8. custo_por_unidade = valor_total ÷ total_produtos

    FORMATO DE RETORNO OBRIGATÓRIO:
    {
    "numero_leilao": "186",
    "valor_total": 16644.40,
    "lotes": [
    {
    "numero_lote": "15575",
    "valor_lote": 633.49,
    "produtos": [
      {"descricao": "produto 1", "quantidade": 1}
    ]
    }
    ]
    }

    ⚠️ IMPORTANTE: Retorne APENAS o JSON, sem explicações ou texto adicional.
    `;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          numero_leilao: { type: "string" },
          valor_total: { type: "number" },
          lotes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                numero_lote: { type: "string" },
                valor_lote: { type: "number" },
                produtos: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      descricao: { type: "string" },
                      quantidade: { type: "number" }
                    },
                    required: ["descricao", "quantidade"]
                  }
                }
              },
              required: ["numero_lote", "produtos", "valor_lote"]
            }
          }
        },
        required: ["numero_leilao", "valor_total", "lotes"]
      }
    });

    console.log('✅ Extração concluída:', JSON.stringify(result));

    return Response.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});