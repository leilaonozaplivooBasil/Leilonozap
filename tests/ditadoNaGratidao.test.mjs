// 🎙️ DITADO NO MOMENTO DE GRATIDÃO — DIR-101 (09/09/2026).
//
// Ordem do dono: levar o "enviar áudio" do Guia do Usuário pros módulos do
// X-GAME, começando pelo Momento de Gratidão. São 6h da manhã, a pessoa está
// meio dormindo, no celular — digitar gratidão com sentimento nessa hora é o
// atrito que a voz tira.
//
// O que estes testes seguram é o que NÃO pode ser afrouxado junto: os mínimos,
// o bloqueio de colar, e o cofre privado (a voz não vira link público).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const RITUAL_CRU = ler('../src/components/licensing/CentralVendas/XGameRitualAmanhecer.jsx');
const RITUAL = semComentarios(RITUAL_CRU);
const METODO = semComentarios(ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx'));

test('os dois campos do ritual ganharam microfone', () => {
  assert.match(RITUAL, /const ditadoGratidao = useDitado\(/);
  assert.match(RITUAL, /const ditadoAcao = useDitado\(/);
  assert.equal((RITUAL.match(/<BotaoDitado/g) || []).length, 2, 'gratidão e ação, um cada');
});

test('🔒 os mínimos NÃO caíram por causa do áudio', () => {
  // 09/09 (DIR-101.1) — esta assertiva cobrava os 20 caracteres DENTRO da
  // tela. O dono corrigiu o rumo: no Momento de Gratidão o áudio é a entrega,
  // e falar não se mede em caracteres. A régua não sumiu — mudou de unidade,
  // e mudou de lugar (a conta agora mora em xgame.js, junto do RESUMO_MIN,
  // pra não haver duas verdades pro mesmo número). O piso continua sendo
  // cobrado, agora pelos dois caminhos, e está testado em gratidaoFalada.
  assert.match(RITUAL, /disabled=\{!entrega\.ok \|\| !!salvando\}/, 'o botão continua travado até haver entrega');
  assert.match(RITUAL, /gratidaoEntregue\(\{ texto: gratidao, audioSeg: audioGratidaoSeg, minSeg: minSegHoje \}\)/);
  assert.match(RITUAL, /disabled=\{acao\.trim\(\)\.length < ACAO_MIN \|\| !!salvando\}/, 'a ação do dia NÃO mudou');
  assert.match(RITUAL, /const ACAO_MIN = 10;/);
  assert.ok(!/const GRATIDAO_MIN = 20;/.test(RITUAL), 'a cópia local da régua voltou');
});

test('🔒 colar continua bloqueado — a voz não abriu essa porta', () => {
  // A regra existe contra copiar as palavras dos OUTROS. Falar é autoria;
  // colar não é. Uma coisa não afrouxa a outra.
  assert.match(RITUAL, /onPaste=\{bloquearCola\}/);
  assert.equal((RITUAL.match(/onPaste=\{bloquearCola\}/g) || []).length, 2, 'gratidão e ação seguem bloqueadas');
  assert.match(RITUAL, /AVISO_COLAR/);
});

test('nada é enviado sem a pessoa mandar — nem o áudio', () => {
  // 09/09 (DIR-101.1) — na GRATIDÃO o texto ditado não cai mais no campo: o
  // áudio vale sozinho e a transcrição é invisível (era justamente o "ler e
  // corrigir" que custava tempo e energia). O que essa assertiva protegia
  // continua protegido por outro caminho: nada sobe sozinho, é a pessoa que
  // aperta Continuar. Na AÇÃO do dia o ditado segue como era.
  assert.match(RITUAL, /setAcao\(\(atual\) => juntarTexto\(atual, t\)\)/, 'a ação do dia não mudou');
  // 10/09 — o botão passou a CHAMAR o gravador do bloco (`salvarGratidao`),
  // que só então avança. O que esta assertiva protege é o mesmo: nada sai
  // sozinho, quem manda subir é a pessoa apertando.
  assert.match(RITUAL, /onClick=\{salvarGratidao\}/, 'quem avança é a pessoa, no botão');
  assert.match(RITUAL, /const salvarGratidao = async \(\) => \{[\s\S]{0,400}?setPasso\(P\.VISUALIZACAO\)/, 'salvar a gratidão é o que leva pro bloco seguinte');
  assert.match(RITUAL, /data-teste="gratidao-continuar"/);
});

test('a voz vai pro cofre PRIVADO, não pro bucket público do vídeo', () => {
  // 🔴 10/09 — ESTA ASSERTIVA FICOU MAIS IMPORTANTE, NÃO MENOS.
  // Antes, a voz era guardada numa função só dela (`guardarVoz`) e o
  // `Core.UploadFile` estava longe. Agora o print do bom dia e a voz da
  // gratidão são guardados pela MESMA função (salvarBlocoDoRitual), e o print
  // usa `Core.UploadFile` de propósito — é imagem de story, pública por
  // natureza. Um recorte largo aqui passaria verde com a voz vazando.
  // Por isso o recorte é o RAMO da gratidão, e nada além dele.
  assert.match(METODO, /caminhoDoAudio|guardarAudio/);
  const ini = METODO.indexOf("} else if (bloco === 'gratidao') {");
  const fim = METODO.indexOf("} else if (bloco === 'visualizacao') {", ini);
  assert.ok(ini > 0 && fim > ini, 'premissa: o ramo da gratidão existe em salvarBlocoDoRitual');
  const ramoDaVoz = METODO.slice(ini, fim);
  assert.ok(!/Core\.UploadFile/.test(ramoDaVoz), 'a voz foi parar no bucket público');
  assert.match(ramoDaVoz, /guardarAudio\(\{ blob: dados\.audioGratidao/, 'a voz precisa ir pelo cofre privado');
  assert.match(ramoDaVoz, /pasta: 'gratidao'/);
  // e o print, sim, usa o caminho público — de propósito e só ele
  const ramoDoPrint = METODO.slice(METODO.indexOf("if (bloco === 'acordei') {"), ini);
  assert.match(ramoDoPrint, /Core\.UploadFile/, 'premissa: é o print que usa o caminho público');
});

test('a origem do texto fica registrada', () => {
  // Decisão do dono: áudio conta como "suas palavras", COM a origem marcada —
  // pra gestão enxergar o que aconteceu sem ter que adivinhar.
  assert.match(METODO, /entrada_gratidao: 'audio'/);
  assert.match(METODO, /entrada_acao: 'audio'/);
  assert.match(METODO, /audio_gratidao_path: bl\.gratidao\.audio_path/);
  assert.match(METODO, /audio_acao_path: bl\.visualizacao\.audio_acao_path/);
});

test('guardar a voz é o EXTRA: falhar não derruba o ritual', () => {
  // Quem acabou de ditar a gratidão às 6h não pode perder o dia porque o cofre
  // piscou. `guardarAudio` devolve null em vez de lançar (testado em
  // cofreDeAudio.test.mjs) e o path só entra na comprovação se existir.
  assert.match(METODO, /\.\.\.\(bl\.gratidao\?\.audio_path \? \{ audio_gratidao_path: bl\.gratidao\.audio_path \} : \{\}\)/);
  assert.match(METODO, /\.\.\.\(bl\.visualizacao\?\.audio_acao_path \? \{ audio_acao_path: bl\.visualizacao\.audio_acao_path \} : \{\}\)/);
  // e o cofre continua sendo best-effort: falhar devolve null, não lança
  assert.match(METODO, /aoFalhar: anotarFalha\('audio'\)/);
});

test('sem áudio, nada muda — quem digita segue igual', () => {
  // O campo `entrada_*` e o path só aparecem quando houve fala. Cadastro
  // digitado continua com exatamente a mesma comprovação de antes.
  assert.match(METODO, /\.\.\.\(houveAudio \? \{ entrada_gratidao: 'audio'/);
  assert.match(METODO, /const houveAudio = bl\.gratidao\?\.entrada === 'audio' \|\| !!audioGratidao;/);
  assert.match(METODO, /audioGratidao, audioGratidaoSeg, transcricaoGratidao, audioAcao, tempoTelaS/,
    'o ritual precisa entregar áudio, duração e transcrição pra cima');
});
