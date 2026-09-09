// 🎙️ AUDIO DO DITADO — o cofre da voz (09/09/2026).
//
// POST (multipart: `audio`, `caminho`, `actorId`) → { ok, caminho }
// GET  (?caminho=...&actorId=...)                 → { ok, url }  link assinado
//
// POR QUE ESTA ROTA EXISTE, E NÃO UM UPLOAD DIRETO DO NAVEGADOR:
// o bucket `xgame-audios` é PRIVADO e não tem policy nenhuma (ver a migração
// 20260909003000). Isso é de propósito: este app inteiro fala com o Supabase
// como `anon` — o login é a tabela `app_users`, não o Supabase Auth —, então
// qualquer policy que deixasse o navegador escrever ali deixaria QUALQUER UM
// escrever ali. Sem sessão do banco não existe "só o dono". Quem confere se a
// pessoa pode gravar e ouvir é esta rota, olhando o crachá.
//
// O QUE ELA NÃO FAZ: não transcreve. Transcrever é do `transcreverAudio`, e
// as duas coisas são independentes de propósito — quem só quer o texto não
// paga armazenamento, e quem quer guardar não fica refém do Whisper estar no ar.
import { exigirSessao } from '../_lib/sessao.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'xgame-audios';
const LIMITE_BYTES = 25 * 1024 * 1024;
const VALIDADE_LINK_SEG = 60 * 10;   // 10 min: tempo de ouvir, não de arquivar

export const config = { api: { bodyParser: false } };

/**
 * O caminho tem que ser exatamente `xgame/<pasta>/<uid>/<arquivo>`.
 *
 * É a checagem que faz o cofre ser individual: o `uid` está DENTRO do caminho,
 * então "posso mexer neste arquivo?" vira "este caminho é meu?". Sem isso,
 * bastaria pedir o caminho de outra pessoa pra ouvir o áudio dela.
 */
function donoDoCaminho(caminho) {
  const partes = String(caminho || '').split('/');
  if (partes.length < 4) return null;
  if (partes[0] !== 'xgame') return null;
  // nenhum pedaço pode escapar da pasta (..), nem vir vazio
  if (partes.some((p) => !p || p === '.' || p === '..')) return null;
  return partes[2];
}

function corpoBruto(req) {
  return new Promise((resolve, reject) => {
    const pedacos = [];
    let total = 0;
    req.on('data', (c) => {
      total += c.length;
      if (total > LIMITE_BYTES) { reject(new Error('audio_grande')); req.destroy(); return; }
      pedacos.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(pedacos)));
    req.on('error', reject);
  });
}

const sb = (caminho, opts = {}) => fetch(`${SUPABASE_URL}/storage/v1/${caminho}`, {
  ...opts,
  headers: { apikey: SR, Authorization: `Bearer ${SR}`, ...(opts.headers || {}) },
});

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (!SUPABASE_URL || !SR) {
    return res.status(200).json({ ok: false, error: 'O cofre de áudios não está configurado aqui.' });
  }

  // ── ouvir: devolve um link assinado de curta validade ────────────────────
  if (req.method === 'GET') {
    const caminho = String(req.query?.caminho || '');
    const actorId = String(req.query?.actorId || '');
    const dono = donoDoCaminho(caminho);
    if (!dono) return res.status(400).json({ ok: false, error: 'caminho inválido' });

    // O crachá manda; sem ele (etapa 1 da ligação em duas etapas) cai no
    // actorId do corpo, que é o mesmo nível de confiança do resto da casa.
    const ses = exigirSessao(req, actorId, 'audioDoDitado', true);
    const eu = ses.userId || actorId;
    if (!eu || String(eu) !== String(dono)) {
      // Áudio de gratidão é da pessoa. Nem gestão ouve por aqui — se um dia
      // precisar, é decisão do dono e vira rota própria, com registro.
      return res.status(403).json({ ok: false, error: 'Este áudio é de outra pessoa.' });
    }

    const r = await sb(`object/sign/${BUCKET}/${caminho}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: VALIDADE_LINK_SEG }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.signedURL) {
      return res.status(200).json({ ok: false, error: 'Não achei esse áudio.' });
    }
    return res.status(200).json({ ok: true, url: `${SUPABASE_URL}/storage/v1${j.signedURL}`, validade_seg: VALIDADE_LINK_SEG });
  }

  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });

  // ── guardar ──────────────────────────────────────────────────────────────
  try {
    const tipo = String(req.headers['content-type'] || '');
    if (!tipo.startsWith('multipart/form-data')) {
      return res.status(400).json({ ok: false, error: 'envie multipart/form-data' });
    }
    const bruto = await corpoBruto(req).catch((e) => {
      if (String(e?.message) === 'audio_grande') return 'GRANDE';
      throw e;
    });
    if (bruto === 'GRANDE') return res.status(200).json({ ok: false, error: 'Áudio muito longo pra guardar.' });

    const form = await new Request('https://x', { method: 'POST', headers: { 'content-type': tipo }, body: bruto }).formData();
    const arquivo = form.get('audio');
    const caminho = String(form.get('caminho') || '');
    const actorId = String(form.get('actorId') || '');

    if (!arquivo || typeof arquivo === 'string') return res.status(400).json({ ok: false, error: 'campo "audio" não veio' });
    const dono = donoDoCaminho(caminho);
    if (!dono) return res.status(400).json({ ok: false, error: 'caminho inválido' });

    const ses = exigirSessao(req, actorId, 'audioDoDitado', true);
    const eu = ses.userId || actorId;
    if (!eu || String(eu) !== String(dono)) {
      // Sem isto, bastava mandar o caminho de outra pessoa pra plantar áudio
      // no acervo dela.
      return res.status(403).json({ ok: false, error: 'Você só guarda áudio na sua própria pasta.' });
    }

    const r = await sb(`object/${BUCKET}/${caminho}`, {
      method: 'POST',
      headers: { 'Content-Type': arquivo.type || 'audio/webm', 'x-upsert': 'false' },
      body: arquivo,
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      console.error('[audioDoDitado] Storage recusou', r.status, t.slice(0, 200));
      // Guardar é o EXTRA: falhar aqui não pode derrubar o ritual de quem
      // acabou de gravar. Quem chama trata como "sem áudio guardado".
      return res.status(200).json({ ok: false, error: 'Não consegui guardar o áudio (o texto foi preservado).' });
    }
    return res.status(200).json({ ok: true, caminho });
  } catch (e) {
    console.error('[audioDoDitado] erro', String(e?.message || e));
    return res.status(200).json({ ok: false, error: 'Não consegui guardar o áudio (o texto foi preservado).' });
  }
}
