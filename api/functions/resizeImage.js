// resizeImage — miniatura redimensionada no servidor para fotos de produto
// vindas do fornecedor. Hoje o app usa a foto ORIGINAL (às vezes vários MB)
// pra desenhar um ícone de 40-64px em listas com centenas/milhares de itens
// (balcão do PDV, gestão de lotes) — isso é o que deixa essas telas pesadas.
// Aqui baixa a imagem original, redimensiona/comprime em WEBP e devolve com
// cache longo. Qualquer falha cai no REDIRECT pra imagem original — nunca
// quebra a foto, só deixa de otimizar.
import sharp from 'sharp';
import { buscarComSeguranca } from '../_lib/urlSegura.js';

const LARGURAS_PERMITIDAS = [64, 96, 160, 240, 320, 480, 640];
const TETO_BYTES = 16 * 1024 * 1024;

// ══════════════════════════════════════════════════════════════════════════════
// 🔒 BLINDAGEM SSRF — FASE 1, item 5 (21/08/2026)
// ══════════════════════════════════════════════════════════════════════════════
// Esta rota JÁ tinha uma conferência (`origemSegura`), e ela pegava o básico:
// localhost, 127.x, 10.x, 192.168.x, 172.16-31.x, 169.254.x. Faltava o resto:
//   • IPv6 interno  — http://[::1]/ e http://[fd00::1]/ passavam;
//   • IP disfarçado — http://2130706433/ (é 127.0.0.1 escrito em decimal);
//   • domínio de rede interna — https://banco.internal/ passava;
//   • usuário/senha na URL, que disfarça o destino no log;
//   • e o furo que anulava tudo: **o fetch seguia redirecionamento sozinho**.
//     https://site-do-atacante.com/foto.jpg  →  302  →  http://169.254.169.254/
//     A primeira URL passava em qualquer conferência. Quem era buscado era a
//     segunda. Agora cada salto é conferido (ver api/_lib/urlSegura.js).
//
// ⚠️ `permitirHttp: true` de propósito: a miniatura serve foto de fornecedor, e
// parte do catálogo antigo ainda está em http://. Quem protege é a lista de
// redes, que vale nos dois esquemas.
//
// ⚠️ RISCO RESIDUAL mantido de propósito: o fallback continua sendo
// `res.redirect(302, url)` — devolver a foto original quando a otimização falha.
// Isso NÃO é SSRF (quem busca é o navegador do visitante, não o servidor), mas
// deixa a rota servir de "espelho" pra qualquer URL. Como só entra URL que já
// passou pelo porteiro, o espelho não alcança rede interna.

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  const url = req.query?.url;
  const wPedida = Number(req.query?.w);
  const width = LARGURAS_PERMITIDAS.includes(wPedida) ? wPedida : 240;

  if (!url) return res.status(400).json({ error: 'url inválida' });

  const baixada = await buscarComSeguranca(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    permitirHttp: true,
    maxBytes: TETO_BYTES,
    tiposAceitos: ['image/'],
  }).catch((e) => ({ ok: false, motivo: String(e?.message || e) }));

  // URL proibida pelo porteiro: 400 e ACABOU. Não pode cair no redirect de
  // fallback — mandar o navegador do visitante pra http://169.254.169.254 seria
  // trocar um buraco por outro.
  if (!baixada.ok && ['origem_respondeu_erro', 'tipo_nao_aceito', 'arquivo_grande_demais'].includes(baixada.motivo) === false) {
    return res.status(400).json({ error: `url recusada: ${baixada.motivo}` });
  }
  // A origem é legítima mas falhou (404, tipo estranho, foto gigante) — devolve a
  // original, como sempre fez. Nunca quebra o card do produto.
  if (!baixada.ok) return res.redirect(302, url);

  try {
    const buffer = Buffer.from(baixada.buffer);
    const redimensionada = await sharp(buffer)
      .resize(width, width, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    return res.status(200).send(redimensionada);
  } catch (e) {
    // Fornecedor com imagem corrompida, formato exótico, ou fetch falhou —
    // devolve a original em vez de quebrar o card do produto.
    return res.redirect(302, url);
  }
}
