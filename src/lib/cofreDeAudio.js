import { cabecalhosSessao } from './sessaoCliente.js';
import { caminhoDeProva } from './caminhoDeProva.js';
import { extensaoDoMime } from './ditado.js';

// 🎙️ COFRE DE ÁUDIO — o lado do navegador (09/09/2026).
//
// O bucket é PRIVADO e o navegador não alcança ele (nenhuma policy, e este app
// fala com o Supabase como `anon`). Então guardar e ouvir passam pela rota
// `audioDoDitado`, que confere o crachá e só deixa a pessoa mexer na própria
// pasta. Aqui é só a chamada — a regra mora no servidor, onde ela vale.

/**
 * Onde o áudio mora: o MESMO desenho de caminho das provas do X-GAME
 * (`xgame/<pasta>/<uid>/<dia>_<tarefa>_<marca>.<ext>`), porque é o `<uid>` no
 * meio do caminho que o servidor usa pra dizer "este arquivo é seu".
 * Reaproveitar em vez de inventar um segundo formato de caminho também evita
 * a divergência que já custou caro no print (PR #224).
 */
export function caminhoDoAudio({ pasta, uid, dia, tarefaId, mime }) {
  return caminhoDeProva({ pasta, uid, dia, tarefaId, ext: extensaoDoMime(mime) });
}

/**
 * Guarda o áudio e devolve o caminho, ou `null` se não deu.
 *
 * NUNCA LANÇA de propósito: guardar é o EXTRA. Quem acabou de ditar a própria
 * gratidão às 6h da manhã não pode ter o ritual derrubado porque o cofre
 * piscou — o texto, que é o que vale nota, já está no campo.
 */
export async function guardarAudio({ blob, caminho, actorId }) {
  if (!blob || !caminho) return null;
  try {
    const form = new FormData();
    form.append('audio', blob, `audio.${extensaoDoMime(blob.type)}`);
    form.append('caminho', caminho);
    form.append('actorId', actorId || '');
    const r = await fetch('/api/functions/audioDoDitado', {
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

/** Link assinado pra ouvir (curta validade). `null` quando não dá. */
export async function ouvirAudio({ caminho, actorId }) {
  if (!caminho) return null;
  try {
    const busca = new URLSearchParams({ caminho, actorId: actorId || '' });
    const r = await fetch(`/api/functions/audioDoDitado?${busca}`, { headers: cabecalhosSessao() });
    const j = await r.json().catch(() => null);
    return j?.ok ? j.url : null;
  } catch {
    return null;
  }
}
