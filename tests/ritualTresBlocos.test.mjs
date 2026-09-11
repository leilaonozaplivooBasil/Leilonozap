// 🌅 O RITUAL EM TRÊS BLOCOS — a tela e a gravação (10/09/2026)
//
// As regras puras estão em tests/ritualEmBlocos.test.mjs. Aqui ficam as
// promessas que só a tela e o CrmMetodo podem quebrar — cada uma amarrada a
// uma frase do áudio do Luiz ou a um número do banco.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => semComentarios(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const RITUAL = ler('src/components/licensing/CentralVendas/XGameRitualAmanhecer.jsx');
const CRM = ler('src/components/licensing/CentralVendas/CrmMetodo.jsx');

// ───────────────────────────────────────────────────────────────────────────
test('R3B-1 · são três blocos, nesta ordem, e cada um tem a sua tela', () => {
  assert.match(RITUAL, /const P = Object\.freeze\(\{ ABERTURA: 0, ACORDEI: 1, GRATIDAO: 2, VISUALIZACAO: 3, FECHAMENTO: 4 \}\)/);
  for (const passo of ['P.ABERTURA', 'P.ACORDEI', 'P.GRATIDAO', 'P.VISUALIZACAO', 'P.FECHAMENTO']) {
    assert.ok(RITUAL.includes(`{passo === ${passo} && (`), `sumiu a tela do passo ${passo}`);
  }
  // e o print do bom dia vem ANTES da gratidão — Luiz: "logo depois que ele
  // acordou, fez o print, ele vem para o áudio da gratidão"
  assert.ok(RITUAL.indexOf('{passo === P.ACORDEI && (') < RITUAL.indexOf('{passo === P.GRATIDAO && ('), 'o print caiu pra depois da gratidão');
  assert.ok(RITUAL.indexOf('{passo === P.GRATIDAO && (') < RITUAL.indexOf('{passo === P.VISUALIZACAO && ('), 'a gratidão caiu pra depois da visualização');
});

test('R3B-2 · cada bloco grava sozinho, e nenhum deles avança sem ter gravado', () => {
  // 🔴 A promessa do dono: "se o telefone morrer no bloco 3, os blocos 1 e 2
  // já estão em casa". Se `setPasso` for chamado fora do `if (ok)`, a pessoa
  // avança achando que salvou — e não salvou.
  for (const [nome, passoSeguinte] of [['acordei', 'P.GRATIDAO'], ['gratidao', 'P.VISUALIZACAO'], ['visualizacao', 'P.FECHAMENTO']]) {
    const re = new RegExp(`const salvar\\w+ = async \\(\\) => \\{[\\s\\S]{0,600}?salvarBloco\\('${nome}'[\\s\\S]{0,300}?if \\(ok\\) setPasso\\(${passoSeguinte.replace('.', '\\.')}\\)`);
    assert.match(RITUAL, re, `o bloco "${nome}" avança sem confirmar que gravou`);
  }
  // e salvarBloco só devolve true quando o gravador devolveu comprovação
  assert.match(RITUAL, /const nova = await onBloco\?\.\(bloco, dados, \{ abertoEm \}\);/);
  assert.match(RITUAL, /return !!nova;/);
});

test('R3B-3 · a IA NUNCA trava o avanço — julga depois da gravação', () => {
  // Decisão do dono ("salva e a IA julga depois"), com motivo duro: a IA
  // passou três horas fora do ar em 10/09. Print bloqueante + IA fora =
  // ninguém passa do bloco 1 às cinco da manhã.
  const ini = CRM.indexOf('const salvarBlocoDoRitual');
  const fim = CRM.indexOf('const julgarBlocoComIA');
  assert.ok(ini > 0 && fim > ini, 'premissa: o gravador de bloco existe');
  const gravador = CRM.slice(ini, fim);
  const posGravou = gravador.indexOf('await plataforma.entities.MetodoTarefa.update(t.id, { comprovacao: nova })');
  const posIA = gravador.indexOf('julgarBlocoComIA(t.id, bloco,');
  assert.ok(posGravou > 0 && posIA > 0, 'premissa: grava e chama a IA');
  assert.ok(posGravou < posIA, 'a IA é chamada ANTES de gravar — se ela cair, o bloco se perde');
  // 🔴 e a chamada NÃO é esperada: `await` aqui faria a pessoa esperar a IA.
  assert.ok(!/await julgarBlocoComIA/.test(gravador), 'a IA passou a segurar a pessoa');
  // o julgamento inteiro vive dentro de try/catch e nunca lança pra cima
  const julg = CRM.slice(fim, CRM.indexOf('const concluirRitual', fim));
  assert.match(julg, /\} catch \{[^}]*\}/, 'o julgamento por bloco pode derrubar o ritual');
});

