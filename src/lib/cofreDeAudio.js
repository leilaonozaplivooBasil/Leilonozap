import { cabecalhosSessao } from './sessaoCliente.js';
import { caminhoDeProva } from './caminhoDeProva.js';
import { extensaoDoMime } from './ditado.js';

// 🔐 COFRE PRIVADO — o lado do navegador (09/09/2026).
//
// Os buckets são PRIVADOS e o navegador não alcança eles (nenhuma policy, e
// este app fala com o Supabase como `anon`). Então guardar e abrir passam pelas
// rotas do servidor, que conferem o crachá e só deixam a pessoa mexer na
// própria pasta. Aqui é só a chamada — a regra mora no servidor, onde vale.
//
// São DOIS cofres com o mesmo desenho: a voz do ditado e o vídeo da
// visualização do ritual. O que muda entre eles é a rota; por isso a peça é
// uma só, com a rota como parâmetro.

export const COFRE_AUDIO = '/api/functions/audioDoDitado';
export const COFRE_VIDEO = '/api/functions/videoDoRitual';

/**
 * Onde o arquivo mora: o MESMO desenho de caminho das provas do X-GAME
 * (`xgame/<pasta>/<uid>/<dia>_<tarefa>_<marca>.<ext>`), porque é o `<uid>` no
 * meio do caminho que o servidor usa pra dizer "este arquivo é seu".
 * Reaproveitar em vez de inventar um segundo formato de caminho também evita
 * a divergência que já custou caro no print (PR #224).
 */
export function caminhoDoAudio({ pasta, uid, dia, tarefaId, mime }) {
  return caminhoDeProva({ pasta, uid, dia, tarefaId, ext: extensaoDoMime(mime) });
}

/** O mesmo caminho, pro vídeo (webm do celular, mp4 do iPhone). */
export function caminhoDoVideo({ pasta, uid, dia, tarefaId, mime }) {
  const ext = String(mime || '').includes('mp4') ? 'mp4' : 'webm';
  return caminhoDeProva({ pasta, uid, dia, tarefaId, ext });
}

/**
 * Guarda o arquivo e devolve o caminho, ou `null` se não deu.
 *
 * NUNCA LANÇA de propósito: guardar é o EXTRA. Quem acabou de ditar a própria
 * gratidão às 6h da manhã não pode ter o ritual derrubado porque o cofre
 * piscou — o que vale nota já está registrado.
 */
async function guardar({ rota, blob, caminho, actorId, campo }) {
  if (!blob || !caminho) return null;
  try {
    const form = new FormData();
    form.append(campo, blob, caminho.split('/').pop());
    form.append('caminho', caminho);
    form.append('actorId', actorId || '');
    const r = await fetch(rota, {
      method: 'POST',
      headers: cabecalhosSessao(),   // sem Content-Type: o navegador põe o boundary
      body: form,
    });
    const j = await r.json().catch(() => null);
    return j?.ok ? j.caminho : null;
  } catch {
    return null;
  }
}

export const guardarAudio = ({ blob, caminho, actorId }) =>
  guardar({ rota: COFRE_AUDIO, blob, caminho, actorId, campo: 'audio' });

export const guardarVideo = ({ blob, caminho, actorId }) =>
  guardar({ rota: COFRE_VIDEO, blob, caminho, actorId, campo: 'video' });

/** Link assinado pra abrir (curta validade). `null` quando não dá. */
async function abrir({ rota, caminho, actorId }) {
  if (!caminho) return null;
  try {
    const busca = new URLSearchParams({ caminho, actorId: actorId || '' });
    const r = await fetch(`${rota}?${busca}`, { headers: cabecalhosSessao() });
    const j = await r.json().catch(() => null);
    return j?.ok ? j.url : null;
  } catch {
    return null;
  }
}

export const ouvirAudio = ({ caminho, actorId }) => abrir({ rota: COFRE_AUDIO, caminho, actorId });
export const verVideo = ({ caminho, actorId }) => abrir({ rota: COFRE_VIDEO, caminho, actorId });
