// 🎙️ AUDIO DO DITADO — o cofre da voz (09/09/2026).
//
// POST (multipart: `audio`, `caminho`, `actorId`) → { ok, caminho }
// GET  (?caminho=...&actorId=...)                 → { ok, url }  link assinado
//
// A regra toda (trava de dono, corte de `..`, link assinado) mora em
// `_lib/cofrePrivado.js`: quando o segundo cofre apareceu — os vídeos do
// ritual —, duplicar estas 145 linhas seria duplicar a trava de dono junto, e
// um dia alguém consertaria só um dos dois. Aqui fica só o que é DESTE cofre.
//
// O QUE ELA NÃO FAZ: não transcreve. Transcrever é do `transcreverAudio`, e as
// duas coisas são independentes de propósito — quem só quer o texto não paga
// armazenamento, e quem quer guardar não fica refém do Whisper estar no ar.
import { atenderCofre } from '../_lib/cofrePrivado.js';

export const config = { api: { bodyParser: false } };

export default atenderCofre({
  bucket: 'xgame-audios',
  limiteBytes: 25 * 1024 * 1024,   // o mesmo teto do Whisper
  rota: 'audioDoDitado',
  naoEMeu: 'Este áudio é de outra pessoa.',
  naoEMinhaPasta: 'Você só guarda áudio na sua própria pasta.',
  // Guardar é o EXTRA: falhar aqui não pode derrubar o ritual de quem acabou
  // de gravar. Quem chama trata como "sem áudio guardado".
  erroAoGuardar: 'Não consegui guardar o áudio (o texto foi preservado).',
});
