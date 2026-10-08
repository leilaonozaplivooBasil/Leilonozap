// Pop-up do leilão em destaque — a REGRA de quando aparece.
//
// Pedido do dono (02/09/2026): "ao abrir o site deve conter um popup de um
// leilão em destaque que escolhermos. Esse popup deve ser extremamente
// funcional para evitar bugs/quebras/colisões no código."
//
// O risco desse tipo de peça não é o desenho, é a HORA. Aparecer por cima de
// quem está dando lance, por cima de quem está pagando, ou apontando para um
// leilão que já acabou. Por isso a regra inteira vive num .js puro, testada
// aqui sem navegador, e o componente só desenha o que ela decidir.
//
// O princípio: O PADRÃO É NÃO APARECER. Toda dúvida resolve em false.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  podeMostrar, configValida, leilaoAindaAberto, idDoLeilao, dadosDoPopup,
  lerAtividade, registrarAtividade, acessoJaAtendido, JANELA_DE_ACESSO_MS, fotoDoLeilao, PAGINAS_PROIBIDAS, Z_INDEX, CHAVE_SESSAO,
  contagemRegressiva,
} from '../src/lib/popupLeilaoDestaque.js';

const AGORA = new Date('2026-09-02T18:00:00Z').getTime();
const CONFIG = { is_active: true, title: 'Air Fryer 5L', image_url: 'https://x/y.jpg', link_url: '/AuctionRoom?id=leilao-1' };
const ABERTO = { id: 'leilao-1', status: 'active', end_time: '2026-09-02T20:00:00Z', title: 'Air Fryer' };

// storage de mentira, porque o Node não tem sessionStorage
const criarStorage = (inicial = {}) => {
  const m = { ...inicial };
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _dados: m };
};
const base = (over = {}) => ({
  config: CONFIG, leilao: ABERTO, paginaAtual: 'Home',
  acessoAtendido: false, agora: AGORA, ...over,
});

// ───────────────────── o caminho feliz ─────────────────────

test('aparece na primeira página da sessão', () => {
  const r = podeMostrar(base());
  assert.equal(r.mostrar, true, `não apareceu: ${r.motivo}`);
});

// ───────────────────── onde NÃO pode aparecer ─────────────────────

test('NUNCA por cima de quem está dando lance', () => {
  // Cronômetro correndo e saldo reservado no lance. Cobrir isso com propaganda
  // de outro leilão custa o lance e irrita quem já está comprando.
  const r = podeMostrar(base({ paginaAtual: 'AuctionRoom' }));
  assert.equal(r.mostrar, false);
  assert.equal(r.motivo, 'pagina_proibida');
});

test('NUNCA por cima de quem está pagando', () => {
  for (const p of ['Cart', 'CatalogCheckout', 'Checkout', 'Payment', 'PagamentoPix']) {
    assert.equal(podeMostrar(base({ paginaAtual: p })).mostrar, false, `apareceu em ${p}`);
  }
});

test('a lista de páginas proibidas não perdeu a sala nem o checkout', () => {
  assert.ok(PAGINAS_PROIBIDAS.includes('AuctionRoom'));
  assert.ok(PAGINAS_PROIBIDAS.includes('CatalogCheckout'));
});

test('aparece nas páginas normais de cliente', () => {
  for (const p of ['Home', 'Catalog', 'Loja-Virtual', 'AuctionDetails', 'Profile', '']) {
    assert.equal(podeMostrar(base({ paginaAtual: p })).mostrar, true, `não apareceu em "${p}"`);
  }
});

// ───────────────────── leilão encerrado ─────────────────────

test('leilão que já acabou NÃO é anunciado', () => {
  // 🔴 Este erro já aconteceu neste site: em 31/08 um produto arrematado
  // continuou na página do leilão. O pop-up vence sozinho.
  const vencido = { ...ABERTO, end_time: '2026-09-02T17:59:00Z' };
  assert.equal(podeMostrar(base({ leilao: vencido })).motivo, 'leilao_encerrado');
});

test('leilão vendido ou cancelado NÃO é anunciado', () => {
  for (const s of ['sold', 'ended', 'canceled']) {
    assert.equal(leilaoAindaAberto({ ...ABERTO, status: s }, AGORA), false, `passou com status ${s}`);
  }
});

test('leilão de teste não vira propaganda', () => {
  assert.equal(leilaoAindaAberto({ ...ABERTO, is_test_auction: true }, AGORA), false);
});

