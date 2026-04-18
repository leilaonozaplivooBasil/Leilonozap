import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx@0.18.5';

// Limpa valor monetário para número
function parseMoney(val) {
  if (val == null || val === '') return 0;
  if (typeof val === 'number') return val;
  return parseFloat(String(val).replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}

// Normaliza header para comparação
function norm(s) {
  return String(s || '').toUpperCase().trim().replace(/\s+/g, ' ');
}

// Tenta extrair dados diretamente da planilha sem LLM
function parseSpreadsheetDirect(workbook) {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    // Encontra linha de cabeçalho
    let headerIdx = -1;
    let headers = [];
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i];
      const normRow = row.map(norm);
      // Procura por cabeçalhos típicos desta planilha
      const hasLote = normRow.some(h => h === 'LOTE' || h === 'NR LOTE' || h === 'NUMERO LOTE');
      const hasQtd = normRow.some(h => h.includes('QTD') || h.includes('QUANTIDADE'));
      const hasDesc = normRow.some(h => h.includes('DESCRI') || h.includes('ITEM'));
      const hasMaterial = normRow.some(h => h.includes('MATERIAL'));
      if ((hasLote && hasQtd) || (hasMaterial && hasQtd) || (hasDesc && hasQtd && hasLote)) {
        headerIdx = i;
        headers = normRow;
        break;
      }
    }

    if (headerIdx === -1) continue;

    // Mapeia colunas
    const col = (keywords) => headers.findIndex(h => keywords.some(k => h.includes(k)));

    const colLote = col(['LOTE']);
    const colQtd = col(['QTD', 'QUANTIDADE']);
    const colDesc = col(['DESCRI', 'ITEM', 'PRODUTO']);
    const colValUnit = col(['VALOR UNIT', 'VL UNIT', 'UNIT']);
    const colValTotal = col(['VALOR TOTAL', 'VL TOTAL', 'TOTAL']);
    const colGrupo = col(['GRUPO', 'MATERIAL_SAP', 'MATERIAL SAP', 'COD']);
    const colCodML = col(['CODIGO ML', 'CÓDIGO ML', 'COD ML', 'ML']);

    if (colLote === -1 || colQtd === -1) continue;

    // Extrai número do leilão do conteúdo da planilha
    let numeroLeilao = 'LOTE-001';
    for (let i = 0; i < headerIdx; i++) {
      const rowStr = String(rows[i] || '').toUpperCase();
      // Procura padrão "LOTE 37,40,41..." ou "LEILÃO 186"
      const matchLote = rowStr.match(/LOTE[S\s]+(\d[\d,\s]+)/i);
      const matchLeilao = rowStr.match(/LEIL[ÃA]O[:\s]+(\d+)/i);
      if (matchLeilao) { numeroLeilao = matchLeilao[1]; break; }
      if (matchLote) { numeroLeilao = matchLote[1].replace(/\s/g, '').replace(/,/g, '-'); break; }
    }
    // Também varre células individuais
    if (numeroLeilao === 'LOTE-001') {
      for (let i = 0; i < headerIdx; i++) {
        for (const cell of (rows[i] || [])) {
          const s = String(cell || '');
          const m = s.match(/LOTE[S\s]+([\d,\s]+)/i) || s.match(/LEIL[ÃA]O[:\s]+(\d+)/i);
          if (m) { numeroLeilao = m[1].trim().replace(/\s/g, '').replace(/,+$/, ''); break; }
        }
        if (numeroLeilao !== 'LOTE-001') break;
      }
    }

    // Agrupa por lote
    const loteMap = {};
    let valorTotal = 0;

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(c => c === '' || c == null)) continue;

      const loteNum = String(row[colLote] || '').trim();
      if (!loteNum || loteNum.toUpperCase() === 'LOTE') continue;

      const qtd = parseInt(String(row[colQtd] || '1').replace(/\D/g, '')) || 1;
      const desc = colDesc >= 0 ? String(row[colDesc] || '').trim() : `Item ${loteNum}`;
      const valUnit = colValUnit >= 0 ? parseMoney(row[colValUnit]) : 0;
      const valTotal = colValTotal >= 0 ? parseMoney(row[colValTotal]) : valUnit * qtd;

      if (!loteMap[loteNum]) {
        loteMap[loteNum] = { numero_lote: loteNum, valor_lote: 0, produtos: [] };
      }

      if (desc) {
        loteMap[loteNum].produtos.push({ descricao: desc, quantidade: qtd });
      }
      loteMap[loteNum].valor_lote += valTotal;
      valorTotal += valTotal;
    }

    const lotes = Object.values(loteMap).filter(l => l.produtos.length > 0);
    if (lotes.length === 0) continue;

    // Se valorTotal = 0, tenta pegar da célula de total da planilha
    if (valorTotal === 0) {
      for (let i = 0; i < rows.length; i++) {
        for (const cell of (rows[i] || [])) {
          const v = parseMoney(cell);
          if (v > valorTotal && v < 10000000) valorTotal = v;
        }
      }
    }

    return { numero_leilao: numeroLeilao, valor_total: valorTotal, lotes };
  }

  return null;
}

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

    if (isSpreadsheet) {
      // Parse direto — sem LLM, imediato
      console.log('📊 Planilha detectada — parse direto (sem LLM)...');
      
      const fileResp = await fetch(file_url);
      if (!fileResp.ok) throw new Error(`Falha ao baixar arquivo: ${fileResp.status}`);
      
      const arrayBuffer = await fileResp.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      
      const result = parseSpreadsheetDirect(workbook);
      
      if (result && result.lotes.length > 0) {
        console.log('✅ Parse direto bem-sucedido:', result.lotes.length, 'lotes,', result.numero_leilao);
        return Response.json({ success: true, data: result });
      }

      // Fallback: LLM com CSV truncado (máx 8000 chars)
      console.log('⚠️ Parse direto não encontrou dados — usando LLM como fallback...');
      let textContent = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        if (csv.trim()) textContent += `\n\n=== ABA: ${sheetName} ===\n${csv}`;
      }
      textContent = textContent.substring(0, 8000); // limita para ser rápido

      const llmResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Extraia os dados desta planilha de leilão e retorne JSON com: numero_leilao (string), valor_total (number), lotes (array de {numero_lote, valor_lote, produtos: [{descricao, quantidade}]}).\n\nDADOS:\n${textContent}`,
        response_json_schema: {
          type: "object",
          properties: {
            numero_leilao: { type: "string" },
            valor_total: { type: "number" },
            lotes: { type: "array", items: { type: "object", properties: { numero_lote: { type: "string" }, valor_lote: { type: "number" }, produtos: { type: "array", items: { type: "object", properties: { descricao: { type: "string" }, quantidade: { type: "number" } }, required: ["descricao", "quantidade"] } } }, required: ["numero_lote", "produtos", "valor_lote"] } }
          },
          required: ["numero_leilao", "valor_total", "lotes"]
        }
      });

      return Response.json({ success: true, data: llmResult });
    }

    // PDF / Imagem: usa LLM com file_urls (suportado)
    const prompt = `
    Extraia os dados desta nota fiscal/documento de leilão e retorne JSON com:
    - numero_leilao: número do leilão
    - valor_total: valor total em número
    - lotes: array com cada lote contendo numero_lote, valor_lote e produtos (array com descricao e quantidade)

    REGRAS:
    - Se houver MATERIAL_SAP, cada linha é um lote separado
    - Converta valores BR (R$, vírgula) para número decimal
    - Se não encontrar número de leilão, use "LOTE-001"
    - Retorne APENAS o JSON
    `;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          numero_leilao: { type: "string" },
          valor_total: { type: "number" },
          lotes: { type: "array", items: { type: "object", properties: { numero_lote: { type: "string" }, valor_lote: { type: "number" }, produtos: { type: "array", items: { type: "object", properties: { descricao: { type: "string" }, quantidade: { type: "number" } }, required: ["descricao", "quantidade"] } } }, required: ["numero_lote", "produtos", "valor_lote"] } }
        },
        required: ["numero_leilao", "valor_total", "lotes"]
      }
    });

    console.log('✅ Extração via LLM concluída');
    return Response.json({ success: true, data: result });

  } catch (error) {
    console.error('❌ Erro:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});