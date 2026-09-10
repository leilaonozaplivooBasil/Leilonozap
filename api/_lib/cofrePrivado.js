// 🔐 COFRE PRIVADO — guardar e ouvir/ver arquivo pessoal (09/09/2026).
//
// Nasceu extraído do `audioDoDitado`, quando o segundo cofre apareceu: os
// vídeos da visualização do ritual estavam no `public-assets`, que é público —
// 9 gravações do rosto de alguém meditando às 6h da manhã, abertas por link,
// sem login. Copiar as 145 linhas do cofre de áudio pra um segundo arquivo
// seria copiar junto a trava de dono, o corte de `..` no caminho e o limite de
// tamanho — e num deles, um dia, alguém consertaria só metade.
//
// COMO FUNCIONA, E POR QUE ASSIM:
// os buckets não têm NENHUMA policy. É de propósito: este app fala com o
// Supabase como `anon` (o login é a tabela `app_users`, não o Supabase Auth),
// então qualquer policy que deixasse o navegador escrever deixaria QUALQUER UM
// escrever. Sem sessão do banco não existe "só o dono". Quem confere é esta
// peça, olhando o crachá — e por isso ela é uma só.
import { exigirSessao } from './sessao.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const VALIDADE_LINK_SEG = 60 * 10;   // 10 min: tempo de ver, não de arquivar

/**
 * O caminho tem que ser exatamente `xgame/<pasta>/<uid>/<arquivo>`.
 *
 * É a checagem que faz o cofre ser individual: o `uid` está DENTRO do caminho,
 * então "posso mexer neste arquivo?" vira "este caminho é meu?". Sem isso,
 * bastaria pedir o caminho de outra pessoa pra abrir o arquivo dela.
 */
export function donoDoCaminho(caminho) {
  const partes = String(caminho || '').split('/');
  if (partes.length < 4) return null;
  if (partes[0] !== 'xgame') return null;
  // nenhum pedaço pode escapar da pasta (..), nem vir vazio
  if (partes.some((p) => !p || p === '.' || p === '..')) return null;
  return partes[2];
}

export function corpoBruto(req, limiteBytes) {
  return new Promise((resolve, reject) => {
    const pedacos = [];
    let total = 0;
    req.on('data', (c) => {
      total += c.length;
      if (total > limiteBytes) { reject(new Error('arquivo_grande')); req.destroy(); return; }
      pedacos.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(pedacos)));
    req.on('error', reject);
  });
}

/**
 * É gestor? Lido do BANCO, nunca do corpo da requisição.
 *
 * Existe só pro cofre do VÍDEO: a tela do ritual promete, com todas as letras,
 * "o vídeo é a sua comprovação — só você E O GESTOR veem". Então o gestor ver
 * não é brecha, é a funcionalidade. O cofre da VOZ não tem esta porta de
 * propósito: gratidão é da pessoa, e ninguém pediu pra gestão ouvir.
 */