test('prazo ilegível ou ausente = não aparece', () => {
  assert.equal(leilaoAindaAberto({ ...ABERTO, end_time: null }, AGORA), false);
  assert.equal(leilaoAindaAberto({ ...ABERTO, end_time: 'qualquer coisa' }, AGORA), false);
  assert.equal(leilaoAindaAberto(null, AGORA), false);
  assert.equal(leilaoAindaAberto(undefined, AGORA), false);
});

// ───────────────────── colisão com o banner de LGPD ─────────────────────

test('espera o banner de consentimento sair da tela', () => {
  // O banner de LGPD (z-3000) abre sozinho em TODA primeira visita — mesmo
  // público do pop-up. Os dois juntos é o único conflito real que existe aqui.
  const r = podeMostrar(base({ consentimentoPendente: true }));
  assert.equal(r.mostrar, false);
  assert.equal(r.motivo, 'consentimento_pendente');
});

test('a camada fica abaixo do consentimento e do pagamento', () => {
  assert.ok(Z_INDEX < 2990, 'subiu acima do véu do consentimento');
  assert.ok(Z_INDEX < 9999, 'subiu acima da confirmação de pagamento');
  assert.ok(Z_INDEX > 201, 'ficaria atrás do carrinho');
});

// ──────────── UMA VEZ POR ACESSO (ordem do dono, 08/10/2026) ────────────
//
// 20/09 o dono pediu "toda vez que entrar em uma página, estoura o pop-up". Em
// 08/10 mandou acabar: o cliente trocava de página e levava o pop-up de novo e de
// novo. "Só quando o usuário ENTRA, novo ou antigo; depois que fechar, não aparece
// mais." Estes testes são a diferença entre as duas regras — o de "trocar de
// página não traz de volta" é o que falharia se alguém restaurasse o pedido antigo.

test('acesso novo: aparece', () => {
  assert.equal(podeMostrar(base({ acessoAtendido: false })).mostrar, true);
});

test('🔴 já apareceu neste acesso: trocar de página NÃO traz de volta', () => {
  for (const pagina of ['Home', 'Loja-Virtual', 'leiloes', 'Carteira']) {
    const v = podeMostrar(base({ paginaAtual: pagina, acessoAtendido: true }));
    assert.equal(v.mostrar, false, `voltou na página ${pagina} — o cliente é estressado a cada troca`);
    assert.equal(v.motivo, 'ja_viu_neste_acesso');
  }
});

test('o acesso é atendido enquanto há atividade e VENCE depois de 30 minutos parado', () => {
  const t0 = 1_000_000;
  assert.equal(JANELA_DE_ACESSO_MS, 30 * 60 * 1000);
  assert.equal(acessoJaAtendido({ ultimaAtividade: 0, agora: t0 }), false, 'sem registro é acesso novo');
  assert.equal(acessoJaAtendido({ ultimaAtividade: t0, agora: t0 + 1000 }), true);
  assert.equal(acessoJaAtendido({ ultimaAtividade: t0, agora: t0 + JANELA_DE_ACESSO_MS - 1 }), true, 'no último segundo da janela ainda é o mesmo acesso');
  assert.equal(acessoJaAtendido({ ultimaAtividade: t0, agora: t0 + JANELA_DE_ACESSO_MS }), false, 'passou a janela: acesso novo');
  assert.equal(acessoJaAtendido(), false);
});

test('a marca guarda a HORA da atividade, e o valor antigo (nome de página) vira "sem registro"', () => {
  const ss = criarStorage();
  assert.equal(lerAtividade(ss), 0);
  registrarAtividade(ss, 1234567);
  assert.equal(lerAtividade(ss), 1234567);
  assert.equal(ss._dados[CHAVE_SESSAO], '1234567');
  // quem ainda tem o valor da regra antiga ('Home') não trava: é lido como acesso novo
  assert.equal(lerAtividade(criarStorage({ [CHAVE_SESSAO]: 'Home' })), 0);
  assert.equal(lerAtividade(criarStorage({ [CHAVE_SESSAO]: '-5' })), 0);
});

test('storage bloqueado (aba anônima) não derruba a página', () => {
  const travado = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };
  assert.equal(lerAtividade(travado), 0);
  assert.doesNotThrow(() => registrarAtividade(travado, 1));
  assert.doesNotThrow(() => registrarAtividade(null, 1));
  assert.equal(lerAtividade(null), 0);
});

