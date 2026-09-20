/**
 * 📣 O VIGIA PRECISA CHEGAR EM ALGUÉM — e não em qualquer um.
 *
 * 🔴 O CASO REAL (20/09/2026)
 *
 * `alertaReservasOrfas` roda todo dia às 9h30 e detecta certo. O Alberto ficou
 * com R$ 573,22 travados de 17 a 20/09 e este vigia escreveu o nome e o valor
 * dele em `system_logs` TRÊS DIAS SEGUIDOS. Ninguém leu. Quem descobriu foi o
 * cliente, reclamando — e antes dele houve pelo menos outros quatro, com pico
 * de R$ 1.268,41 em cinco contas no dia 11/09.
 *
 * O dinheiro travado sempre foi detectável. Faltava ENDEREÇO.
 *
 * 🔒 E O ENDEREÇO É A PARTE PERIGOSA
 * A mensagem carrega NOME DE CLIENTE e VALOR. Um dígito errado em
 * ALERTA_WHATSAPP manda isso pra um desconhecido. Por isso o padrão é NÃO
 * ENVIAR: sem destino válido, o helper cala a boca em vez de tentar.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  destinosDoAlerta, apenasDigitos, podeAvisar, avisarAdmin, avisarAdminUmaVezPorDia,
} from '../api/_lib/avisarAdmin.js';

describe('para quem o alerta vai', () => {
  test('aceita número brasileiro com DDI, com ou sem máscara', () => {
    assert.deepEqual(destinosDoAlerta('5521960142766'), ['5521960142766']);
    assert.deepEqual(destinosDoAlerta('+55 (21) 96014-2766'), ['5521960142766']);
  });

  test('aceita vários, separados por vírgula', () => {
    assert.deepEqual(
      destinosDoAlerta('5521960142766, 5521982795387'),
      ['5521960142766', '5521982795387'],
    );
  });

  test('🔴 número curto demais é DESCARTADO, não corrigido', () => {
    // Um dígito perdido na variável de ambiente mandaria nome de cliente e
    // valor pra um desconhecido. Na dúvida, não envia.
    for (const ruim of ['21960142766', '996014276', '123', '0']) {
      assert.deepEqual(destinosDoAlerta(ruim), [], `aceitou ${ruim}`);
    }
  });

  test('🔴 número comprido demais também é descartado', () => {
    assert.deepEqual(destinosDoAlerta('5521960142766999'), []);
  });

  test('vazio, nulo e lixo não viram destino', () => {
    for (const nada of ['', null, undefined, '   ', ',,,', 'abc']) {
      assert.deepEqual(destinosDoAlerta(nada), [], `aceitou ${JSON.stringify(nada)}`);
    }
  });

  test('o bom passa junto com o ruim, e só o bom sobrevive', () => {
    assert.deepEqual(destinosDoAlerta('123, 5521960142766, abc'), ['5521960142766']);
  });

  test('apenasDigitos tira tudo que não é número', () => {
    assert.equal(apenasDigitos('+55 (21) 9 6014-2766'), '5521960142766');
    assert.equal(apenasDigitos(null), '');
  });
});

describe('quando o helper se considera pronto', () => {
  const ok = {
    ZAPI_INSTANCE_ID: 'inst', ZAPI_TOKEN: 'tok', ALERTA_WHATSAPP: '5521960142766',
  };

  test('com credencial e destino, está pronto', () => {
    assert.equal(podeAvisar(ok), true);
  });

  test('🔴 sem destino NÃO está pronto — mesmo com a credencial toda', () => {
    assert.equal(podeAvisar({ ...ok, ALERTA_WHATSAPP: '' }), false);
    assert.equal(podeAvisar({ ...ok, ALERTA_WHATSAPP: undefined }), false);
  });

  test('sem credencial da Z-API não está pronto', () => {
    assert.equal(podeAvisar({ ...ok, ZAPI_TOKEN: undefined }), false);
    assert.equal(podeAvisar({ ...ok, ZAPI_INSTANCE_ID: undefined }), false);
  });

  test('🔴 destino inválido conta como SEM destino', () => {
    // Não basta a variável existir: ela precisa conter número utilizável.
    assert.equal(podeAvisar({ ...ok, ALERTA_WHATSAPP: '999' }), false);
  });
});

describe('o vigia continua vigiando mesmo se o WhatsApp falhar', () => {
  test('🔴 avisarAdmin NUNCA lança — nem sem configuração, nem com texto vazio', async () => {
    // Um vigia que quebra porque o WhatsApp caiu é pior que um vigia mudo: a
    // checagem de dinheiro travado para de rodar junto.
    for (const entrada of ['', null, undefined, 'mensagem qualquer']) {
      const r = await avisarAdmin(entrada);
      assert.equal(typeof r.enviado, 'boolean', `não devolveu veredito para ${JSON.stringify(entrada)}`);
      assert.equal(r.enviado, false, 'enviou sem ALERTA_WHATSAPP configurado no ambiente de teste');
      assert.ok(r.motivo, 'não disse por que não enviou');
    }
  });
});

describe('o vigia de reservas órfãs realmente chama o mensageiro', () => {
  const fonte = readFileSync(
    new URL('../api/functions/alertaReservasOrfas.js', import.meta.url), 'utf8',
  );
  // Comentários citam o helper ao explicar a história — ler o comentário como
  // prova já enganou uma banca aqui antes (PR #409). Só código conta.
  const codigo = fonte.split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

  test('🔴 importa e CHAMA o avisarAdmin', () => {
    assert.match(codigo, /import \{ avisarAdmin \}/, 'parou de importar o mensageiro');
    assert.match(codigo, /await avisarAdmin\(/, 'importa mas não chama — o vigia voltou a ser mudo');
  });

  test('🔴 o aviso só sai quando há conta órfã', () => {
    // Vigia que fala todo dia vira ruído e ninguém lê — foi assim que o log
    // deixou de ser lido. A chamada tem que estar DENTRO do if de achados.
    // `lastIndexOf(texto, deOndeVoltar)` tem DOIS argumentos. A primeira versão
    // deste teste passou três e reprovou código que estava certo — a guarda
    // existia. Prova que acusa errado custa mais caro que prova que falta.
    const i = codigo.indexOf('await avisarAdmin(');
    assert.ok(i > 0, 'não achei a chamada do mensageiro');
    const guarda = codigo.lastIndexOf('if (achados.length', i);
    assert.ok(guarda !== -1 && guarda < i, 'o aviso saiu de dentro da guarda de "tem órfão"');
  });

  test('a mensagem leva o VALOR e a quantidade de contas', () => {
    const trecho = codigo.slice(codigo.indexOf('await avisarAdmin('), codigo.indexOf('await avisarAdmin(') + 700);
    assert.match(trecho, /total\.toFixed\(2\)/, 'não manda o valor travado');
    assert.match(trecho, /achados\.length/, 'não manda quantas contas');
    assert.match(trecho, /faxinaReservasOrfas/, 'não diz o que fazer para devolver');
  });

  test('🔴 a resposta do vigia conta se o aviso saiu ou não', () => {
    // Sem isto, "rodou e não avisou" fica indistinguível de "rodou e avisou".
    assert.match(codigo, /aviso_whatsapp/, 'a resposta não reporta o envio');
  });
});

describe('🔒 a trava que impede vazar nome de cliente', () => {
  const CREDENCIAL = { ZAPI_INSTANCE_ID: 'inst', ZAPI_TOKEN: 'tok' };

  // Espião: guarda toda chamada e responde OK, sem tocar na rede.
  const espiao = () => {
    const chamadas = [];
    const enviar = async (url, opcoes) => {
      chamadas.push({ url, corpo: JSON.parse(opcoes.body), headers: opcoes.headers });
      return { ok: true, status: 200 };
    };
    return { chamadas, enviar };
  };

  test('🔴 COM credencial e SEM destino, não manda NADA', async () => {
    // Esta é a prova que faltava. A primeira versão da banca não pegava a
    // mutação que chumbava um número quando ALERTA_WHATSAPP estava vazio:
    // faltava credencial no teste, a função saía antes, e este ramo — o que
    // protege o nome do cliente — nunca rodava. Passou verde com o vazamento.
    const { chamadas, enviar } = espiao();
    const r = await avisarAdmin('Fulano: R$ 573,22 travados', {
      env: { ...CREDENCIAL, ALERTA_WHATSAPP: '' }, enviar,
    });
    assert.equal(r.enviado, false);
    assert.equal(r.motivo, 'sem_ALERTA_WHATSAPP');
    assert.equal(chamadas.length, 0, `mandou para ${chamadas.map((c) => c.corpo.phone).join(', ')}`);
  });

  test('🔴 destino inválido também não vira envio', async () => {
    const { chamadas, enviar } = espiao();
    const r = await avisarAdmin('Fulano: R$ 573,22', {
      env: { ...CREDENCIAL, ALERTA_WHATSAPP: '999' }, enviar,
    });
    assert.equal(r.enviado, false);
    assert.equal(chamadas.length, 0, 'mandou para um número inválido');
  });

  test('com destino válido, manda — e manda para o número certo', async () => {
    // O contraponto: se NADA fosse enviado nunca, as provas acima passariam
    // com um helper quebrado que não serve pra nada.
    const { chamadas, enviar } = espiao();
    const r = await avisarAdmin('R$ 573,22 travados', {
      env: { ...CREDENCIAL, ALERTA_WHATSAPP: '5521960142766', ZAPI_CLIENT_TOKEN: 'ct' }, enviar,
    });
    assert.equal(r.enviado, true);
    assert.equal(r.destinos, 1);
    assert.equal(chamadas.length, 1);
    assert.equal(chamadas[0].corpo.phone, '5521960142766');
    assert.match(chamadas[0].corpo.message, /573,22/);
    assert.match(chamadas[0].url, /\/instances\/inst\/token\/tok\/send-text$/);
    assert.equal(chamadas[0].headers['Client-Token'], 'ct', 'não mandou o Client-Token');
  });

  test('vários destinos recebem, um a um', async () => {
    const { chamadas, enviar } = espiao();
    const r = await avisarAdmin('aviso', {
      env: { ...CREDENCIAL, ALERTA_WHATSAPP: '5521960142766,5521982795387' }, enviar,
    });
    assert.equal(r.destinos, 2);
    assert.deepEqual(chamadas.map((c) => c.corpo.phone), ['5521960142766', '5521982795387']);
  });

  test('🔴 número que falha não impede os outros de receber', async () => {
    let n = 0;
    const chamadas = [];
    const enviar = async (url, opcoes) => {
      chamadas.push(JSON.parse(opcoes.body).phone);
      n += 1;
      if (n === 1) throw new Error('rede caiu');
      return { ok: true, status: 200 };
    };
    const r = await avisarAdmin('aviso', {
      env: { ...CREDENCIAL, ALERTA_WHATSAPP: '5521960142766,5521982795387' }, enviar,
    });
    assert.equal(chamadas.length, 2, 'desistiu no primeiro erro');
    assert.equal(r.enviado, true, 'um erro derrubou o envio inteiro');
    assert.equal(r.destinos, 1);
  });

  test('🔴 se TODOS falharem, diz que não enviou — e não lança', async () => {
    const enviar = async () => { throw new Error('z-api fora do ar'); };
    const r = await avisarAdmin('aviso', {
      env: { ...CREDENCIAL, ALERTA_WHATSAPP: '5521960142766' }, enviar,
    });
    assert.equal(r.enviado, false);
    assert.ok(r.motivo, 'não disse o motivo');
  });
});

describe('⏱ a trava que impede o vigia de virar enxame', () => {
  const CREDENCIAL = { ZAPI_INSTANCE_ID: 'inst', ZAPI_TOKEN: 'tok', ALERTA_WHATSAPP: '5521960142766' };

  // Banco de mentira: `jaAvisou` decide o que a consulta devolve, e `escritas`
  // guarda o que foi gravado.
  const bancoFalso = (jaAvisou = false) => {
    const escritas = [];
    const consultas = [];
    const sb = async (caminho, opcoes) => {
      if (opcoes?.method === 'POST') { escritas.push({ caminho, corpo: JSON.parse(opcoes.body) }); return { ok: true }; }
      consultas.push(caminho);
      return { json: async () => (jaAvisou ? [{ id: 'ja-avisei' }] : []) };
    };
    return { sb, escritas, consultas };
  };

  const espiao = () => {
    const chamadas = [];
    return { chamadas, enviar: async (u, o) => { chamadas.push(JSON.parse(o.body)); return { ok: true, status: 200 }; } };
  };

  test('primeira vez no dia: manda', async () => {
    const { sb, escritas } = bancoFalso(false);
    const { chamadas, enviar } = espiao();
    const r = await avisarAdminUmaVezPorDia('credito_gateway', 'saldo baixo', { sb, enviar, env: CREDENCIAL });
    assert.equal(r.enviado, true);
    assert.equal(chamadas.length, 1);
    assert.equal(escritas.length, 1, 'não deixou a marca de "já avisei"');
    assert.match(escritas[0].corpo.step, /AVISO_ZAP_CREDITO_GATEWAY/);
  });

  test('🔴 segunda vez no mesmo dia: NÃO manda', async () => {
    // Roda a cada 4h. Sem isto, seriam 6 mensagens por dia sobre o mesmo saldo
    // — e a pessoa silencia o contato, que é a morte do alarme.
    const { sb } = bancoFalso(true);
    const { chamadas, enviar } = espiao();
    const r = await avisarAdminUmaVezPorDia('credito_gateway', 'saldo baixo', { sb, enviar, env: CREDENCIAL });
    assert.equal(r.enviado, false);
    assert.equal(r.motivo, 'ja_avisei_hoje');
    assert.equal(chamadas.length, 0, 'mandou de novo no mesmo dia');
  });

  test('🔴 se o envio FALHA, não marca — senão o próximo fica preso 20h', async () => {
    const { sb, escritas } = bancoFalso(false);
    const enviar = async () => { throw new Error('z-api fora'); };
    const r = await avisarAdminUmaVezPorDia('credito_gateway', 'saldo baixo', { sb, enviar, env: CREDENCIAL });
    assert.equal(r.enviado, false);
    assert.equal(escritas.length, 0, 'marcou como avisado um aviso que nunca chegou');
  });

  test('assuntos diferentes não se calam entre si', async () => {
    // A trava é POR ASSUNTO: crédito baixo não pode silenciar dinheiro travado.
    const { sb, escritas } = bancoFalso(false);
    const { chamadas, enviar } = espiao();
    await avisarAdminUmaVezPorDia('credito_gateway', 'a', { sb, enviar, env: CREDENCIAL });
    await avisarAdminUmaVezPorDia('reservas_orfas', 'b', { sb, enviar, env: CREDENCIAL });
    assert.equal(chamadas.length, 2);
    assert.notEqual(escritas[0].corpo.step, escritas[1].corpo.step, 'os dois assuntos usam a MESMA chave');
  });

  test('sem banco, avisa mesmo assim', async () => {
    // Melhor uma mensagem repetida que um alarme perdido por o banco ter caído.
    const { chamadas, enviar } = espiao();
    const r = await avisarAdminUmaVezPorDia('credito_gateway', 'saldo baixo', { enviar, env: CREDENCIAL });
    assert.equal(r.enviado, true);
    assert.equal(chamadas.length, 1);
  });

  test('🔴 a trava não fura a proteção de destino', async () => {
    const { sb } = bancoFalso(false);
    const { chamadas, enviar } = espiao();
    const r = await avisarAdminUmaVezPorDia('credito_gateway', 'saldo baixo', {
      sb, enviar, env: { ...CREDENCIAL, ALERTA_WHATSAPP: '' },
    });
    assert.equal(r.enviado, false);
    assert.equal(chamadas.length, 0, 'a versão com trava passou por cima da proteção de destino');
  });
});

describe('o vigia do crédito realmente chama o mensageiro', () => {
  const codigo = readFileSync(new URL('../api/functions/alertaCreditoGateway.js', import.meta.url), 'utf8')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');

  test('🔴 importa e CHAMA — com a versão que tem trava', () => {
    assert.match(codigo, /import \{ avisarAdminUmaVezPorDia \}/);
    assert.match(codigo, /await avisarAdminUmaVezPorDia\(/, 'importa mas não chama');
    assert.doesNotMatch(codigo, /await avisarAdmin\(/, 'usou a versão SEM trava num vigia que roda a cada 4h');
  });

  test('🔴 só avisa quando o saldo está baixo', () => {
    const i = codigo.indexOf('await avisarAdminUmaVezPorDia(');
    assert.ok(i > 0);
    const guarda = codigo.lastIndexOf('if (baixo', i);
    assert.ok(guarda !== -1 && guarda < i, 'o aviso saiu de dentro da guarda de saldo baixo');
  });

  test('a mensagem leva o saldo e o teto', () => {
    const t = codigo.slice(codigo.indexOf('await avisarAdminUmaVezPorDia('), codigo.indexOf('await avisarAdminUmaVezPorDia(') + 700);
    assert.match(t, /saldo\.toFixed\(2\)/, 'não manda o saldo');
    assert.match(t, /SALDO_BAIXO_USD/, 'não manda o teto');
  });
});
