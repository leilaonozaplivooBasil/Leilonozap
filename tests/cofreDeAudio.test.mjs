// 🎙️ COFRE DE ÁUDIO — bucket privado (09/09/2026).
//
// Decisão do dono: guardar o áudio do ditado desde já. Como é a VOZ da pessoa
// dizendo pelo que ela é grata, o arquivo não pode morar no `public-assets`,
// que é lido por qualquer um com o link. Estes testes seguram as três coisas
// que fazem esse cofre ser cofre: bucket privado, sem policy, e "só o dono".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';
import { caminhoDoAudio } from '../src/lib/cofreDeAudio.js';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const MIGRACAO = ler('../supabase/migrations/20260909003000_xgame_audios_bucket.sql');
// 09/09 — a regra do cofre saiu da rota pro `_lib/cofrePrivado.js`, quando o
// segundo cofre apareceu (os vídeos do ritual). Duplicar as 145 linhas seria
// duplicar a trava de dono junto — e um dia alguém consertaria só um dos dois.
// As assertivas seguem as mesmas, no lugar onde a regra passou a morar.
const COFRE = semComentarios(ler('../api/_lib/cofrePrivado.js'));
const ROTA_AUDIO = semComentarios(ler('../api/functions/audioDoDitado.js'));
const ROTA_VIDEO = semComentarios(ler('../api/functions/videoDoRitual.js'));
const MIG_VIDEO = ler('../supabase/migrations/20260909020000_xgame_videos_bucket.sql');
const ROTA = COFRE;
const CLIENTE = semComentarios(ler('../src/lib/cofreDeAudio.js'));

test('o bucket é PRIVADO — a voz não vira link público', () => {
  assert.match(MIGRACAO, /'xgame-audios', 'xgame-audios', false/, 'bucket tem que nascer public = false');
  assert.match(MIGRACAO, /do update set\s*\n\s*public = false/, 'nem um re-run pode reabrir o bucket');
  assert.ok(!/public-assets/.test(COFRE), 'o cofre não pode escrever no bucket público');
  assert.match(ROTA_AUDIO, /bucket: 'xgame-audios'/);
});

test('nenhuma policy: o navegador não alcança o cofre', () => {
  // Este app fala com o Supabase como `anon` (o login é app_users, não Supabase
  // Auth). Qualquer policy que deixasse o navegador escrever deixaria QUALQUER
  // UM escrever — não existe "só o dono" sem sessão do banco.
  assert.ok(!/create policy/i.test(MIGRACAO), 'apareceu policy — o cofre deixou de ser cofre');
});

