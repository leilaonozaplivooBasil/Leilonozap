/**
 * 🌅 A 2ª LÂMINA DO RITUAL — O DESPERTAR (22/09/2026)
 *
 * Dono, com o print da lâmina na mão: "Segunda lâmina: uma imagem que reflita
 * o Despertar, uma força, que pegue a tela toda. Precisa ter também a câmera
 * aqui pra bater a foto — é muito melhor isso, está dando trabalho manter
 * todas as outras. Mix com textos melhores, mantendo limpo, porém que dê pra
 * ler e aparecer legal no telefone."
 *
 * O que estes testes existem pra impedir de voltar:
 *  · os três caminhos concorrendo na mesma tela (Instagram em botão gigante
 *    com degradê roxo→rosa→laranja, galeria do mesmo tamanho, e só depois o
 *    comprovar) — quem acorda às 4h40 não escolhe entre três coisas;
 *  · a lente ficar acesa depois que a pessoa fecha o ritual;
 *  · a IA julgar uma foto tirada AGORA com a régua do print, procurando data
 *    na tela e desconfiando de imagem escura de 4h40 — que é o erro que pegou
 *    a Sophia em 21/09, só que aplicado à casa inteira de uma vez.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const TELA = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/XGameRitualAmanhecer.jsx', import.meta.url), 'utf8'));
const FUNDO = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/FundoJanelaDoMar.jsx', import.meta.url), 'utf8'));
const CRM = semComentarios(readFileSync(new URL('../src/components/licensing/CentralVendas/CrmMetodo.jsx', import.meta.url), 'utf8'));
const IA = readFileSync(new URL('../api/functions/xgameValidarPrint.js', import.meta.url), 'utf8');

const laminaDoDespertar = () => {
  const i = TELA.indexOf('{passo === P.ACORDEI && (');
  assert.ok(i > 0, 'sumiu a lâmina do despertar');
  return TELA.slice(i, TELA.indexOf('{passo === P.GRATIDAO && (', i));
};

test('a câmera ao vivo é o caminho principal do despertar', () => {
  const l = laminaDoDespertar();
  assert.match(l, /data-teste="camera-do-despertar"/);
  assert.match(l, /marca="abrir-camera-do-despertar"/);
  assert.match(l, /marca="bater-a-foto"/);
  assert.match(l, /data-teste="virar-camera-do-despertar"/, 'DIR-93: toda comprovação vira a câmera');
  assert.match(TELA, /const baterFoto = \(\) => \{/);
  assert.match(TELA, /navigator\.mediaDevices\.getUserMedia\(\{ video: \{ facingMode: \{ ideal: lado \} \}, audio: false \}\)/);
});

test('🔴 o Instagram e a galeria viram linha de texto, não botão', () => {
  const l = laminaDoDespertar();
  // o degradê roxo→rosa→laranja é a MESMA assinatura de app-feito-por-IA que
  // a lâmina 1 expulsou; se voltar aqui, voltou pro ritual inteiro
  assert.ok(!/from-purple-500/.test(l), 'voltou o botão de degradê roxo do Instagram');
  assert.ok(!/via-pink-500/.test(l));
  assert.match(l, /data-teste="portas-de-servico-do-despertar"/);
  const i = l.indexOf('data-teste="abrir-instagram"');
  assert.ok(i > 0, 'o Instagram sumiu de vez — quem já postou o story precisa do caminho');
  assert.match(l.slice(i - 400, i + 300), /text-\[12px\]/, 'o Instagram voltou a ter tamanho de botão principal');
  assert.match(l, /data-teste="print-do-bom-dia"/, 'sumiu a galeria — quem não tem câmera liberada fica sem saída');
});

test('a lente desliga quando a tela morre', () => {
  // sem isto a luzinha da câmera fica acesa depois que a pessoa fecha o ritual
  assert.match(TELA, /useEffect\(\(\) => \(\) => \{ streamFotoRef\.current\?\.getTracks\?\.\(\)\.forEach\(\(t\) => t\.stop\(\)\); \}, \[\]\);/);
  assert.match(TELA, /const fecharCameraFoto = \(\) => \{/);
  // e refazer o bloco também fecha: senão a câmera fica aberta por trás
  assert.match(TELA, /if \(bloco === 'acordei'\) \{ setPrint\(null\); setFotoAoVivo\(false\); fecharCameraFoto\(\); \}/);
  // 📵 e avançar de bloco também: no celular a câmera é recurso EXCLUSIVO,
  // e uma lente esquecida aqui faz o vídeo da visualização ser recusado
  const i = TELA.indexOf('const salvarAcordei');
  assert.match(TELA.slice(i, i + 300), /fecharCameraFoto\(\);/, 'a lente da foto pode sobreviver até a lâmina do vídeo');
});

test('a câmera de FOTO é separada da câmera de VÍDEO', () => {
  // misturar as duas seria herdar MediaRecorder, cronômetro e teto de
  // segurança numa lâmina que não grava nada
  assert.ok(TELA.includes('streamFotoRef'), 'sumiu o stream próprio da foto');
  assert.ok(TELA.includes('videoFotoRef'), 'sumiu o <video> próprio da foto');
  const i = TELA.indexOf('const baterFoto');
  assert.ok(!/MediaRecorder/.test(TELA.slice(i, i + 600)), 'a câmera da foto encostou no gravador de vídeo');
});

test('🤖 a IA fica sabendo que a foto nasceu da lente', () => {
  // sem este aviso a régua [TIPO instagram] procura data na tela e desconfia
  // de imagem escura — e foto legítima de 4h40 vira dúvida pra todo mundo
  assert.match(TELA, /setFotoAoVivo\(true\)/);
  assert.match(TELA, /salvarBloco\('acordei', \{ file: print, hash, aoVivo: fotoAoVivo \}\)/);
  assert.match(CRM, /\.\.\.\(dados\.aoVivo \? \{ ao_vivo: true \} : \{\}\)/, 'o bloco gravado precisa guardar ao_vivo');
  assert.match(CRM, /\.\.\.\(bloco === 'acordei' && dados\.aoVivo \? \{ ao_vivo: true \} : \{\}\)/, '1ª análise');
  assert.match(CRM, /\.\.\.\(bloco === 'acordei' && doBloco\?\.ao_vivo \? \{ ao_vivo: true \} : \{\}\)/, '2ª análise, depois da explicação');
  assert.match(IA, /const aoVivo = body\?\.ao_vivo === true/);
  assert.match(IA, /\$\{aoVivo \? `\\n\$\{AVISO_AO_VIVO\}` : ''\}/, 'o aviso não entrou no contexto da chamada');
});

test('🤖 o aviso da foto ao vivo desarma os dois motivos que reprovariam todo mundo', () => {
  const i = IA.indexOf('const AVISO_AO_VIVO');
  assert.ok(i > 0, 'sumiu o aviso da foto ao vivo');
  const t = IA.slice(i, IA.indexOf('`;', i));
  assert.match(t, /"Pode ser de outro dia" está DESCARTADO/);
  assert.match(t, /ESCURA/, 'escuridão de 4h40 tem que ser esperada, não suspeita');
  assert.match(t, /DORMINDO/, 'o que AINDA reprova precisa continuar escrito');
});

test('🤖 o aviso fica FORA do prefixo cacheado', () => {
  // o prefixo do sistema tem que ser idêntico em toda chamada — uma entrada
  // de cache só. Um aviso condicional lá dentro quebraria o cache de todo
  // mundo pra atender uma lâmina.
  const inicio = IA.indexOf('const sistema = [');
  assert.ok(inicio > 0, 'sumiu a montagem do prefixo do sistema');
  const fim = IA.indexOf('cache_control:', inicio); // a partir do prefixo, não do arquivo todo
  assert.ok(fim > inicio, 'o prefixo do sistema perdeu o cache_control');
  const prefixo = IA.slice(inicio, fim);
  assert.ok(!prefixo.includes('AVISO_AO_VIVO'), 'o aviso entrou no prefixo cacheado e quebra o cache de todas as chamadas');
  // e o aviso TEM que estar no contexto, senão ele não chega em lugar nenhum
  assert.ok(IA.slice(IA.indexOf('const contexto =')).includes('AVISO_AO_VIVO'));
});

test('🌅 os raios do despertar só aparecem na lâmina do despertar', () => {
  assert.match(FUNDO, /export default function FundoJanelaDoMar\(\{ luz = 0, foto = null, raios = false \}\)/);
  assert.match(FUNDO, /repeating-conic-gradient\(from \d+deg at \$\{SOL_X\}% \$\{solY\}%/, 'o leque de luz sai do sol, não do meio da tela');
  assert.match(TELA, /raios=\{passo === P\.ACORDEI\}/);
});

test('a luz do despertar é o sol rompendo, não a hora azul', () => {
  const i = TELA.indexOf('const LUZ_DO_PASSO');
  const trecho = TELA.slice(i, i + 220);
  const m = trecho.match(/\[P\.ACORDEI\]: ([\d.]+)/);
  assert.ok(m, 'sumiu a luz do passo acordei');
  assert.ok(Number(m[1]) >= 0.4, `a lâmina do despertar voltou pra penumbra (${m[1]}) — o sol tem que estar rompendo`);
});

test('quem pediu menos movimento não leva os raios piscando', () => {
  const i = FUNDO.indexOf('prefers-reduced-motion');
  assert.ok(FUNDO.slice(i, i + 300).includes('jm-raios'), 'os raios continuam animando com movimento reduzido');
});

test('os textos do despertar são curtos e medidos', () => {
  const l = laminaDoDespertar();
  assert.match(l, /Você levantou\./);
  assert.ok(!/Posta o teu bom dia/.test(l), 'voltou o texto antigo, que era instrução de manual');
  // medido: em #FFF1DF o subtítulo dava 4,44:1 no celular em cima do clarão
  assert.match(l, /<p className="text-white text-\[15px\]/, 'o subtítulo perdeu o branco puro e volta a raspar no mínimo da WCAG');
});

test('a foto escolhida aparece grande antes de comprovar', () => {
  // miniatura de 44px fazia a pessoa apertar comprovar sem ter visto o que
  // estava mandando
  const l = laminaDoDespertar();
  const i = l.indexOf('data-teste="print-escolhido"');
  assert.ok(i > 0);
  assert.match(l.slice(i, i + 400), /max-w-\[300px\]/);
  assert.match(l, /data-teste="trocar-a-foto"/);
});

test('🌈 o ícone do Instagram usa as cores da marca, não o cinza do texto', () => {
  // Dono, 22/09: "precisa entrar o ícone do Instagram com as cores dele, pode
  // manter tamanho e tal, mas deixa a cor do Instagram." O degradê vai no
  // TRAÇO do ícone — não num botão de fundo colorido, que foi exatamente o
  // que saiu desta lâmina. A marca aparece; o peso do caminho não muda.
  const l = laminaDoDespertar();
  const i = l.indexOf('data-teste="abrir-instagram"');
  assert.ok(i > 0, 'sumiu o caminho do Instagram');
  const trecho = l.slice(i, i + 1600);
  assert.match(trecho, /linearGradient id="corDoInstagram"/, 'o ícone voltou a ser monocromático');
  for (const cor of ['#FFD600', '#FF7A00', '#FF0069', '#D300C5', '#7638FA']) {
    assert.ok(trecho.includes(cor), `sumiu a parada ${cor} do degradê da marca`);
  }
  assert.match(trecho, /stroke="url\(#corDoInstagram\)"/, 'a cor precisa estar no TRAÇO');
  assert.match(trecho, /text-\[12px\]/, 'o link cresceu — o tamanho é que diz qual é o caminho principal');
  assert.ok(!/bg-gradient-to-r/.test(trecho), 'o degradê virou fundo de botão outra vez');
});
