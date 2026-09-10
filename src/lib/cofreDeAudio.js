import { cabecalhosSessao } from './sessaoCliente.js';
import { caminhoDeProva } from './caminhoDeProva.js';
import { extensaoDoMime } from './ditado.js';
import { nomeDoArquivo, linkParaBaixar } from './acervoDeVoz.js';

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

/** `video/webm;codecs=vp8,opus` → `video/webm`. Ver o porquê logo abaixo. */
export const semCodec = (mime) => String(mime || '').split(';')[0].trim().toLowerCase() || 'application/octet-stream';

/**
 * 🔴 10/09/2026 — ENVIO DIRETO PRO STORAGE, PRA ARQUIVO GRANDE.
 *
 * O vídeo do ritual ia dentro do corpo da requisição pra rota da Vercel — que
 * corta em ~4,5 MB ANTES de a função rodar. No Ritual de 10/09: 11 tentativas,
 * 11 respostas HTTP 413, zero gravações salvas — e cinco pessoas tentando de
 * novo, porque nada avisava que tinha falhado.
 *
 * Agora são dois passos: a rota só ASSINA uma autorização de uso único (corpo
 * de alguns bytes) e o navegador manda os bytes direto pro Storage.
 *
 * O que NÃO mudou: quem decide o caminho — com o uid dentro dele — continua
 * sendo o servidor, conferindo o crachá; o navegador nunca vê a chave de
 * serviço; o bucket segue privado e sem policy nenhuma.
 *
 * ⚠️ `contentType` vai SEM o codec: o Storage compara a string inteira contra
 * a lista de mimes do bucket e recusa com 415 se sobrar o sufixo. Foi isso que
 * manteve o cofre de voz vazio desde que ele nasceu.
 */
async function guardarDireto({ rota, balde, blob, caminho, actorId }) {
  if (!blob || !caminho) return null;
  try {
    const r = await fetch(rota, {
      method: 'POST',
      headers: { ...cabecalhosSessao(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ caminho, actorId: actorId || '' }),
    });
    const j = await r.json().catch(() => null);
    if (!j?.ok || !j.token) {
      console.error('[cofre] sem autorização de envio:', j?.error || r.status);
      return null;
    }
    // 🔴 O `contentType` das opções NÃO BASTA. Conferido no supabase-js
    // instalado: quando o corpo é um Blob, a lib monta um FormData e faz
    // `body.append("", fileBody)` — o `options.contentType` só é usado no ramo
    // que NÃO é Blob. Ou seja: o tipo que chega no Storage é o do próprio
    // Blob, com o `;codecs=…` colado, e o 415 voltaria igual.
    // Por isso o blob é reetiquetado ANTES de subir.
    // ⚠️ import TARDIO de propósito: no topo do arquivo, ele arrastaria o
    // cliente do Supabase pra dentro de qualquer teste que importe daqui — e
    // os testes rodam em node puro, sem o alias `@`. Aqui só é avaliado
    // quando alguém realmente envia um arquivo, ou seja, só no navegador.
    const { supabase } = await import('@/api/supabaseClient');
    const tipoLimpo = semCodec(blob.type);
    const pronto = blob.type === tipoLimpo ? blob : new Blob([blob], { type: tipoLimpo });
    const { error } = await supabase.storage.from(balde)
      .uploadToSignedUrl(j.caminho, j.token, pronto, { contentType: tipoLimpo });
    if (error) {
      console.error('[cofre] o Storage recusou o envio direto:', error?.message || error);
      return null;
    }
    return j.caminho;
  } catch (e) {
    console.error('[cofre] falhou o envio direto:', e?.message || e);
    return null;
  }
}

// O áudio é pequeno e o caminho antigo JÁ CHEGA no Storage (ele voltava 415, o
// que prova que chegou) — fica como está, agora com o mime cortado no servidor.
// O vídeo é o que estourava o corpo da requisição, e é ele que vai direto.
export const guardarAudio = ({ blob, caminho, actorId }) =>
  guardar({ rota: COFRE_AUDIO, blob, caminho, actorId, campo: 'audio' });

export const guardarVideo = ({ blob, caminho, actorId }) =>
  guardarDireto({ rota: COFRE_VIDEO, balde: 'xgame-videos', blob, caminho, actorId });

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

/**
 * O link pra BAIXAR a gravação — a contrapartida da faxina de 30 dias.
 *
 * Sem isto, "guardamos por 1 mês" seria só "apagamos depois de 1 mês". O
 * arquivo é da pessoa; ela tem que conseguir levar embora antes de sumir.
 *
 * Passa pelo MESMO link assinado do ouvir (mesma checagem de dono no servidor),
 * só que pedindo ao Storage pra responder como anexo. Nada de `<a download>`:
 * o navegador ignora esse atributo quando o arquivo vem de outro domínio, e a
 * pessoa acabaria com uma aba tocando o áudio em vez do arquivo salvo.
 */
export async function baixarAudio({ caminho, actorId, dia }) {
  const url = await ouvirAudio({ caminho, actorId });
  if (!url) return null;
  return linkParaBaixar(url, nomeDoArquivo(caminho, dia));
}