test('o dono está DENTRO do caminho, e é por ele que a rota decide', () => {
  const c = caminhoDoAudio({ pasta: 'gratidao', uid: 'u123', dia: '2026-09-09', tarefaId: 't1', mime: 'audio/webm' });
  assert.match(c, /^xgame\/gratidao\/u123\//, 'o uid tem que ser o terceiro pedaço do caminho');
  assert.match(c, /\.webm$/);
  assert.match(COFRE, /function donoDoCaminho/);
  // 🔴 As DUAS pontas precisam da trava, e a assertiva tem que cobrar as duas:
  // a primeira versão deste teste só procurava a comparação uma vez, e passava
  // verde com a trava do POST apagada — dava pra plantar áudio na pasta de
  // outra pessoa. Foi a mutação que mostrou.
  // AS DUAS PONTAS. A primeira versão deste teste só procurava a comparação
  // uma vez e passava verde com a trava do POST apagada — dava pra plantar
  // arquivo na pasta de outra pessoa. Hoje o GET compara dentro de `podeVer`
  // (que é onde mora a exceção do gestor) e o POST compara direto; a assertiva
  // cobra as duas separadamente, pra nenhuma poder sumir sozinha.
  const ler_ = COFRE.slice(COFRE.indexOf("req.method === 'GET'"), COFRE.indexOf("req.method !== 'POST'"));
  const gravar_ = COFRE.slice(COFRE.indexOf("req.method !== 'POST'"));
  assert.match(ler_, /String\(eu \|\| ''\) === String\(dono\)/, 'trava de LER sumiu');
  assert.match(gravar_, /String\(eu\) !== String\(dono\)/, 'trava de GRAVAR sumiu');
  // e cada cofre diz a sua mensagem
  assert.match(ROTA_AUDIO, /Este áudio é de outra pessoa\./);
  assert.match(ROTA_AUDIO, /Você só guarda áudio na sua própria pasta\./);
});

test('o caminho não escapa da pasta', () => {
  // `..` no caminho é o jeito clássico de sair da própria pasta e alcançar a
  // dos outros.
  assert.match(ROTA, /p === '\.\.'/);
  assert.match(ROTA, /partes\[0\] !== 'xgame'/);
});

test('dois áudios do mesmo dia e da mesma tarefa não se sobrescrevem', () => {
  const base = { pasta: 'gratidao', uid: 'u1', dia: '2026-09-09', tarefaId: 't1', mime: 'audio/webm' };
  const vistos = new Set();
  for (let i = 0; i < 100; i += 1) vistos.add(caminhoDoAudio(base));
  assert.equal(vistos.size, 100, 'caminho repetiu — o acervo perderia gravação');
  // e a rota recusa sobrescrita, como cinto
  assert.match(ROTA, /'x-upsert': 'false'/);
});

test('ouvir exige link assinado de curta validade, não URL fixa', () => {
  assert.match(ROTA, /object\/sign\//);
  assert.match(ROTA, /VALIDADE_LINK_SEG = 60 \* 10/);
  assert.ok(!/getPublicUrl|\/object\/public\//.test(ROTA), 'apareceu URL pública pra áudio privado');
});

test('guardar é o EXTRA: falhar não pode derrubar o ritual', () => {
  // A pessoa acabou de ditar a gratidão às 6h. O texto já está no campo e é
  // ele que vale nota — o cofre piscar não pode custar o dia dela.
  assert.match(CLIENTE, /return null;/);
  assert.ok(!/throw /.test(CLIENTE), 'o cliente do cofre não pode lançar');
  assert.match(ROTA_AUDIO, /o texto foi preservado/, 'a mensagem tem que dizer que o texto está salvo');
});

test('o crachá vai junto nas duas pontas', () => {
  assert.match(CLIENTE, /cabecalhosSessao\(\)/);
  assert.match(COFRE, /exigirSessao\(req, actorId, rota, true\)/);
  assert.match(ROTA_AUDIO, /rota: 'audioDoDitado'/);
});


// ── 🎥 o segundo cofre: os vídeos do ritual (09/09/2026) ────────────────────

test('o vídeo do ritual saiu do bucket PÚBLICO', () => {
  // Eram 9 gravações do rosto de alguém meditando às 6h da manhã, abertas por
  // link, sem login — e a tela do ritual já prometia "só você e o gestor veem".
  assert.match(MIG_VIDEO, /'xgame-videos', 'xgame-videos', false/);
  assert.match(MIG_VIDEO, /do update set\s*\n\s*public = false/);
  assert.ok(!/create policy/i.test(MIG_VIDEO), 'apareceu policy — o cofre deixou de ser cofre');
  assert.match(ROTA_VIDEO, /bucket: 'xgame-videos'/);
  const METODO = semComentarios(ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx'));
  const trecho = METODO.slice(METODO.indexOf('let videoPath'), METODO.indexOf('const aprovadoDireto'));
  assert.ok(!/Core\.UploadFile/.test(trecho), 'o vídeo voltou pro bucket público');
  assert.match(trecho, /guardarVideo\(/);
});

test('o gestor VÊ o vídeo — porque a tela sempre prometeu isso', () => {
  assert.match(ROTA_VIDEO, /gestorPodeVer: true/);
  assert.match(COFRE, /gestorPodeVer && await ehGestor\(eu\)/);
  // e o papel é lido do BANCO, nunca do corpo da requisição
  assert.match(COFRE, /app_users\?select=role/);
  assert.match(COFRE, /\['admin', 'super_admin'\]\.includes/);
});

test('🔒 a VOZ não ganhou essa porta — gratidão é da pessoa', () => {
  assert.ok(!/gestorPodeVer/.test(ROTA_AUDIO), 'a gestão passou a poder ouvir a gratidão');
});

test('🔒 gestor VÊ, mas não GRAVA na pasta de ninguém', () => {
  // A exceção do gestor vale só na leitura. O POST continua exigindo que o
  // caminho seja do próprio.
  const guardar = COFRE.slice(COFRE.indexOf("req.method !== 'POST'"));
  assert.match(guardar, /String\(eu\) !== String\(dono\)/);
  assert.ok(!/gestorPodeVer/.test(guardar), 'o gestor ganhou permissão de gravar');
});

test('os 9 vídeos antigos continuam abrindo até serem movidos', () => {
  // O gestor não pode perder acesso ao que já existe só porque o cofre mudou.
  const ADMIN = semComentarios(ler('../src/components/licensing/XGameAdmin.jsx'));
  assert.match(ADMIN, /c\.video_path/, 'o caminho novo');
  assert.match(ADMIN, /c\.video_url/, 'o link legado dos 9 antigos');
});

test('a mudança de cofre nunca perde a gravação de alguém', () => {
  // A ordem é: baixa → sobe → atualiza → SÓ ENTÃO apaga o público. Se qualquer
  // passo falhar, o vídeo continua acessível pelo caminho antigo e a
  // comprovação segue apontando pra ele. O pior caso é ficar como está hoje.
  const MOVER = semComentarios(ler('../api/functions/moverVideosDoRitual.js'));
  const iBaixa = MOVER.indexOf('const baixa = await store');
  const iSobe = MOVER.indexOf('const sobe = await store');
  const iPatch = MOVER.indexOf('const patch = await rest');
  const iApaga = MOVER.indexOf("method: 'DELETE'");
  assert.ok(iBaixa > 0 && iSobe > iBaixa && iPatch > iSobe && iApaga > iPatch,
    'a ordem mudou — apagar o público não pode vir antes de confirmar a cópia');
  // e cada passo aborta o item em vez de seguir em frente
  assert.equal((MOVER.match(/continue;/g) || []).length >= 4, true, 'algum passo deixou de abortar');
});

test('só admin move arquivo dos outros, e o papel vem do banco', () => {
  const MOVER = semComentarios(ler('../api/functions/moverVideosDoRitual.js'));
  assert.match(MOVER, /app_users\?select=role/);
  assert.match(MOVER, /só admin/);
  // e nada acontece sem confirmação explícita: o GET só CONTA
  assert.match(MOVER, /corpo\.confirmar !== true/);
});
