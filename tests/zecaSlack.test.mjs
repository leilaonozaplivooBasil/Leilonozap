// 27/08/2026 — "O zeca esta sem comunicacao com o Slack."
//
// O que foi apurado antes de mexer em qualquer linha:
//
//  * Todo o Slack do sistema vive numa funcao so (postarNoSlack) e e chamado em tres
//    lugares, todos da Heloim: solicitacao registrada, aprovada, rejeitada. Nao existe
//    Slack no lado da Vercel (api/**) nem no front.
//  * O canal privado #top-tech-leilao-nozap nao recebe uma linha desde 18/08/2026. Tudo o
//    que esta la foi publicado pelo agente do Base44 antigo, que deixou de ser usado.
//  * O codigo novo (22/08) sabia postar, mas lia SLACK_WEBHOOK_URL — um secret que nunca
//    foi criado no Supabase.
//  * E o pior: sem o secret, postarNoSlack fazia `return` seco. Sem log, sem erro, sem
//    nada. Visto de fora era igual a "esta tudo certo e ninguem pediu nada".
//
// Este arquivo tranca as duas coisas que dependem de codigo: a falha passa a falar, e
// existe um jeito de conferir a ligacao sem abrir terminal (ferramenta checar_slack).
// Configurar o secret continua sendo passo humano — esta no DEPLOY.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fonte = readFileSync(new URL('../supabase/functions/whatsapp-router/index.ts', import.meta.url), 'utf8');
const deploy = readFileSync(new URL('../supabase/functions/whatsapp-router/DEPLOY.md', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// Extracao — mesma tecnica de tests/zecaGrupoAudio.test.mjs: le o index.ts de
// verdade, tira as anotacoes de tipo e RODA a funcao, em vez de copiar a regra.
// ---------------------------------------------------------------------------
function corpoDaFuncao(nome) {
  const i = fonte.indexOf(`async function ${nome}(`);
  assert.notEqual(i, -1, `sumiu do index.ts: ${nome}`);
  let chaves = 0, comecou = false, fim = -1;
  for (let j = fonte.indexOf('{', fonte.indexOf(')', i)); j < fonte.length; j++) {
    if (fonte[j] === '{') { chaves++; comecou = true; }
    else if (fonte[j] === '}') { chaves--; if (comecou && chaves === 0) { fim = j + 1; break; } }
  }
  assert.notEqual(fim, -1, `nao achei o fim de ${nome}`);

  // 29/08/2026 — antes daqui saiam tres `replace` presos a UMA assinatura exata
  // (`(texto: string)`). Quando o Bot Token entrou e a funcao virou
  // `(texto: string, canal: string = SLACK_CANAL_PADRAO)`, o tipo do parametro
  // sobrou e o `new Function` estourava com "Unexpected token ':'" — sete testes
  // vermelhos de uma vez. Agora a limpeza e feita SO no cabecalho e nao depende
  // dos nomes: tira o tipo de retorno e o tipo de cada parametro, quantos forem.
  const bruto = fonte.slice(i, fim);
  const abre = bruto.indexOf('{');
  const cabecalho = bruto.slice(0, abre)
    .replace(/\)\s*:\s*[^{]*$/, ')')                            // : Promise<X>
    .replace(/(\w+)\s*:\s*[\w<>\[\]|\s]+(?=\s*[,)=])/g, '$1');  // (a: T, b: T = X)
  const corpo = bruto.slice(abre).replace(/\(e as Error\)/g, 'e');
  return cabecalho + corpo;
}

// `cliente` = o que obterClienteSlack() devolve. null (o padrao) faz a funcao cair
// no webhook, que e o caminho que os testes de 27/08 protegem. Passando um objeto
// com postMessage, exercita o modo Bot Token que entrou em 28/08.
function montarPostarNoSlack(webhook, fetchFalso, cliente = null) {
  const avisos = [], erros = [], infos = [];
  const consoleFalso = {
    warn: (...a) => avisos.push(a.join(' ')),
    error: (...a) => erros.push(a.map(String).join(' ')),
    log: (...a) => infos.push(a.join(' ')),
  };
  const fn = new Function(
    'SLACK_WEBHOOK_URL', 'fetch', 'console', 'SLACK_CANAL_PADRAO', 'obterClienteSlack',
    `${corpoDaFuncao('postarNoSlack')}; return postarNoSlack;`,
  )(webhook, fetchFalso, consoleFalso, '#canal-padrao', () => cliente);
  return { fn, avisos, erros, infos };
}

// ---------------------------------------------------------------------------
// 1. Sem o secret, a falha precisa APARECER
// ---------------------------------------------------------------------------
test('sem SLACK_WEBHOOK_URL: avisa no log em vez de sair calado', async () => {
  const { fn, avisos } = montarPostarNoSlack('', async () => {
    throw new Error('nao devia nem tentar');
  });
  const r = await fn('qualquer coisa');
  assert.equal(r.ok, false);
  assert.equal(avisos.length, 1, 'a falha voltou a ser silenciosa');
  assert.match(avisos[0], /SLACK_WEBHOOK_URL/);
  assert.match(avisos[0], /DEPLOY\.md/, 'o aviso precisa dizer onde resolver');
});

test('sem SLACK_WEBHOOK_URL: nem tenta bater no Slack', async () => {
  let tentou = false;
  const { fn } = montarPostarNoSlack('', async () => { tentou = true; });
  await fn('oi');
  assert.equal(tentou, false);
});

test('sem nenhum modo configurado: devolve o motivo, nao undefined', async () => {
  const { fn } = montarPostarNoSlack('', async () => {});
  const r = await fn('oi');
  assert.equal(r.status, null);
  // O texto mudou em 28/08 (passaram a existir DOIS modos: Bot Token e webhook).
  // A exigencia nao mudou: quem receber este retorno tem que saber por que falhou.
  assert.ok(r.corpo && r.corpo.length > 0, 'o motivo nao pode vir vazio');
  assert.match(r.corpo, /token|webhook/i, 'o motivo precisa dizer O QUE falta');
});

// ---------------------------------------------------------------------------
// 2. Com o secret, o resultado tem que ser conferivel
// ---------------------------------------------------------------------------
test('webhook aceitou: devolve ok e registra no log', async () => {
  let corpoEnviado = null;
  const { fn, infos } = montarPostarNoSlack('https://hooks.slack.com/services/x', async (_url, opts) => {
    corpoEnviado = JSON.parse(opts.body);
    return { ok: true, status: 200, text: async () => 'ok' };
  });
  const r = await fn('mensagem de teste');
  assert.equal(r.ok, true);
  assert.equal(r.status, 200);
  assert.equal(corpoEnviado.text, 'mensagem de teste');
  assert.equal(infos.length, 1, 'sucesso tambem precisa deixar rastro no log');
});

test('webhook recusou: devolve o status e o corpo, e grita no log', async () => {
  const { fn, erros } = montarPostarNoSlack('https://hooks.slack.com/services/x', async () => ({
    ok: false, status: 404, text: async () => 'no_service',
  }));
  const r = await fn('teste');
  assert.equal(r.ok, false);
  assert.equal(r.status, 404);
  assert.equal(r.corpo, 'no_service');
  assert.equal(erros.length, 1);
  assert.match(erros[0], /404/);
});

test('internet caiu no meio: nao explode, devolve ok=false', async () => {
  const { fn, erros } = montarPostarNoSlack('https://hooks.slack.com/services/x', async () => {
    throw new Error('rede fora');
  });
  const r = await fn('teste');
  assert.equal(r.ok, false);
  assert.match(r.corpo, /rede fora/);
  assert.equal(erros.length, 1);
});

test('Slack quebrado NUNCA derruba a resposta do WhatsApp', async () => {
  const { fn } = montarPostarNoSlack('https://hooks.slack.com/services/x', async () => {
    throw new Error('boom');
  });
  await assert.doesNotReject(() => fn('teste'));
});

// ---------------------------------------------------------------------------
// 2b. O modo Bot Token (28/08/2026) — entrou sem nenhum teste. Estes quatro
//     trancam o que ele promete: prefere o token, respeita o canal pedido, nao
//     engole erro do Slack, e cai no webhook quando o token quebra.
// ---------------------------------------------------------------------------
test('com Bot Token: posta pelo cliente e NEM TOCA no webhook', async () => {
  let usouWebhook = false;
  const clienteFalso = { postMessage: async () => ({ ok: true }) };
  const { fn, infos } = montarPostarNoSlack(
    'https://hooks.slack.com/services/x',
    async () => { usouWebhook = true; },
    clienteFalso,
  );
  const r = await fn('mensagem');
  assert.equal(r.ok, true);
  assert.equal(usouWebhook, false, 'com token, o webhook nao entra na jogada');
  assert.match(r.corpo, /Bot Token/, 'o retorno precisa dizer por onde foi');
  assert.equal(infos.length, 1, 'sucesso tambem deixa rastro no log');
});

test('com Bot Token: usa o canal pedido, e o padrao quando nao pedem', async () => {
  const canais = [];
  const clienteFalso = { postMessage: async (canal) => { canais.push(canal); return { ok: true }; } };
  const { fn } = montarPostarNoSlack('', async () => {}, clienteFalso);
  await fn('a');
  await fn('b', '#pedidos');
  assert.deepEqual(canais, ['#canal-padrao', '#pedidos']);
});

test('Bot Token recusado pelo Slack: devolve o erro, nao finge que deu certo', async () => {
  const clienteFalso = { postMessage: async () => ({ ok: false, error: 'channel_not_found' }) };
  const { fn, erros } = montarPostarNoSlack('', async () => {}, clienteFalso);
  const r = await fn('teste');
  assert.equal(r.ok, false);
  assert.equal(r.corpo, 'channel_not_found');
  assert.equal(erros.length, 1, 'erro do Slack tem que aparecer no log');
});

test('Bot Token explodindo cai no webhook — o fallback tem que funcionar de verdade', async () => {
  let tentouWebhook = false;
  const clienteFalso = { postMessage: async () => { throw new Error('token revogado'); } };
  const { fn } = montarPostarNoSlack(
    'https://hooks.slack.com/services/x',
    async () => { tentouWebhook = true; return { ok: true, status: 200, text: async () => 'ok' }; },
    clienteFalso,
  );
  const r = await fn('teste');
  assert.equal(tentouWebhook, true, 'sem isto o fallback e so um comentario no codigo');
  assert.equal(r.ok, true);
});

// ---------------------------------------------------------------------------
// 3. A ferramenta de conferir a ligacao (checar_slack)
// ---------------------------------------------------------------------------
test('existe a ferramenta checar_slack na Heloim', () => {
  assert.match(fonte, /name: 'checar_slack'/);
});

test('checar_slack e so pra admin', () => {
  const i = fonte.indexOf("name: 'checar_slack'");
  const trecho = fonte.slice(i, i + 2000);
  assert.match(trecho, /ehAdmin\(ctx\.remetente\)/);
});

// O trecho da tool inteiro — ela cresceu em 01/09 e 2000 caracteres já cortavam
// o diagnóstico no meio.
const trechoChecar = () => {
  const i = fonte.indexOf("name: 'checar_slack'");
  const fim = fonte.indexOf("name: 'listar_solicitacoes_pendentes'", i);
  return fonte.slice(i, fim > i ? fim : i + 4000);
};

test('checar_slack diagnostica a falta ANTES de tentar postar', () => {
  const trecho = trechoChecar();
  const posFalta = trecho.indexOf("modo === 'nenhum'");
  const posPost = trecho.indexOf('await postarNoSlack(');
  assert.notEqual(posFalta, -1, 'checar_slack tem que decidir se ha algum modo configurado');
  assert.notEqual(posPost, -1, 'checar_slack tem que mandar uma mensagem de teste');
  assert.ok(posFalta < posPost, 'diagnosticar a falta vem antes de tentar postar');
});

test('checar_slack devolve o que o Slack respondeu, nao so "deu erro"', () => {
  const trecho = trechoChecar();
  assert.match(trecho, /status: r\.status/);
  assert.match(trecho, /resposta_do_slack/);
});

// 01/09/2026 — o bug que motivou a reescrita: a tool de DIAGNOSTICO olhava so o
// webhook. Com Bot Token configurado (o caminho recomendado no DEPLOY.md) e sem
// webhook, ela respondia "nada e publicado no canal" — falso — e mandava o dono
// caçar um webhook que nao precisa existir.
test('checar_slack enxerga os DOIS modos, nao so o webhook', () => {
  const trecho = trechoChecar();
  assert.match(trecho, /SLACK_BOT_TOKEN/, 'o modo Bot Token tem que contar como configurado');
  assert.match(trecho, /SLACK_WEBHOOK_URL/, 'o webhook segue valendo como fallback');
  assert.match(trecho, /modo/, 'a resposta precisa dizer QUAL modo esta ativo');
  assert.ok(
    !/if \(!SLACK_WEBHOOK_URL\) \{\s*\n\s*return \{\s*\n\s*ok: false/.test(trecho),
    'nao pode voltar a declarar Slack desligado so porque falta o webhook'
  );
});

test('o canal padrao dos registros existe de verdade no workspace', () => {
  // Era '#top-tech-digital', que nao existe — parece fusao de #top-tech-leilao-nozap
  // com #digital-leilao-nozap. No webhook passava batido (webhook ignora o canal);
  // no Bot Token todo registro automatico daria channel_not_found, em silencio.
  const linha = fonte.match(/const SLACK_CANAL_PADRAO = [^;]+;/)?.[0] || '';
  assert.ok(linha, 'nao achei SLACK_CANAL_PADRAO');
  assert.ok(!/top-tech-digital/.test(linha), 'esse canal nao existe no workspace');
  assert.match(linha, /C0BHCMYJJGJ/, 'o padrao e o ID do #top-tech-leilao-nozap');
  assert.match(linha, /Deno\.env\.get\('SLACK_CANAL_PADRAO'\)/, 'tem que dar pra trocar por secret');
});

// ---------------------------------------------------------------------------
// 4. Nada disso pode ter mudado de lugar sem querer
// ---------------------------------------------------------------------------
test('os registros de decisao da Heloim continuam indo pro Slack', () => {
  // 05/09/2026 — o REGISTRO da solicitacao saiu daqui de proposito. Antes, registrar e
  // publicar eram a mesma acao: ela interpretava o pedido e mandava pro canal sem passar
  // por ninguem. O dono pediu quatro passos, e a publicacao passou pra ferramenta
  // publicar_demanda, atras de duas confirmacoes do grupo. Aprovacao e rejeicao continuam
  // indo direto — sao DECISAO tomada, nao rascunho.
  const chamadas = fonte.match(/await postarNoSlack\(/g) || [];
  assert.ok(chamadas.length >= 3, `esperava aprovada + rejeitada + o teste, achei ${chamadas.length}`);
  assert.match(fonte, /aprovada\* por/);
  assert.match(fonte, /rejeitada\* por/);
  // e a garantia de que a publicacao nao voltou pro registro sem ninguem ver
  assert.ok(!/Nova solicitação #/.test(fonte),
    'registrar_solicitacao voltou a publicar direto no Slack, sem as duas confirmacoes');
  assert.match(fonte, /name: 'publicar_demanda'/, 'a publicacao precisa ter dono proprio');
  assert.match(fonte, /name: 'confirmar_demanda'/, 'falta a trava de "a demanda esta certa?"');
});

test('o DEPLOY.md ensina a ligar os DOIS modos do Slack', () => {
  // 28/08 o Slack passou a ter dois caminhos. O doc precisa ensinar os dois, porque
  // nenhum dos secrets existe no Supabase — ligar continua sendo passo humano.
  assert.match(deploy, /SLACK_BOT_TOKEN/, 'modo novo: postar em qualquer canal, editar, imagem');
  assert.match(deploy, /supabase secrets set SLACK_BOT_TOKEN/);
  assert.match(deploy, /files:write/, 'sem esse scope a imagem de capa nao sobe — e o pedido do dono');
  assert.match(deploy, /Incoming Webhooks/, 'modo legado continua valendo como fallback');
  assert.match(deploy, /supabase secrets set SLACK_WEBHOOK_URL/);
  assert.match(deploy, /invite @Heloim/, 'canal e privado — sem convidar o app, o canal nem aparece');
  assert.match(deploy, /checar_slack/, 'precisa dizer como conferir depois');
});

test('o DEPLOY.md nao traz nenhuma URL de webhook de verdade', () => {
  const reais = deploy.match(/hooks\.slack\.com\/services\/T[A-Z0-9]/g) || [];
  assert.equal(reais.length, 0, 'webhook e chave: nao pode estar escrito no repositorio');
});

// 01/09/2026 — a lista de scopes do DEPLOY.md trazia `conversations:history`,
// `conversations:info` e `conversations:list`. Nenhum dos tres existe no Slack:
// "conversations" e a familia de METODOS da API, os scopes sao por tipo de canal.
// Quem seguisse o doc ia procurar tres permissoes que nao aparecem na tela.
test('o DEPLOY.md so pede scopes que existem de verdade no Slack', () => {
  for (const inventado of ['conversations:history', 'conversations:info', 'conversations:list']) {
    assert.ok(!deploy.includes(`\`${inventado}\` —`), `${inventado} nao e um scope do Slack`);
  }
  assert.match(deploy, /`groups:read`/, 'sem esse scope o bot nao enxerga canal privado');
  assert.match(deploy, /`channels:read`/);
  assert.match(deploy, /`files:write`/);
});

// ---------------------------------------------------------------------------
// 5. O protocolo de demanda de 05/09/2026 (pedido do dono, com foto do formato)
// ---------------------------------------------------------------------------
// Ferramenta sem instrucao nao muda comportamento nenhum: sem estas linhas NO PROMPT ela
// chama publicar_demanda na primeira mensagem e o atropelo continua. As asseveracoes abaixo
// batem em frases que so existem dentro do template do prompt — nao em comentario meu.
test('o prompt do grupo manda seguir os quatro passos, na ordem', () => {
  assert.match(fonte, /COMO TRATAR UMA DEMANDA \(ordem obrigatória, sem pular passo\)/);
  for (const passo of ['1. RECEBE', '2. ORGANIZA', '3. CONFIRMA SE ESTÁ CERTA', '4. CONFIRMA SE PODE POSTAR']) {
    assert.ok(fonte.includes(passo), `faltou o passo "${passo}" no prompt`);
  }
  assert.match(fonte, /NUNCA publique no Slack sem os passos 3 e 4/);
});

test('o prompt separa confirmar a postagem de autorizar a execucao', () => {
  // O dono disse "todos confirmam". Isso vale pro POST — nao pra liberar a mudanca no
  // sistema, que continua sendo de admin. A propria foto do formato separa: o post sai
  // como "aguardando autorizacao".
  assert.match(fonte, /Qualquer pessoa do grupo pode confirmar/);
  assert.match(fonte, /AUTORIZAR A EXECUÇÃO da mudança continua sendo só/);
});

test('o prompt manda mostrar o rascunho inteiro, sem reescrever', () => {
  assert.match(fonte, /palavra por palavra/);
  assert.match(fonte, /Não resuma, não reescreva/);
});

test('a logo de capa e configuravel e esta documentada', () => {
  assert.match(fonte, /LOGO_TOPTECH_URL/, 'o secret da capa sumiu do codigo');
  assert.match(deploy, /LOGO_TOPTECH_URL/, 'o DEPLOY.md precisa ensinar a ligar a capa');
  assert.match(deploy, /sai sem capa/, 'o doc precisa dizer que sem o secret o post NAO falha');
});

test('em grupo, Zeca e Heloim viram um agente so', () => {
  // Pedido do dono: "independente do nome, ambos nos grupos respondem e obedecem como um".
  assert.match(fonte, /const tools = emGrupo \? \[\.\.\.TOOLS_HELOIM, \.\.\.TOOLS_ZECA\]/,
    'as ferramentas das duas precisam se somar no grupo');
});
