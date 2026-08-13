import JSZip from 'jszip';

// 📦 PONTO 87 — Exporta o estoque em ZIP com planilha + pasta de imagens, pronto
// para o time de Marketing usar em campanhas de remarketing sem baixar imagem por imagem.
export async function exportEstoqueComImagensZip(produtos, { onProgress } = {}) {
  const comImagem = produtos.filter((p) => (p.image_urls && p.image_urls[0]));
  if (comImagem.length === 0) {
    throw new Error('Nenhum produto com imagem cadastrada para exportar.');
  }

  const zip = new JSZip();
  const pastaImagens = zip.folder('imagens');
  const linhas = [];
  let baixadas = 0;

  for (let i = 0; i < comImagem.length; i++) {
    const p = comImagem[i];
    const imgUrl = p.image_urls[0];
    const sku = p.lot || p.id;
    let nomeArquivo = '';
    try {
      const resp = await fetch(imgUrl);
      if (resp.ok) {
        const blob = await resp.blob();
        const ext = (blob.type.split('/')[1] || 'jpg').split(';')[0].replace('jpeg', 'jpg');
        nomeArquivo = `produto-${sku}.${ext}`;
        pastaImagens.file(nomeArquivo, blob);
        baixadas++;
      }
    } catch (e) {
      // Sem a imagem baixada, mas a linha continua na planilha com a URL original
    }

    linhas.push({
      Nome: p.description || '',
      Categoria: p.category || '',
      'Preço Loja': (p.selling_price_retail || 0).toFixed(2),
      'Preço Leilão': (p.market_value || 0).toFixed(2),
      Status: p.status || '',
      'URL da Imagem': imgUrl,
      Imagem: nomeArquivo || '(falhou ao baixar)',
      Estoque: p.quantity || 0,
    });

    if (onProgress) onProgress(i + 1, comImagem.length);
  }

  const headers = Object.keys(linhas[0]);
  const csvContent = [
    headers.join(';'),
    ...linhas.map((l) => headers.map((h) => `"${String(l[h]).replace(/"/g, '""')}"`).join(';')),
  ].join('\n');
  zip.file('relatorio-estoque.csv', '\uFEFF' + csvContent);

  const blob = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `estoque-nozap-${new Date().toISOString().split('T')[0]}.zip`;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { total: comImagem.length, baixadas };
}