test('o componente marca o acesso quando decide e NÃO guarda mais "página onde fechou"', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/components/common/PopupLeilaoDestaque.jsx', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.match(src, /acessoJaAtendido\(/, 'o componente consulta a regra do acesso');
  assert.match(src, /tocar\(\)/, 'o componente anda a hora da atividade');
  assert.match(src, /visibilitychange/, 'ao voltar de segundo plano o acesso pode vencer');
  assert.ok(!/paginaJaVista|paginaOndeFechou|marcarVisto|ondeFoiFechado/.test(src), 'sobrou a regra por página');
});

test('🔴 as páginas de dinheiro continuam proibidas, mesmo com a frequência maior', () => {
  // Subir a frequência NÃO pode cobrir quem está dando lance ou pagando.
  for (const pag of ['AuctionRoom', 'Cart', 'Checkout', 'CatalogCheckout', 'Payment', 'PagamentoPix']) {
    assert.equal(
      podeMostrar(base({ paginaAtual: pag, acessoAtendido: false })).motivo,
      'pagina_proibida',
      `${pag} deixou o pop-up passar`,
    );
  }
});

// ───────────────────── configuração ─────────────────────

test('sem configuração, nada aparece', () => {
  for (const c of [null, undefined, {}, { is_active: true }, { link_url: '   ' }]) {
    assert.equal(podeMostrar(base({ config: c })).motivo, 'sem_config', `passou com ${JSON.stringify(c)}`);
  }
});

test('desligado no painel = desligado na tela', () => {
  assert.equal(configValida({ ...CONFIG, is_active: false }), false);
});

test('lê o id do leilão do link, e aguenta link torto', () => {
  assert.equal(idDoLeilao('/AuctionRoom?id=abc123'), 'abc123');
  assert.equal(idDoLeilao('/AuctionRoom?foo=1&id=abc&x=2'), 'abc');
  assert.equal(idDoLeilao('/AuctionRoom'), '');
  assert.equal(idDoLeilao(null), '');
  assert.equal(idDoLeilao(''), '');
});

test('o que a tela desenha nunca é inventado', () => {
  const d = dadosDoPopup(CONFIG, ABERTO);
  // 08/10/2026 — o título é o do LEILÃO escolhido, não a cópia guardada na configuração
  assert.equal(d.titulo, 'Air Fryer');
  assert.equal(d.destino, '/AuctionRoom?id=leilao-1');
  // leilão sem foto: null (não string vazia) — e NUNCA a imagem guardada na configuração
  assert.equal(d.imagem, null);
  // sem nada: um rótulo neutro, nunca "undefined" na tela
  assert.equal(dadosDoPopup(null, null).titulo, 'Leilão em destaque');
});

test('🔴 o leilão escolhido é a ÚNICA fonte: título e foto de outro leilão não vazam (caso Hoverboard × PS5)', () => {
  // A configuração guardava a imagem de uma escolha ANTERIOR (o PS5) e a regra antiga
  // dava preferência a ela: o pop-up abria com o título do Hoverboard e a foto do PS5.
  const configVelha = {
    is_active: true, link_url: '/AuctionRoom?id=hoverboard', title: 'Playstation 5 (cópia velha)',
    image_url: 'https://x/ps5.png',
  };
  const hoverboard = {
    id: 'hoverboard', status: 'active', end_time: '2026-10-11T21:00:00Z', current_price: 97,
    title: '  Hoverboard Skate Elétrico 6.5 Polegadas  ', image_urls: ['https://x/hoverboard-1.webp', 'https://x/hoverboard-2.webp'],
  };
  const d = dadosDoPopup(configVelha, hoverboard);
  assert.equal(d.imagem, 'https://x/hoverboard-1.webp', 'a foto é a do leilão escolhido');
  assert.equal(d.titulo, 'Hoverboard Skate Elétrico 6.5 Polegadas', 'o título é o do leilão, sem espaço sobrando');
  assert.equal(d.preco, 97);
  // o leilão não tem foto: fica SEM foto, em vez de pegar a de outro leilão
  assert.equal(dadosDoPopup(configVelha, { ...hoverboard, image_urls: [] }).imagem, null);
  // título editado depois de salvar: o pop-up acompanha o leilão
  assert.equal(dadosDoPopup({ ...configVelha, title: 'Antigo' }, { ...hoverboard, title: 'Novo título' }).titulo, 'Novo título');
});

test('a chave da sessão é de sessão, não permanente', () => {
  // sessionStorage some ao fechar o navegador — a pessoa vê de novo outro dia.
  assert.equal(CHAVE_SESSAO, 'popupLeilaoVisto');
});

// ───────────────────── nada disso pode explodir ─────────────────────

