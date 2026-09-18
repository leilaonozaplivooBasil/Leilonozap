/**
 * 📣 O AVISO DA ETAPA VIRA PROGRESSO.
 *
 * Dono (18/09/2026), com print do Ritual, circulando de vermelho o "fale mais
 * 9s — ou escreva": "os textos de avisos nas etapas precisam ser mais
 * interativos e animados, para aumentar a gamificação e visibilidade. Estamos
 * pecando em atenção do usuário nesses textos especificamente".
 *
 * 🔎 A REDAÇÃO JÁ ESTAVA CERTA. Aquele texto diz a falta na unidade certa
 * (segundos pra quem falou, letras pra quem escreveu) desde o chamado do Paim
 * em 07/09. O que falha é (1) o tamanho — 11px a 45% de branco sobre um
 * degradê — e (2) o sentido: contar o que FALTA em vez do que já foi feito.
 *
 * Aqui mora a régua. O desenho e a animação são provados na banca.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { progressoDaEtapa, coresDaFase, fraseDoProgresso, CORES_DA_FASE } from '../src/lib/progressoDaEtapa.js';
import { semComentarios } from './_ajuda.mjs';

const RAIZ = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const ler = (rel) => readFileSync(path.join(RAIZ, rel), 'utf8');

test('o caso do print: 61s de 70s são 87% andados, não "faltam 9"', () => {
  const p = progressoDaEtapa({ feito: 61, meta: 70 });
  assert.equal(p.pct, 87);
  assert.equal(p.falta, 9);
  assert.equal(p.fase, 'perto');
  assert.equal(fraseDoProgresso({ feito: 61, meta: 70 }), '61s de 70s · fale mais 9');
});

test('🔴 a frase COMEÇA pelo que já foi feito', () => {
  // é o ponto inteiro da mudança: o primeiro número que a pessoa lê tem que
  // ser o que ela ganhou, não o que ela deve.
  const frase = fraseDoProgresso({ feito: 12, meta: 70 });
  assert.ok(frase.startsWith('12s de 70s'), `a frase começou por: ${frase}`);
  const letras = fraseDoProgresso({ feito: 18, meta: 20, unidade: 'letras' });
  assert.ok(letras.startsWith('18 de 20 letras'), `a frase começou por: ${letras}`);
});

test('a barra nunca passa de 100% nem volta pra negativo', () => {
  assert.equal(progressoDaEtapa({ feito: 200, meta: 70 }).pct, 100, 'quem falou demais não estoura a barra');
  assert.equal(progressoDaEtapa({ feito: -5, meta: 70 }).pct, 0);
  assert.equal(progressoDaEtapa({ feito: 200, meta: 70 }).falta, 0);
});

test('as fases viram na hora certa', () => {
  assert.equal(progressoDaEtapa({ feito: 0, meta: 100 }).fase, 'longe');
  assert.equal(progressoDaEtapa({ feito: 69, meta: 100 }).fase, 'longe');
  assert.equal(progressoDaEtapa({ feito: 70, meta: 100 }).fase, 'perto', '70% é onde a cor esquenta');
  assert.equal(progressoDaEtapa({ feito: 100, meta: 100 }).fase, 'pronto');
});

test('🔴 meta podre não prende a pessoa numa barra que nunca enche', () => {
  // dado ruim vindo de configuração não pode virar tranca: a pessoa fez a
  // tarefa e ficaria olhando 0% para sempre.
  for (const ruim of [0, -1, null, undefined, NaN, 'abc']) {
    const p = progressoDaEtapa({ feito: 10, meta: ruim });
    assert.equal(p.pronto, true, `meta ${String(ruim)} travou a pessoa`);
    assert.equal(p.pct, 100);
  }
});

test('feito podre conta como zero, sem NaN na largura da barra', () => {
  for (const ruim of [null, undefined, NaN, 'abc', -3]) {
    const p = progressoDaEtapa({ feito: ruim, meta: 70 });
    assert.equal(p.pct, 0, `feito ${String(ruim)} virou ${p.pct}`);
    assert.ok(Number.isFinite(p.pct));
  }
});

test('a falta arredonda PRA CIMA — "fale mais 0" seria mentira', () => {
  // 69,2s de 70 faltam 0,8s. Dizer "fale mais 0" com o botão apagado é o tipo
  // de coisa que gera chamado no suporte.
  assert.equal(progressoDaEtapa({ feito: 69.2, meta: 70 }).falta, 1);
  assert.equal(progressoDaEtapa({ feito: 69.9, meta: 70 }).falta, 1);
});

test('liberado NÃO traz ✔ no texto — quem desenha põe o ícone', () => {
  // a primeira foto da banca saiu com "✓ ✔ liberado", check dobrado.
  assert.equal(fraseDoProgresso({ feito: 70, meta: 70 }), 'liberado');
  assert.equal(fraseDoProgresso({ feito: 20, meta: 20, unidade: 'letras' }), 'no tamanho');
});

test('🔴 as classes são NOMES INTEIROS, nunca montadas em pedaços', () => {
  // O Tailwind varre o código como TEXTO. `text-${cor}-300` não existe no
  // varrimento, a classe não é gerada, e o elemento sai sem cor — defeito que
  // só aparece no build de produção, nunca no `vite dev`.
  // 🔎 SEM COMENTÁRIOS. A primeira versão deste teste falhou sozinha: o próprio
  // comentário da lib CITA `text-${cor}-300` como exemplo do que não fazer, e o
  // teste leu a explicação como se fosse código. Ele acusava o aviso.
  const fonte = semComentarios(ler('src/lib/progressoDaEtapa.js'));
  assert.ok(!/(bg|text|ring)-\$\{/.test(fonte), 'tem classe montada por interpolação');
  for (const fase of ['longe', 'perto', 'pronto']) {
    const c = coresDaFase(fase);
    for (const classe of Object.values(c)) {
      assert.match(classe, /^[a-z-]+-[a-z]+-\d{2,3}(\/\d{1,3})?$/, `classe estranha: ${classe}`);
    }
  }
});

test('fase desconhecida cai em "longe" em vez de sair sem cor', () => {
  assert.deepEqual(coresDaFase('inventada'), CORES_DA_FASE.longe);
  assert.deepEqual(coresDaFase(undefined), CORES_DA_FASE.longe);
});

// ─────────────── o componente ───────────────

test('a pílula tem fundo e aro próprios — o problema era contraste', () => {
  const c = ler('src/components/licensing/CentralVendas/DicaDaEtapa.jsx');
  assert.match(c, /\$\{cor\.fundo\} ring-1 \$\{cor\.aro\}/,
    'sem fundo próprio a pílula some no degradê, que é o defeito de hoje');
  assert.match(c, /text-\[13px\] font-extrabold/,
    'voltou a ser miúdo — o aviso antigo era 11px a 45% de branco');
});

test('🔑 o número REMONTA a cada mudança — senão a animação não roda', () => {
  const c = ler('src/components/licensing/CentralVendas/DicaDaEtapa.jsx');
  assert.match(c, /<span key=\{frase\}/,
    'sem `key`, o React reaproveita o nó, a animação não reinicia e o número muda sem ninguém ver');
  assert.match(c, /dica-salto/);
});

test('🔇 a notinha toca UMA vez por liberação, e obedece o silêncio', () => {
  const c = semComentarios(ler('src/components/licensing/CentralVendas/DicaDaEtapa.jsx'));
  // 🔎 ESTE TESTE JÁ FOI ENFEITE, e a mutação pegou. Ele exigia um `useRef` de
  // trava — e apagar esse ref NÃO derrubava teste nenhum, porque quem impede a
  // repetição é o array de dependências: o efeito só roda quando `pronto` VIRA.
  // O ref saiu do código, e o teste passou a provar o mecanismo de verdade.
  assert.match(c, /useEffect\(\(\) => \{\s*if \(pronto\) som\('passo'\);\s*\}, \[pronto\]\);/,
    'o som precisa depender de `pronto` — sem isso toca a cada re-render');
  assert.match(c, /import \{ som \} from '@\/lib\/somDaInterface'/,
    'o som tem que passar por `som()`, que já obedece o botão de silêncio do ritual');
});

test('🎞️ quem pediu menos movimento não leva animação', () => {
  // 🔎 SEM COMENTÁRIOS, pelo mesmo motivo do teste acima: o cabeçalho do
  // componente EXPLICA o `prefers-reduced-motion`, e `indexOf` caía na
  // explicação em vez da regra de CSS. O teste acusava a documentação.
  const c = semComentarios(ler('src/components/licensing/CentralVendas/DicaDaEtapa.jsx'));
  assert.match(c, /@media \(prefers-reduced-motion: reduce\)/);
  const bloco = c.slice(c.indexOf('@media (prefers-reduced-motion: reduce)'));
  for (const classe of ['dica-salto', 'dica-pulso', 'dica-liberou']) {
    assert.ok(bloco.slice(0, 220).includes(classe), `${classe} continua animando com movimento reduzido`);
  }
  // e sem animação a pílula CONTINUA legível: cor e barra não dependem de movimento
  assert.match(c, /transition-\[width\]/, 'a barra usa transição de largura, não animação infinita');
});

test('as duas etapas do ritual usam a pílula', () => {
  const r = ler('src/components/licensing/CentralVendas/XGameRitualAmanhecer.jsx');
  assert.match(r, /import DicaDaEtapa from '\.\/DicaDaEtapa'/);
  assert.match(r, /teste="dica-gratidao"/, 'a gratidão é a etapa do print do dono');
  assert.match(r, /teste="dica-visualizacao"/,
    'a visualização tinha a MESMA dor: o quanto falta só existia no `title`, invisível no celular');
});
