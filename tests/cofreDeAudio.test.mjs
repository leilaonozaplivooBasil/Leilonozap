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
const ROTA = semComentarios(ler('../api/functions/audioDoDitado.js'));
const CLIENTE = semComentarios(ler('../src/lib/cofreDeAudio.js'));

test('o bucket é PRIVADO — a voz não vira link público', () => {
  assert.match(MIGRACAO, /'xgame-audios', 'xgame-audios', false/, 'bucket tem que nascer public = false');
  assert.match(MIGRACAO, /do update set\s*\n\s*public = false/, 'nem um re-run pode reabrir o bucket');
  assert.ok(!/public-assets/.test(ROTA), 'a rota não pode escrever no bucket público');
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
  assert.match(ROTA, /function donoDoCaminho/);
  // 🔴 As DUAS pontas precisam da trava, e a assertiva tem que cobrar as duas:
  // a primeira versão deste teste só procurava a comparação uma vez, e passava
  // verde com a trava do POST apagada — dava pra plantar áudio na pasta de
  // outra pessoa. Foi a mutação que mostrou.
  const travas = (ROTA.match(/String\(eu\) !== String\(dono\)/g) || []).length;
  assert.equal(travas, 2, 'ouvir E guardar precisam conferir o dono — achei ' + travas);
  assert.match(ROTA, /Este áudio é de outra pessoa\./, 'trava de OUVIR');
  assert.match(ROTA, /Você só guarda áudio na sua própria pasta\./, 'trava de GUARDAR');
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
  assert.match(ROTA, /o texto foi preservado/, 'a mensagem tem que dizer que o texto está salvo');
});

test('o crachá vai junto nas duas pontas', () => {
  assert.match(CLIENTE, /cabecalhosSessao\(\)/);
  assert.match(ROTA, /exigirSessao\(req, actorId, 'audioDoDitado'/);
});
