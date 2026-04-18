import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';

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

    console.log('📄 Processando arquivo:', file_url);

    const fileNameLower = file_url.toLowerCase();
    const isSpreadsheet = fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls') || fileNameLower.endsWith('.csv');

    const prompt = `
    Você é um especialista em análise de notas fiscais e planilhas de leilão. Extraia TODOS os dados com MÁXIMA PRECISÃO.

    ═══════════════════════════════════════════════════════════════
    ESTRUTURA DO DOCUMENTO:
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

    EXTRAIR COMO:
    {
      "numero_leilao": "LOTE-001",
      "valor_total": 8812.63,
      "lotes": [
        {"numero_lote": "5132610", "valor_lote": 520.61, "produtos": [{"descricao": "CAIXA AMPLIFICADA 900W LENOXX LCA15", "quantidade": 2}]},
        {"numero_lote": "5092664", "valor_lote": 812.91, "produtos": [{"descricao": "MULTIPROCESS BRITANIA ALL IN ONE BMP900", "quantidade": 10}]}
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
    7. total_produtos = SOMA de TODAS as quantidades de TODOS os lotes

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

    const responseSchema = {
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
    };

    let result;

    if (isSpreadsheet) {
      // Para planilhas Excel/CSV: baixa o arquivo e converte para texto tabular
      console.log('📊 Arquivo é planilha — fazendo parse local com xlsx...');
      
      const fileResp = await fetch(file_url);
      if (!fileResp.ok) throw new Error(`Falha ao baixar arquivo: ${fileResp.status}`);
      
      const arrayBuffer = await fileResp.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      
      // Converte todas as abas para texto CSV para enviar ao LLM
      let textContent = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        if (csv.trim()) {
          textContent += `\n\n=== ABA: ${sheetName} ===\n${csv}`;
        }
      }
      
      console.log('📝 Conteúdo extraído da planilha (primeiros 500 chars):', textContent.substring(0, 500));
      
      result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt + `\n\nCONTEÚDO DA PLANILHA:\n${textContent}`,
        response_json_schema: responseSchema
      });
    } else {
      // Para PDF e imagens: envia direto via file_urls (suportado pelo LLM)
      result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [file_url],
        response_json_schema: responseSchema
      });
    }

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