async function ehGestor(userId) {
  if (!userId) return false;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/app_users?select=role&id=eq.${encodeURIComponent(userId)}&limit=1`,
      { headers: { apikey: SR, Authorization: `Bearer ${SR}` }, signal: AbortSignal.timeout(5000) },
    );
    const j = await r.json().catch(() => []);
    return ['admin', 'super_admin'].includes(String(j?.[0]?.role || ''));
  } catch { return false; }
}

const sb = (caminho, opts = {}) => fetch(`${SUPABASE_URL}/storage/v1/${caminho}`, {
  ...opts,
  headers: { apikey: SR, Authorization: `Bearer ${SR}`, ...(opts.headers || {}) },
});

export const cofreConfigurado = () => !!(SUPABASE_URL && SR);

/**
 * 🔴 10/09/2026 — O MIME COM CODEC DERRUBAVA TODO UPLOAD.
 *
 * O navegador grava com `audio/webm;codecs=opus` (e `video/webm;codecs=vp8,opus`).
 * O Supabase compara a string INTEIRA contra a lista de mimes do bucket, que
 * tem `audio/webm` — e recusa com 415 invalid_mime_type.
 *
 * Consequência medida: o cofre de voz subiu em 09/09 e NUNCA guardou um único
 * arquivo. Ninguém reclamou porque guardar é best-effort e o ritual não cai.
 * Nos logs de produção do dia 10: `mime type audio/webm;codecs=opus is not
 * supported`, em toda tentativa.
 */
export const mimeLimpo = (mime, reserva = 'application/octet-stream') =>
  String(mime || '').split(';')[0].trim().toLowerCase() || reserva;

/**
 * 🔴 10/09/2026 — E O ARQUIVO NÃO PODE PASSAR POR DENTRO DA FUNÇÃO.
 *
 * A Vercel corta o corpo da requisição em ~4,5 MB ANTES de chegar aqui: o
 * `limiteBytes` de 100 MB que a rota do vídeo declarava é um número que a
 * plataforma nunca honrou. No Ritual de 10/09 foram 11 tentativas e 11
 * respostas HTTP 413 — nenhuma gravação salva, cinco pessoas tentando de novo.
 *
 * A saída é o navegador falar DIRETO com o Storage, com uma autorização de uso
 * único que só este servidor sabe emitir. A trava de dono não se perde: quem
 * decide o caminho (com o uid dentro dele) continua sendo esta função, o
 * navegador nunca vê a chave de serviço, e o bucket segue privado e sem policy.
 *
 * Devolve { caminho, token } ou null.
 */
async function autorizacaoDeEnvio(bucket, caminho) {
  const r = await sb(`object/upload/sign/${bucket}/${caminho}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.url) return null;
  const token = new URL(`https://x${j.url}`).searchParams.get('token');
  return token ? { caminho, token } : null;
}

/**
 * O handler completo de um cofre. Cada rota só declara QUAL cofre é e o que
 * cabe nele — a regra de quem pode o quê fica aqui, uma vez.
 *
 * @param bucket        id do bucket privado
 * @param limiteBytes   teto do arquivo
 * @param rota          nome pro log da sessão
 * @param naoEMeu       mensagem do 403 ao ler
 * @param naoEMinhaPasta mensagem do 403 ao gravar
 * @param erroAoGuardar mensagem quando o Storage recusa
 */
