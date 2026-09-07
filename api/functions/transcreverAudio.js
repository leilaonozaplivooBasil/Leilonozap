// 🎙️ TRANSCREVER ÁUDIO — o microfone do Tira Dúvidas 24h (07/09/2026).
//
// POST (multipart) campo `audio` → { ok, texto }
// GET  → { ok, disponivel } — a tela pergunta ANTES de mostrar o microfone,
//        pra não oferecer um botão que vai falhar.
//
// ⚠️ O QUE EU ENCONTREI AO FAZER ISTO: já existia
// `base44/functions/transcribeAudio/entry.ts` (Whisper, funcionando) e
// `src/functions/transcribeAudio.js` chamando `/api/functions/transcribeAudio`
// — uma rota que NUNCA existiu na Vercel. Ou seja: o caminho estava cortado no
// meio e qualquer clique daria 404. Esta rota é a ponta que faltava, com o
// nome em português do resto da casa.
//
// A CHAVE: OPENAI_API_KEY no ambiente, ou `openai_api_key` no cofre
// (app_segredos) — mesmo padrão do resto, pra trocar chave sem redeploy. Hoje
// ela vive nos secrets da Edge Function do Supabase, onde o Zeca transcreve
// áudio do WhatsApp; sem ela aqui, a rota diz que está indisponível em vez de
// estourar na cara de quem gravou.
import { chaveDe } from '../_lib/cofre.js';

export const config = { api: { bodyParser: false } };

const LIMITE_BYTES = 25 * 1024 * 1024;   // teto do Whisper
const TIPOS_OK = ['audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a', 'audio/mp3'];

const chave = () => chaveDe('OPENAI_API_KEY', 'openai_api_key');

function corpoBruto(req) {
  return new Promise((resolve, reject) => {
    const pedacos = [];
    let total = 0;
    req.on('data', (c) => {
      total += c.length;
      // corta antes de encher a memória da função com um arquivo enorme
      if (total > LIMITE_BYTES) { reject(new Error('audio_grande')); req.destroy(); return; }
      pedacos.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(pedacos)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, disponivel: !!(await chave()) });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Método não permitido' });

  const OPENAI = await chave();
  if (!OPENAI) {
    return res.status(200).json({
      ok: false, disponivel: false,
      error: 'A transcrição de áudio ainda não está ligada aqui. Escreva a sua dúvida ou mande um print.',
    });
  }

  try {
    const tipo = String(req.headers['content-type'] || '');
    if (!tipo.startsWith('multipart/form-data')) {
      return res.status(400).json({ ok: false, error: 'envie o áudio como multipart/form-data no campo "audio"' });
    }

    const bruto = await corpoBruto(req).catch((e) => {
      if (String(e?.message) === 'audio_grande') return 'GRANDE';
      throw e;
    });
    if (bruto === 'GRANDE') return res.status(200).json({ ok: false, error: 'Áudio muito longo. Grave até uns 2 minutos.' });

    // O Request do runtime já sabe ler multipart — não vale a pena um parser
    // à mão pra um campo só.
    const form = await new Request('https://x', { method: 'POST', headers: { 'content-type': tipo }, body: bruto }).formData();
    const arquivo = form.get('audio');
    if (!arquivo || typeof arquivo === 'string') {
      return res.status(400).json({ ok: false, error: 'campo "audio" não veio' });
    }
    if (arquivo.size > LIMITE_BYTES) {
      return res.status(200).json({ ok: false, error: 'Áudio muito longo. Grave até uns 2 minutos.' });
    }
    // o navegador manda webm/ogg conforme o aparelho; tipo estranho a gente
    // deixa passar pro Whisper decidir, mas registra
    if (arquivo.type && !TIPOS_OK.includes(String(arquivo.type).split(';')[0])) {
      console.warn('[transcreverAudio] tipo inesperado', arquivo.type);
    }

    const paraWhisper = new FormData();
    paraWhisper.append('file', arquivo, 'audio.webm');
    paraWhisper.append('model', 'whisper-1');
    paraWhisper.append('language', 'pt');

    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI}` },
      body: paraWhisper,
      signal: AbortSignal.timeout(45000),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) {
      console.error('[transcreverAudio] Whisper recusou', r.status, j?.error?.message || '');
      return res.status(200).json({ ok: false, error: 'Não consegui entender o áudio. Tenta escrever?' });
    }

    const texto = String(j?.text || '').trim();
    if (!texto) return res.status(200).json({ ok: false, error: 'O áudio veio sem fala. Grave de novo, mais perto do microfone.' });

    return res.status(200).json({ ok: true, texto: texto.slice(0, 4000) });
  } catch (e) {
    console.error('[transcreverAudio] erro', String(e?.message || e));
    return res.status(200).json({ ok: false, error: 'Falhou ao transcrever. Tenta escrever a dúvida?' });
  }
}
