// 🎥 VÍDEO DO RITUAL — o cofre da visualização (09/09/2026).
//
// POST (multipart: `video`, `caminho`, `actorId`) → { ok, caminho }
// GET  (?caminho=...&actorId=...)                 → { ok, url }  link assinado
//
// 🔴 POR QUE ESTE COFRE EXISTE
// A gravação da visualização ia pro `public-assets`, que é `public = true`:
// 9 vídeos do rosto de alguém meditando às 6h da manhã, abertos por link, sem
// login. A tela até diz "só você e o gestor veem" — e não era verdade.
//
// É o MESMO tipo de exposição que motivou o cofre da voz, e aqui é pior: voz é
// íntimo, imagem é identificável. Caminho difícil de adivinhar não é proteção,
// é obscuridade — e obscuridade não se desfaz depois que o link circulou.
//
// A regra (trava de dono, corte de `..`, link assinado de 10 min) mora em
// `_lib/cofrePrivado.js`, a mesma do áudio.
import { atenderCofre } from '../_lib/cofrePrivado.js';

export const config = { api: { bodyParser: false } };

export default atenderCofre({
  bucket: 'xgame-videos',
  // Vídeo de visualização tem no mínimo 60s (DIR-93) e não tem teto de tempo,
  // só a rede de segurança de 15 min. 100 MB cobre com folga o webm do celular.
  limiteBytes: 100 * 1024 * 1024,
  rota: 'videoDoRitual',
  naoEMeu: 'Esta gravação é de outra pessoa.',
  naoEMinhaPasta: 'Você só guarda gravação na sua própria pasta.',
  erroAoGuardar: 'Não consegui guardar a gravação (o ritual foi registrado).',
  // A tela do ritual promete "só você E O GESTOR veem" — então aqui o gestor
  // vê mesmo, e a promessa passa a ser verdade. GRAVAR continua sendo só do
  // dono: gestor não planta vídeo na pasta de ninguém.
  gestorPodeVer: true,
});