export function atenderCofre({ bucket, limiteBytes, rota, naoEMeu, naoEMinhaPasta, erroAoGuardar, gestorPodeVer = false }) {
  return async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    if (!cofreConfigurado()) {
      return res.status(200).json({ ok: false, error: 'O cofre não está configurado aqui.' });
    }

    // ── ver/ouvir: devolve um link assinado de curta validade ──────────────
    if (req.method === 'GET') {
      const caminho = String(req.query?.caminho || '');
      const actorId = String(req.query?.actorId || '');
      const dono = donoDoCaminho(caminho);
      if (!dono) return res.status(400).json({ ok: false, error: 'caminho inválido' });

      // O crachá manda; sem ele (etapa 1 da ligação em duas etapas) cai no
      // actorId do corpo, que é o mesmo nível de confiança do resto da casa.
      const ses = exigirSessao(req, actorId, rota, true);
      const eu = ses.userId || actorId;
      // O dono sempre; o gestor SÓ onde a tela já prometeu que ele veria.
      // Guardar continua sendo só do dono, em todo cofre: gestor não planta
      // arquivo na pasta de ninguém.
      const podeVer = String(eu || '') === String(dono) || (gestorPodeVer && await ehGestor(eu));
      if (!podeVer) {
        return res.status(403).json({ ok: false, error: naoEMeu });
      }

      const r = await sb(`object/sign/${bucket}/${caminho}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: VALIDADE_LINK_SEG }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.signedURL) {
        return res.status(200).json({ ok: false, error: 'Não achei esse arquivo.' });
      }
      return res.status(200).json({ ok: true, url: `${SUPABASE_URL}/storage/v1${j.signedURL}`, validade_seg: VALIDADE_LINK_SEG });
    }

    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });

    // ── autorizar o envio DIRETO (JSON, corpo minúsculo) ───────────────────
    // 🔴 É por aqui que passa arquivo grande. O corpo tem só o caminho — os
    // bytes vão do navegador pro Storage sem tocar nesta função, que é o que
    // desarma o 413 da Vercel (ver `autorizacaoDeEnvio`). A conferência de
    // dono é EXATAMENTE a mesma do caminho antigo: sem crachá que bata com o
    // uid dentro do caminho, não se assina nada.
    const tipoDoCorpo = String(req.headers['content-type'] || '');
    if (tipoDoCorpo.includes('application/json')) {
      try {
        let corpo = req.body;
        if (typeof corpo === 'string') { try { corpo = JSON.parse(corpo); } catch { corpo = {}; } }
        if (!corpo || typeof corpo !== 'object') {
          const cru = await corpoBruto(req, 64 * 1024).catch(() => null);
          try { corpo = JSON.parse(String(cru || '{}')); } catch { corpo = {}; }
        }
        const caminho = String(corpo.caminho || '');
        const actorId = String(corpo.actorId || '');
        const dono = donoDoCaminho(caminho);
        if (!dono) return res.status(400).json({ ok: false, error: 'caminho inválido' });

        const ses = exigirSessao(req, actorId, rota, true);
        const eu = ses.userId || actorId;
        if (!eu || String(eu) !== String(dono)) {
          return res.status(403).json({ ok: false, error: naoEMinhaPasta });
        }

        const auth = await autorizacaoDeEnvio(bucket, caminho);
        if (!auth) {
          console.error(`[${rota}] não consegui assinar o envio de ${caminho}`);
          return res.status(200).json({ ok: false, error: erroAoGuardar });
        }
        return res.status(200).json({ ok: true, ...auth, mime_aceito: true });
      } catch (e) {
        console.error(`[${rota}] erro ao autorizar envio`, String(e?.message || e));
        return res.status(200).json({ ok: false, error: erroAoGuardar });
      }
    }

    // ── guardar (arquivo pequeno, passando por aqui) ───────────────────────
    try {
      const tipo = tipoDoCorpo;
      if (!tipo.startsWith('multipart/form-data')) {
        return res.status(400).json({ ok: false, error: 'envie multipart/form-data' });
      }
      const bruto = await corpoBruto(req, limiteBytes).catch((e) => {
        if (String(e?.message) === 'arquivo_grande') return 'GRANDE';
        throw e;
      });
      if (bruto === 'GRANDE') return res.status(200).json({ ok: false, error: 'Arquivo grande demais pra guardar.' });

      const form = await new Request('https://x', { method: 'POST', headers: { 'content-type': tipo }, body: bruto }).formData();
      const arquivo = form.get('arquivo') || form.get('audio') || form.get('video');
      const caminho = String(form.get('caminho') || '');
      const actorId = String(form.get('actorId') || '');

      if (!arquivo || typeof arquivo === 'string') return res.status(400).json({ ok: false, error: 'o arquivo não veio' });
      const dono = donoDoCaminho(caminho);
      if (!dono) return res.status(400).json({ ok: false, error: 'caminho inválido' });

      const ses = exigirSessao(req, actorId, rota, true);
      const eu = ses.userId || actorId;
      if (!eu || String(eu) !== String(dono)) {
        // Sem isto, bastava mandar o caminho de outra pessoa pra plantar
        // arquivo no acervo dela.
        return res.status(403).json({ ok: false, error: naoEMinhaPasta });
      }

      // ⚠️ `mimeLimpo`: o navegador manda `audio/webm;codecs=opus` e o Storage
      // compara a string inteira contra a lista do bucket. Sem cortar o codec,
      // TODO upload volta 415 — foi o que manteve este cofre vazio desde 09/09.
      const r = await sb(`object/${bucket}/${caminho}`, {
        method: 'POST',
        headers: { 'Content-Type': mimeLimpo(arquivo.type), 'x-upsert': 'false' },
        body: arquivo,
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        console.error(`[${rota}] Storage recusou`, r.status, t.slice(0, 200));
        return res.status(200).json({ ok: false, error: erroAoGuardar });
      }
      return res.status(200).json({ ok: true, caminho });
    } catch (e) {
      console.error(`[${rota}] erro`, String(e?.message || e));
      return res.status(200).json({ ok: false, error: erroAoGuardar });
    }
  };
}
