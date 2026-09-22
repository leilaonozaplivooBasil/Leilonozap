/**
 * 🔐 O MAPA É DE QUEM PEDIU — e o que chega do navegador não é confiável.
 *
 * Duas famílias de prova:
 *
 * 1. A IDENTIDADE vem do crachá assinado, nunca do corpo. Se viesse de
 *    `body.user_id`, bastaria trocar um número para ler a cabeça de outra
 *    pessoa — e ids circulam nas respostas normais da API. É o mesmo buraco
 *    que o crachá fechou na Leila.
 *
 * 2. O CONTEÚDO é limpo antes de gravar. Um `nos` torto vira dado morto no
 *    banco, ou tela quebrada na próxima vez que alguém abrir.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { limparNos } from '../api/functions/meuMapaMental.js';

const ROTA = readFileSync(new URL('../api/functions/meuMapaMental.js', import.meta.url), 'utf8')
  .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

describe('🔐 de quem é o mapa', () => {
  test('🔴 a identidade sai do crachá conferido', () => {
    assert.match(ROTA, /conferirSessao\(req\)/, 'parou de conferir o crachá');
    assert.match(ROTA, /ses\.userId/, 'não usa o dono que o crachá devolveu');
  });

  test('🔴 e NUNCA do corpo da requisição', () => {
    assert.doesNotMatch(ROTA, /body\.user_id/, 'voltou a aceitar o dono pelo corpo — leria a mente alheia');
    assert.doesNotMatch(ROTA, /body\.userId/, 'idem');
  });

  test('🔴 o UPDATE filtra por user_id, não só pelo id do mapa', () => {
    // Cinto e suspensório: nem um id trocado alcança o mapa de outra pessoa.
    assert.match(ROTA, /mapas_mentais\?id=eq\.\$\{enc\(jaTem\)\}&user_id=eq\.\$\{enc\(dono\)\}/);
  });

  test('sem crachá, recusa com 401', () => {
    assert.match(ROTA, /nao_autenticado/);
    assert.match(ROTA, /status\(401\)/);
  });
});

describe('🧹 o que chega do navegador é limpo antes de gravar', () => {
  test('lista tem que ser lista', () => {
    for (const lixo of [null, undefined, 'texto', 42, {}]) {
      assert.deepEqual(limparNos(lixo), [], `aceitou ${JSON.stringify(lixo)}`);
    }
  });

  test('nó sem id é descartado — sem id não há pai nem filho', () => {
    assert.equal(limparNos([{ texto: 'a' }, { id: '', texto: 'b' }, { id: 'ok', texto: 'c' }]).length, 1);
  });

  test('🔴 id repetido não entra duas vezes', () => {
    // Dois nós com o mesmo id quebram a relação pai/filho: os filhos de um
    // apareceriam pendurados no outro.
    const nos = limparNos([{ id: 'x', texto: 'primeiro' }, { id: 'x', texto: 'segundo' }]);
    assert.equal(nos.length, 1);
    assert.equal(nos[0].texto, 'primeiro');
  });

  test('🔴 pai que não existe vira raiz, e o nó NÃO some', () => {
    // Sem isto o nó fica gravado e fora da tela para sempre — pedaço da mente
    // perdido em silêncio.
    const nos = limparNos([{ id: 'filho', texto: 'órfão', pai: 'pai-fantasma' }]);
    assert.equal(nos.length, 1, 'o nó foi descartado em vez de virar raiz');
    assert.equal(nos[0].pai, null);
  });

  test('pai que existe é preservado', () => {
    const nos = limparNos([{ id: 'p', texto: 'pai' }, { id: 'f', texto: 'filho', pai: 'p' }]);
    assert.equal(nos.find((n) => n.id === 'f').pai, 'p');
  });

  test('texto gigante é cortado, não recusado', () => {
    const nos = limparNos([{ id: 'x', texto: 'a'.repeat(5000) }]);
    assert.equal(nos[0].texto.length, 280);
  });

  test('🔴 mapa gigante tem teto — senão trava a aba de quem abrir', () => {
    const muitos = Array.from({ length: 900 }, (_, i) => ({ id: `n${i}`, texto: 'x' }));
    assert.equal(limparNos(muitos).length, 400);
  });

  test('coordenada estranha vira zero em vez de NaN na tela', () => {
    const nos = limparNos([{ id: 'x', texto: 'a', x: 'abc', y: null }]);
    assert.equal(nos[0].x, 0);
    assert.equal(nos[0].y, 0);
  });

  test('campo extra não passa para o banco', () => {
    const nos = limparNos([{ id: 'x', texto: 'a', malicioso: 'DROP', outro: 1 }]);
    assert.deepEqual(Object.keys(nos[0]).sort(), ['id', 'pai', 'texto', 'x', 'y']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('🧠 o ✈ do mapa larga na fila que já existe (minhasDemandas)', () => {
  const ROTA_D = readFileSync(new URL('../api/functions/minhasDemandas.js', import.meta.url), 'utf8')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

  test('🔴 a identidade sai do crachá, nunca do corpo', () => {
    // com `body.pessoa_id`, trocar um número plantaria demanda na fila de
    // outra pessoa — e ela apareceria no Painel Corporativo dela.
    assert.match(ROTA_D, /conferirSessao\(req\)/);
    assert.doesNotMatch(ROTA_D, /body\??\.pessoa_id/, 'gravaria na fila alheia');
    assert.doesNotMatch(ROTA_D, /body\??\.user_id/, 'gravaria na fila alheia');
  });

  test('🔴 grava em xperf_demandas, e não numa tabela só do mapa', () => {
    // 21/09: a decisão do dono foi reusar a fila que o Painel Corporativo, o
    // Encontro e a Performance da Equipe já leem. Uma tabela própria seria a
    // quarta lista de pendências da casa.
    assert.match(ROTA_D, /sb\('xperf_demandas'/);
    assert.doesNotMatch(ROTA_D, /sb\('demandas'/, 'voltou a criar fila paralela');
  });

  test('🔴 a trava contra duplicata roda ANTES do insert', () => {
    // se o insert viesse primeiro, o segundo clique no mesmo nó já teria
    // gravado quando a checagem rodasse.
    //
    // 🔴 22/09 — esta prova QUASE virou enfeite. Ela media a posição do
    // primeiro `method: 'POST'` do arquivo inteiro; quando o destino direto
    // trouxe os inserts de tarefa e cartão para CIMA do handler, o primeiro
    // POST do arquivo deixou de ser o da demanda. A prova tem que olhar o
    // corpo do handler, e o insert QUE IMPORTA: o da xperf_demandas.
    const HANDLER = ROTA_D.slice(ROTA_D.indexOf('export default async function handler'));
    assert.ok(HANDLER.length > 0, 'o handler sumiu da rota');
    const ondeChecagem = HANDLER.indexOf('aQueJaEstaNaFila(');
    const ondeInsert = HANDLER.indexOf("sb('xperf_demandas', {");
    assert.ok(ondeChecagem > 0, 'a trava sumiu da rota');
    assert.ok(ondeInsert > 0, 'o insert da demanda sumiu da rota');
    assert.ok(ondeChecagem < ondeInsert, 'a trava está depois da gravação');
  });

  test('🔴 só lê o que é do dono, do mapa, e ainda aberto', () => {
    assert.match(ROTA_D, /pessoa_id=eq\.\$\{enc\(dono\)\}/);
    assert.match(ROTA_D, /origem=eq\.\$\{enc\(ORIGEM_MAPA\)\}/);
    assert.match(ROTA_D, /status=eq\.\$\{enc\(RECEBIDA\)\}/);
  });

  test('clique repetido devolve 200 com jaExistia, não erro', () => {
    // o ✈ continua no nó de propósito; o segundo clique é esperado, e acusar
    // falha faria a pessoa achar que a primeira não pegou.
    assert.match(ROTA_D, /jaExistia: true/);
    assert.doesNotMatch(ROTA_D, /status\(409\)/);
  });

  test('só aceita POST', () => {
    assert.match(ROTA_D, /req\.method !== 'POST'/);
    assert.match(ROTA_D, /status\(405\)/);
  });

  // ── ✈ o destino direto (22/09/2026) ──────────────────────────────────────
  // Áudio do dono de 19/09 (10h32): "quando eu esvazio a mente no mapa mental,
  // eu jogo para o meu quadro, para a minha lista e para a minha jornada."

  test('🔴 o destino sai de uma lista fechada — rótulo torto não vira erro', () => {
    // perder a ANOTAÇÃO por causa de um rótulo errado seria trocar o
    // essencial pelo acessório: destino desconhecido cai em 'demandas'.
    assert.match(ROTA_D, /DESTINOS = new Set\(\['demandas', 'dia', 'quadro', 'ambos'\]\)/);
    assert.match(ROTA_D, /DESTINOS\.has\(pedido\) \? pedido : 'demandas'/);
  });

  test('🔴 usa as MESMAS funções do Painel e da aba Demandas', () => {
    // formato paralelo de tarefa/cartão saindo do mapa seria a quarta forma
    // de criar trabalho na casa — e a primeira que ninguém mais lê igual.
    assert.match(ROTA_D, /import \{ tarefaDaDemanda, cardDaDemanda \} from '\.\.\/\.\.\/src\/lib\/encontro\.js'/);
    assert.match(ROTA_D, /tarefaDaDemanda\(\{ \.\.\.demanda, pessoa_id: dono \}/);
    assert.match(ROTA_D, /cardDaDemanda\(\{ \.\.\.demanda, pessoa_id: dono \}/);
  });

  test('🔴 a demanda só vira "agendada" DEPOIS que o trabalho existe', () => {
    // marcar antes faria a anotação sumir da caixa sem nada ter sido criado —
    // e ninguém descobre, porque some calado.
    const F = ROTA_D.slice(ROTA_D.indexOf('async function virarTrabalho'), ROTA_D.indexOf('export default'));
    assert.ok(F.length > 0, 'a função que vira trabalho sumiu');
    const ondeTarefa = F.indexOf("sb('metodo_tarefas'");
    const ondeCard = F.indexOf("sb('metodo_quadro'");
    const ondePatch = F.indexOf("status: 'agendada'");
    assert.ok(ondeTarefa > 0 && ondeCard > 0 && ondePatch > 0);
    assert.ok(ondePatch > ondeTarefa, 'marcou agendada antes de criar a tarefa');
    assert.ok(ondePatch > ondeCard, 'marcou agendada antes de criar o cartão');
  });

  test('🔴 falhar ao criar o trabalho ABORTA — não marca agendada assim mesmo', () => {
    const F = ROTA_D.slice(ROTA_D.indexOf('async function virarTrabalho'), ROTA_D.indexOf('export default'));
    assert.match(F, /if \(!r\.ok\) throw new Error\('falha_ao_criar_tarefa'\)/);
    assert.match(F, /if \(!r\.ok\) throw new Error\('falha_ao_criar_card'\)/);
  });

  test('🔴 "ambos" liga o cartão à tarefa — e "quadro" não inventa dia', () => {
    const F = ROTA_D.slice(ROTA_D.indexOf('async function virarTrabalho'), ROTA_D.indexOf('export default'));
    assert.match(F, /\{ tarefaId, responsavelNome/, 'o cartão não recebe a tarefa criada');
    assert.match(F, /agendada_para: destino === 'quadro' \? null : dia/);
    assert.match(F, /destino !== 'quadro'/, 'sem isso, "quadro" criaria tarefa também');
    assert.match(F, /destino !== 'dia'/, 'sem isso, "jornada" criaria cartão também');
  });

  test('🔴 o dia da tarefa é o de BRASÍLIA, não o do servidor', () => {
    // DIR-129: em UTC, das 21h às 23h59 "hoje" já é amanhã — e a tarefa
    // nasceria num dia em que o dono não vai olhar.
    assert.match(ROTA_D, /timeZone: 'America\/Sao_Paulo'/);
    assert.doesNotMatch(ROTA_D, /new Date\(\)\.toISOString\(\)\.slice\(0, 10\)/, 'voltou a usar UTC como "hoje"');
  });

  test('🔴 demanda repetida COM destino vai pro destino — não vira segunda linha', () => {
    // "já está lá" sozinho seria um botão que não faz nada: a repetida é
    // justamente a que o dono quer no quadro agora.
    const H = ROTA_D.slice(ROTA_D.indexOf('const repetida'), ROTA_D.indexOf('const linha = demandaDoNo'));
    assert.match(H, /if \(destino === 'demandas'\) return res\.status\(200\)/, 'sem destino devia só avisar');
    assert.match(H, /virarTrabalho\(repetida, destino, dono\)/, 'a repetida não vai pro destino escolhido');
    assert.doesNotMatch(H, /sb\('xperf_demandas', \{/, 'gravou uma segunda linha para a repetida');
  });

  test('sem título devolve 400 em vez de gravar linha vazia', () => {
    assert.match(ROTA_D, /sem_titulo/);
    assert.match(ROTA_D, /status\(400\)/);
  });

  test('a falha ao buscar o nome não derruba a gravação', () => {
    // nome é enfeite na linha do Painel. Perder a anotação por causa dele
    // seria trocar um defeito de exibição por um de dado.
    const nomeDe = ROTA_D.slice(ROTA_D.indexOf('async function nomeDe'), ROTA_D.indexOf('export default'));
    assert.match(nomeDe, /catch\s*\{[\s\S]*return null;/);
  });
});
