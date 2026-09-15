// 🔐 A Leila do nosso lado — e a trava que impede ela de entregar carteira alheia.
//
// CONTEXTO (15/09/2026): a conta do Base44 perdeu backend functions e a Leila
// parou inteira, porque era a única das quatro coisas que usam aquela ponte sem
// reserva. Ao trazê-la pra cá com as ferramentas do Zeca, apareceu uma
// diferença que não pode ser ignorada:
//
//   o Zeca sabe com quem fala pelo NÚMERO do WhatsApp, que a operadora garante;
//   a Leila receberia o `user_id` do localStorage, que qualquer um edita.
//
// Se a identidade viesse do corpo, "consultar_saldo" viraria um jeito de ler a
// carteira de outra pessoa sabendo só o id dela — e os ids circulam nas
// respostas normais da API (autor de mensagem no chat do leilão, vencedor,
// indicador). É exatamente o buraco que o crachá assinado foi criado pra fechar.
//
// Estes testes travam isso pelo INVARIANTE, não pela implementação: nenhuma
// ferramenta pessoal aceita id como parâmetro, e a rota lê a identidade de
// `conferirSessao`, nunca de `body.user_id`.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ferramentasDaLeila, personaDaLeila, AGENTE, MAX_RODADAS_TOOL,
} from '../api/_lib/leilaAtendente.js';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

// 🔍 Os testes de fiação olham o CÓDIGO, não o comentário. Sem isto, um
// cabeçalho que explica "por que NÃO usamos exigirSessao" reprovaria o teste
// que exige exatamente isso — e o caminho de menor resistência seria apagar a
// explicação, que é justamente o que não pode sumir.
const semComentarios = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
const nomes = (lista) => lista.map((f) => f.name).sort();

describe('quem alcança o quê', () => {
  test('visitante sem crachá só tem ferramenta pública', () => {
    assert.deepEqual(nomes(ferramentasDaLeila(false)), ['consultar_leiloes_ativos']);
  });

  test('pessoa identificada ganha as do Zeca', () => {
    assert.deepEqual(nomes(ferramentasDaLeila(true)), [
      'consultar_leiloes_ativos', 'consultar_pedidos', 'consultar_saldo', 'encaminhar_lead_vendedor',
    ]);
  });

  test('🔐 O INVARIANTE: nenhuma ferramenta aceita id de usuário como parâmetro', () => {
    // Se um dia alguém acrescentar `user_id` ao input_schema "pra facilitar",
    // a Claude passa a poder escolher de quem é o saldo que ela lê. A porta
    // volta a existir por dentro, sem ninguém mexer no crachá.
    for (const f of ferramentasDaLeila(true)) {
      const props = Object.keys(f.input_schema?.properties || {});
      const suspeitos = props.filter((p) => /user|usuario|id$|_id|telefone|phone|email|cpf/i.test(p));
      assert.deepEqual(suspeitos, [], `a ferramenta ${f.name} aceita ${suspeitos.join(', ')} — a identidade tem que vir do crachá`);
    }
  });

  test('toda ferramenta tem nome, descrição e schema — a Claude só usa o que entende', () => {
    for (const f of ferramentasDaLeila(true)) {
      assert.ok(f.name && typeof f.name === 'string', 'ferramenta sem nome');
      assert.ok((f.description || '').length > 40, `${f.name}: descrição curta demais pra Claude saber quando usar`);
      assert.equal(f.input_schema?.type, 'object', `${f.name}: schema fora do formato`);
      assert.equal(typeof f.executar, 'function', `${f.name}: sem executar`);
    }
  });

  test('as três pessoais existem só no modo identificado', () => {
    const publicas = nomes(ferramentasDaLeila(false));
    for (const pessoal of ['consultar_saldo', 'consultar_pedidos', 'encaminhar_lead_vendedor']) {
      assert.ok(!publicas.includes(pessoal), `${pessoal} vazou pro visitante`);
    }
  });
});