test('entrada vazia ou lixo não derruba a decisão', () => {
  assert.doesNotThrow(() => podeMostrar());
  assert.doesNotThrow(() => podeMostrar({}));
  assert.equal(podeMostrar().mostrar, false);
  assert.equal(podeMostrar({ config: 'texto', leilao: 42 }).mostrar, false);
});

test('a foto vem da LISTA image_urls do leilão, não de um campo único', () => {
  // `auctions` guarda image_urls (array). Ler `image_url` (singular) deixaria
  // todo pop-up sem imagem sempre que o banner não tivesse arte própria.
  assert.equal(fotoDoLeilao({ image_urls: ['https://a/1.jpg', 'https://a/2.jpg'] }), 'https://a/1.jpg');
  assert.equal(fotoDoLeilao({ image_urls: ['', '  ', 'https://a/3.jpg'] }), 'https://a/3.jpg');
  assert.equal(fotoDoLeilao({ image_urls: [] }), null);
  assert.equal(fotoDoLeilao({}), null);
  assert.equal(fotoDoLeilao(null), null);
  // 08/10/2026 — NENHUMA imagem guardada na configuração ganha da foto do leilão
  assert.equal(dadosDoPopup({ image_url: 'https://banner.jpg', link_url: '/x' }, { image_urls: ['https://leilao.jpg'] }).imagem, 'https://leilao.jpg');
  assert.equal(dadosDoPopup({ image_url: '', link_url: '/x' }, { image_urls: ['https://leilao.jpg'] }).imagem, 'https://leilao.jpg');
  // só sem leilão nenhum resolvido a imagem da configuração serve de reserva
  assert.equal(dadosDoPopup({ image_url: 'https://banner.jpg', link_url: '/x' }, null).imagem, 'https://banner.jpg');
});

test('o preço aparece, e zero não vira "R$ 0,00"', () => {
  // O pedido era "conduzir o cliente direto ao lance". Card só com título não
  // convence; o valor sim. Mas leilão sem lance ainda tem que dizer algo útil.
  assert.equal(dadosDoPopup(CONFIG, { ...ABERTO, current_price: 78 }).preco, 78);
  assert.equal(dadosDoPopup(CONFIG, { ...ABERTO, current_price: 0 }).preco, null);
  assert.equal(dadosDoPopup(CONFIG, { ...ABERTO, current_price: null }).preco, null);
  assert.equal(dadosDoPopup(CONFIG, ABERTO).preco, null);
});

// ───────────────── a contagem viva (20/09) ─────────────────

test('a contagem vira relógio quando falta menos de um dia', () => {
  const fim = new Date(AGORA + (6 * 3600 + 58 * 60 + 12) * 1000).toISOString();
  assert.equal(contagemRegressiva(fim, AGORA), '06:58:12');
});

test('a contagem usa dias quando falta mais de um dia', () => {
  const fim = new Date(AGORA + (2 * 86400 + 6 * 3600) * 1000).toISOString();
  assert.equal(contagemRegressiva(fim, AGORA), '2d 06h');
});

test('cada casa é preenchida com zero — 09:05:03, nunca 9:5:3', () => {
  const fim = new Date(AGORA + (9 * 3600 + 5 * 60 + 3) * 1000).toISOString();
  assert.equal(contagemRegressiva(fim, AGORA), '09:05:03');
});

test('🔴 a contagem ANDA — um segundo depois, um segundo a menos', () => {
  // Sem esta prova, uma contagem congelada passaria: ela mostra um texto certo
  // e nunca muda. O pedido era um relógio, não um carimbo.
  const fim = new Date(AGORA + 3600 * 1000).toISOString();
  assert.equal(contagemRegressiva(fim, AGORA), '01:00:00');
  assert.equal(contagemRegressiva(fim, AGORA + 1000), '00:59:59');
});

test('sem prazo legível ou já encerrado, não promete contagem nenhuma', () => {
  for (const v of [null, undefined, '', 'ontem', new Date(AGORA - 1000).toISOString()]) {
    assert.equal(contagemRegressiva(v, AGORA), '', `inventou contagem para ${String(v)}`);
  }
});

test('a ferramenta do painel grava SEM imagem guardada e mostra a prévia do leilão escolhido', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/components/admin/PopupLeilaoConfig.jsx', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.match(src, /image_url: ''/, 'ao salvar, limpa a imagem antiga da configuração');
  assert.ok(!/create\(\{ \.\.\.dados, image_url/.test(src), 'a criação não reintroduz a imagem');
  assert.match(src, /data-teste="previa-do-popup"/, 'a prévia existe');
  assert.match(src, /dadosDoPopup\(/, 'a prévia usa a MESMA regra do pop-up');
});