test('R3B-4 · a gratidão são DUAS opções do mesmo tamanho, não um plano B', () => {
  // Luiz: "só o áudio. O áudio e o digitar. Dá duas opções."
  // Antes: um botão grande de gravar + uma caixa com "OU escreve com o
  // coração". Escrever era o caminho torto, e a tela dizia isso.
  assert.match(RITUAL, /data-teste="duas-opcoes-da-gratidao"/);
  assert.match(RITUAL, /data-teste="opcao-falar"/);
  assert.match(RITUAL, /data-teste="opcao-escrever"/);
  // mesmo container em grade de duas colunas = mesmo peso visual
  assert.match(RITUAL, /className="grid grid-cols-2 gap-2" data-teste="duas-opcoes-da-gratidao"/);
  // e o texto não se anuncia mais como alternativa
  assert.ok(!/ou escreve com o coração/.test(RITUAL), 'o "ou" voltou — escrever virou plano B de novo');
  assert.match(RITUAL, /placeholder=\{audioGratidaoUrl[\s\S]{0,160}?'escreve com o coração/);
});

test('R3B-5 · o que ficou errado fica PARADO na tela, não num toast', () => {
  // Luiz: "se ele fez alguma coisa errada, a plataforma precisa sinalizar."
  // Nenhuma das 7 pessoas reprovadas em 09 e 10/09 consegue reler o motivo.
  assert.match(RITUAL, /data-teste="pendencias-do-ritual"/);
  assert.match(RITUAL, /const pendencias = pendenciasDoRitual\(comprovacao\);/);
  assert.match(RITUAL, /\{pendencias\.map\(\(x, i\) =>/, 'as pendências pararam de ser listadas uma a uma');
  // e ficam GRAVADAS, não só desenhadas
  assert.match(CRM, /\.\.\.\(pendentes\.length \? \{ pendencias: pendentes \} : \{\}\)/, 'o que faltou parou de ir pro registro');
  // o selo é explicado ANTES de concluir, não depois
  assert.match(RITUAL, /Concluir agora carimba o seu ritual como BRILHANTE/);
  assert.match(RITUAL, /data-teste="voltar-pro-video"/, 'sumiu o caminho de voltar e gravar o vídeo que falta');
});

test('R3B-6 · o fechamento NÃO sobe nada de novo — lê o que os blocos gravaram', () => {
  // Subir de novo duplicaria arquivo no cofre e faria a pessoa esperar duas
  // vezes pela mesma coisa.
  const ini = CRM.indexOf('const gravado = t.comprovacao?.tipo');
  assert.ok(ini > 0, 'premissa: o fechamento lê o gravado');
  const fech = CRM.slice(ini, CRM.indexOf('const comprovacao = {', ini) + 3000);
  for (const proibido of ['guardarVideo(', 'guardarAudio(', 'Core.UploadFile']) {
    assert.ok(!fech.includes(proibido), `o fechamento voltou a subir arquivo (${proibido})`);
  }
  assert.match(fech, /const videoPath = bl\.visualizacao\?\.video_path \|\| '';/);
});

test('R3B-7 · ritual pela metade NÃO conta como comprovação boa', () => {
  // `valido` e `feito` decidem pontos e dinheiro. Um ritual parcial é registro
  // honesto do que aconteceu — não entrega aprovada.
  assert.match(CRM, /valido: statusFinal === 'aprovada_ritual',/);
  assert.match(CRM, /update\(t\.id, \{ feito: comprovacao\.valido, comprovacao \}\)/);
  assert.match(CRM, /if \(ehHoje && xgame && comprovacao\.valido\) \{/, 'ritual parcial voltou a pagar pontos');
  // o bloco solto nasce inválido e em andamento
  assert.match(CRM, /nova\.status = 'ritual_em_andamento';\s*\n\s*nova\.valido = false;/);
});

test('R3B-8 · o cronômetro por pessoa substituiu o corte seco no relógio', () => {
  // A Iara perdeu por 4min12s com o corte às 05:30. A JANELA de abertura
  // continua (protege o acordar cedo); o que mudou é o prazo pra CONCLUIR.
  assert.match(CRM, /if \(ritualExpirado\(\{ abertoEm: t\.comprovacao\?\.aberto_em \}\)\) \{/);
  assert.ok(!/if \(agoraM > RITUAL_FIM_MIN\) \{/.test(CRM), 'o corte seco no relógio voltou pro fechamento');
  // e o que já estava entregue NÃO se perde quando o tempo acaba
  assert.match(CRM, /status: blocosFeitos\(jaEntregue\)\.length \? 'ritual_parcial' : 'reprovada',/);
  assert.match(CRM, /\.\.\.jaEntregue,/, 'estourar o tempo voltou a apagar os blocos entregues');
  // a janela de abertura segue intocada
  assert.match(CRM, /const naJanela = agoraM >= RITUAL_INICIO_MIN;/);
});

test('R3B-9 · reabrir cai no bloco que falta — e só no ritual de hoje', () => {
  // 🧪 10/09 — em modo dev a tela lê a comprovação SIMULADA, não a do banco:
  // senão, testar com o relógio de teste mostraria o ritual real de hoje
  // dentro da simulação. A régua do dia (`ritualRetomavel`) vale nos dois.
  assert.match(CRM, /const c = modoDev \? devMarcas\[t\.id\]\?\.comprovacao : t\.comprovacao;/);
  assert.match(CRM, /return ritualRetomavel\(c, hojeStr\(\)\) \? c : null;/);
  assert.match(RITUAL, /useState\(\(\) => \(feitos\.length \? \(PASSO_DO_BLOCO\[faltando\] \?\? P\.FECHAMENTO\) : P\.ABERTURA\)\)/);
});

test('R3B-10 · a barra 1·2·3 mostra o que já está em casa', () => {
  assert.match(RITUAL, /data-teste="barra-dos-blocos"/);
  assert.match(RITUAL, /data-teste=\{`bloco-\$\{nome\}\$\{pronto \? '-pronto' : ''\}`\}/);
  assert.match(RITUAL, /data-teste="cronometro-do-ritual"/);
  // as bolinhas mudas de antes não podem voltar
  assert.ok(!/\[0, 1, 2, 3\]\.map/.test(RITUAL), 'voltaram as bolinhas que não diziam nada');
});

// ───────────────────────────────────────────────────────────────────────────
test('R3B-11 · 🧪 testar o ritual não pode gravar nada de verdade', () => {
  // 🔴 O relógio de teste é a ÚNICA forma de abrir o ritual fora das
  // 04:40–05:30 — ou seja, é assim que ele SEMPRE vai ser testado. Sem guarda
  // no gravador de bloco, cada teste escreveria linha em `metodo_tarefas`,
  // print no bucket, vídeo no cofre e três chamadas de IA. `concluirRitual`
  // já simulava desde sempre; o gravador de bloco nasceu sem.
  const ini = CRM.indexOf('const salvarBlocoDoRitual');
  const fim = CRM.indexOf('const julgarBlocoComIA');
  assert.ok(ini > 0 && fim > ini, 'premissa: o gravador de bloco existe');
  const gravador = CRM.slice(ini, fim);
  const guarda = gravador.indexOf('if (modoDev) {');
  assert.ok(guarda > 0, 'o gravador de bloco voltou a gravar de verdade no modo de teste');
  // e a guarda vem ANTES de qualquer upload, escrita ou chamada de IA
  for (const efeito of ['Core.UploadFile', 'guardarVideo(', 'guardarAudio(', 'MetodoTarefa.update', 'julgarBlocoComIA(']) {
    const pos = gravador.indexOf(efeito);
    assert.ok(pos > guarda, `"${efeito}" acontece antes da guarda de modo dev — o teste grava de verdade`);
  }
  assert.match(gravador, /return novaDev;/, 'a simulação precisa devolver a comprovação pra tela avançar');
  // o fechamento simulado mostra o selo REAL do que foi montado, não "aprovado" fixo
  assert.match(CRM, /const statusDev = statusDoRitual\(bloquinhos\);/);
  assert.ok(!/comprovacao: \{ tipo: 'ritual', valido: true, status: 'aprovada_ritual', dev: true/.test(CRM), 'o modo dev voltou a aprovar sempre — ninguém veria a tela de pendências no teste');
});