describe('a persona', () => {
  test('sem nome, proíbe explicitamente inventar um', () => {
    const p = personaDaLeila({ nome: null, identificado: true, temMemoria: false });
    assert.match(p, /NUNCA invente ou chute um nome/);
  });

  test('com nome, manda usar o nome e não revelar de onde veio', () => {
    const p = personaDaLeila({ nome: 'Marcos', identificado: true, temMemoria: false });
    assert.match(p, /Marcos/);
    assert.match(p, /[Nn]unca diga que recebeu o nome automaticamente/);
  });

  test('visitante é avisado de que não há saldo nem pedido — em vez de a Leila tentar e falhar', () => {
    const p = personaDaLeila({ nome: null, identificado: false, temMemoria: false });
    assert.match(p, /NÃO está logada/);
    const q = personaDaLeila({ nome: 'Ana', identificado: true, temMemoria: false });
    assert.ok(!/NÃO está logada/.test(q), 'avisou de login para quem já está logado');
  });

  test('com memória, proíbe cumprimentar de novo', () => {
    const p = personaDaLeila({ nome: null, identificado: true, temMemoria: true });
    assert.match(p, /CONTINUAÇÃO/);
    const q = personaDaLeila({ nome: null, identificado: true, temMemoria: false });
    assert.match(q, /primeira mensagem desta conversa/);
  });

  test('a regra do lance continua escrita, e continua a certa', () => {
    // Já saiu errado em produção ("paga depois de arrematar"). O dinheiro é
    // reservado NO LANCE — se este texto sumir, a Leila inventa de novo.
    const p = personaDaLeila({ nome: null, identificado: true, temMemoria: false });
    assert.match(p, /pagamento é ANTES do lance/);
    assert.match(p, /NUNCA diga que "paga depois de arrematar"/);
  });

  test('a proibição de falar de rede/comissão continua de pé', () => {
    const p = personaDaLeila({ nome: null, identificado: true, temMemoria: false });
    assert.match(p, /PROIBIÇÃO ABSOLUTA/);
    assert.match(p, /plano de carreira/);
  });

  test('só manda link do próprio site', () => {
    const p = personaDaLeila({ nome: null, identificado: true, temMemoria: false });
    assert.match(p, /NUNCA mande pra WhatsApp, Instagram/);
    const links = p.match(/https?:\/\/[^\s]+/g) || [];
    assert.ok(links.length > 0, 'a persona ficou sem link nenhum');
    for (const l of links) assert.match(l, /^https:\/\/leilaonozap\.net\//, `link de fora na persona: ${l}`);
  });
});

describe('a rota', () => {
  const rota = semComentarios(ler('../api/functions/leilaChat.js'));

  test('🔐 a identidade sai do crachá conferido', () => {
    assert.match(rota, /conferirSessao\(req\)/);
    assert.match(rota, /const userId = cracha\.ok \? cracha\.userId : null/);
  });

  test('🔐 e NUNCA do corpo da requisição', () => {
    // body.user_id pode ser LIDO (pra registrar no log quem tentou), mas não
    // pode virar a identidade. Se aparecer numa atribuição de userId, furou.
    assert.ok(!/userId\s*=\s*(String\()?body/.test(rota),
      'o user_id do corpo voltou a virar identidade');
    assert.match(rota, /responderComoLeila\(\{ mensagem: message, userId \}\)/);
  });

  test('usa conferirSessao, não exigirSessao (que está em etapa 1 e não recusa)', () => {
    assert.ok(!/exigirSessao/.test(rota),
      'exigirSessao só ANOTA no log enquanto SESSAO_MODO não for bloquear — aqui precisa recusar de verdade');
  });

  test('não há mais nenhuma ponte pro Base44 nesta rota', () => {
    assert.ok(!/base44|chamarRuntimeBase44/i.test(rota), 'a dependência do Base44 voltou');
  });

  test('a resposta ainda passa pela trava do texto cru', () => {
    assert.match(rota, /respostaDaLeila\(/);
  });

  test('devolve conversation_id — é o que mantém o histórico na tela', () => {
    // LeilaChat.jsx só grava a conversa no localStorage quando este campo
    // volta. Sem ele, trocar de página apaga o histórico visual.
    assert.match(rota, /conversation_id: conversationId/);
  });
});

describe('os limites', () => {
  test('o laço de ferramenta tem teto, igual ao do Zeca', () => {
    assert.equal(MAX_RODADAS_TOOL, 4);
  });

  test('a memória é gravada com agente próprio, sem se misturar com Zeca/Heloim', () => {
    assert.equal(AGENTE, 'leila');
  });

  test('o módulo converte numeric antes de mostrar — PostgREST manda dinheiro como TEXTO', () => {
    const src = semComentarios(ler('../api/_lib/leilaAtendente.js'));
    assert.match(src, /const num = \(v\) => \(Number\(v\) \|\| 0\)/);
    assert.match(src, /num\(v\)\.toFixed\(2\)/);
    // e nenhuma ferramenta devolve o valor cru do banco
    assert.ok(!/saldo_disponivel: u\.saldo_disponivel/.test(src), 'saldo cru indo pra Claude');
  });
});
