// 📊 O RELATÓRIO DE UM LEILÃO — a regra, testável sem navegador e sem banco.
//
// 🔴 POR QUE ISTO EXISTE (22/09/2026)
// O dono pediu à mão o relatório dos depósitos do leilão do Playstation 5. Ao
// receber, decidiu: "esse relatório de um leilão específico deve ser uma opção
// para todos que podem enviar demanda". Ou seja: deixa de ser artesanal e vira
// função — pra qualquer leilão, por quem tem `pode_distribuir`.
//
// ═══════════════════════════════════════════════════════════════════════════
// ⚠️ A RESSALVA QUE NÃO PODE SUMIR — leia antes de mexer em qualquer número
// ═══════════════════════════════════════════════════════════════════════════
// **UM DEPÓSITO NÃO FICA MARCADO COM O LEILÃO A QUE SE DESTINA.** A plataforma
// não guarda esse vínculo: quem deposita põe dinheiro na CARTEIRA, e a carteira
// serve pra qualquer leilão e pra loja.
//
// Então este relatório NÃO é "os depósitos deste leilão". É o critério mais
// honesto que o dado permite:
//
//     depósitos de quem DEU LANCE neste leilão,
//     feitos ENQUANTO ele estava aberto.
//
// Quem depositou e não deu lance fica de fora. Quem deu lance e já tinha saldo
// não aparece. É aproximação, e a tela é obrigada a dizer isso — por isso
// `RESSALVA` é exportada daqui e não escrita na tela: regra e aviso andam
// juntos, e ninguém remove o aviso sem esbarrar na regra.
//
// Conferido contra o PDF feito à mão (leilão do PS5, 14–20/09/2026):
// 23 depósitos pagos · R$ 10.400,00 · 2 não pagos (R$ 1.200,00) · 6 pessoas.

export const RESSALVA = 'Um depósito não fica marcado com o leilão a que se destina — a plataforma não guarda esse vínculo. Este relatório usa o critério mais honesto possível: depósitos de quem deu lance neste leilão, feitos enquanto ele estava aberto.';

export const SELO_INTERNO = 'USO INTERNO · contém nome e valor de cliente · não circular';

/** Centavos, sempre. Soma de float em dinheiro acumula erro e aparece no total. */
const cent = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** O instante de um registro, em ms. 0 quando não dá pra ler (vai pro fim). */
export function quando(linha, ...campos) {
  for (const c of campos) {
    const v = linha?.[c];
    if (!v) continue;
    const t = new Date(v).getTime();
    if (Number.isFinite(t)) return t;
  }
  return 0;
}

/**
 * A janela em que o leilão esteve aberto.
 *
 * `created_date` é a abertura e `end_time` o encerramento. Leilão sem fim
 * marcado (ainda rodando) usa `agora` — senão a janela fecharia em 1970 e o
 * relatório sairia vazio no caso mais interessante, que é o leilão de hoje.
 */
export function janelaDoLeilao(leilao, agora = new Date()) {
  const abriu = quando(leilao, 'created_date', 'start_time');
  const fimBruto = quando(leilao, 'end_time');
  const fechou = fimBruto || agora.getTime();
  return { abriu, fechou, aberto: !fimBruto || fechou > agora.getTime() };
}

/** Quem deu lance neste leilão (ids, sem repetir). */
export function quemDeuLance(lances = []) {
  const ids = new Set();
  for (const l of lances || []) {
    const id = l?.sender_id || l?.user_id || null;
    if (id) ids.add(id);
  }
  return ids;
}

/**
 * Os depósitos que entram no relatório: de quem deu lance, dentro da janela.
 *
 * O filtro da JANELA é inclusivo nas duas pontas de propósito — o depósito
 * feito no mesmo segundo do lance de abertura conta, e o feito no instante do
 * encerramento também. Cortar exclusivo perderia justamente os casos de
 * corrida, que são os que mais pesam num leilão.
 */
export function depositosDoLeilao(depositos = [], { lances = [], leilao = null, agora = new Date() } = {}) {
  const { abriu, fechou } = janelaDoLeilao(leilao, agora);
  const deuLance = quemDeuLance(lances);
  return (depositos || []).filter((d) => {
    if (!d) return false;
    const dono = d.buyer_id || d.user_id || null;
    if (!dono || !deuLance.has(dono)) return false;
    const t = quando(d, 'created_date', 'created_at');
    return t >= abriu && t <= fechou;
  });
}

/** Pago de verdade. Qualquer outro estado é tentativa que não entrou. */
export function estaPago(deposito) {
  return String(deposito?.status || '').toLowerCase() === 'paid';
}

/** O rótulo da forma de pagamento, como a pessoa entende. */
export function formaEmPalavras(metodo) {
  const m = String(metodo || '').toLowerCase();
  if (m.includes('card') || m.includes('cartao') || m.includes('cartão')) return 'Cartão';
  if (m.includes('pix')) return 'PIX';
  if (m.includes('saldo')) return 'Saldo';
  return m ? m.toUpperCase() : '—';
}

/**
 * Quanto a plataforma segurou na carteira desta pessoa por causa deste leilão.
 *
 * ⚠️ NÃO é dinheiro cobrado. É o lance preso enquanto o leilão corre, devolvido
 * quando alguém cobre. Somar isso com "valor pago" seria contar duas vezes — e
 * foi por isso que o PDF original ganhou um parágrafo explicando a coluna.
 */
export function reservadoPorPessoa(reservas = []) {
  const porPessoa = new Map();
  for (const r of reservas || []) {
    if (!r?.user_id) continue;
    if (String(r.direcao || '') !== 'entrada_reserva') continue;
    porPessoa.set(r.user_id, cent((porPessoa.get(r.user_id) || 0) + num(r.valor)));
  }
  return porPessoa;
}

/** Quantos lances cada pessoa deu. */
export function lancesPorPessoa(lances = []) {
  const conta = new Map();
  for (const l of lances || []) {
    const id = l?.sender_id || l?.user_id || null;
    if (id) conta.set(id, (conta.get(id) || 0) + 1);
  }
  return conta;
}

/**
 * O relatório inteiro, pronto pra tela e pro PDF.
 *
 * Recebe tudo já lido do banco — esta função não fala com ninguém. É o que
 * permite provar os números sem subir servidor.
 */
export function relatorioDoLeilao({
  leilao = null, lances = [], depositos = [], reservas = [], nomes = {}, agora = new Date(),
} = {}) {
  if (!leilao?.id) return null;

  const janela = janelaDoLeilao(leilao, agora);
  const meus = depositosDoLeilao(depositos, { lances, leilao, agora });
  const pagos = meus.filter(estaPago);
  const naoPagos = meus.filter((d) => !estaPago(d));

  const reservado = reservadoPorPessoa(reservas);
  const contaLances = lancesPorPessoa(lances);
  const nomeDe = (id) => nomes?.[id] || null;

  // ── pessoa por pessoa ──
  const porPessoa = new Map();
  const garante = (id) => {
    if (!porPessoa.has(id)) {
      porPessoa.set(id, {
        id, nome: nomeDe(id) || 'sem nome',
        depositos: 0, pago: 0, naoPago: 0,
        lances: contaLances.get(id) || 0,
        reservado: reservado.get(id) || 0,
        arrematou: id === (leilao.winner_id || null),
      });
    }
    return porPessoa.get(id);
  };
  // todo mundo que deu lance aparece, mesmo sem depósito nenhum: some da lista
  // seria esconder quem disputou o leilão com saldo que já tinha
  for (const id of quemDeuLance(lances)) garante(id);
  for (const d of meus) {
    const dono = d.buyer_id || d.user_id;
    const p = garante(dono);
    // o nome do depósito é melhor que o do cadastro quando o cadastro está vazio
    if ((!p.nome || p.nome === 'sem nome') && d.buyer_name) p.nome = d.buyer_name;
    if (estaPago(d)) { p.depositos += 1; p.pago = cent(p.pago + num(d.total_amount)); }
    else p.naoPago = cent(p.naoPago + num(d.total_amount));
  }

  const pessoas = [...porPessoa.values()].sort(
    (a, b) => b.pago - a.pago || String(a.nome).localeCompare(String(b.nome), 'pt-BR'),
  );

  // ── extrato, em ordem de acontecimento ──
  const extrato = [...meus]
    .sort((a, b) => quando(a, 'created_date', 'created_at') - quando(b, 'created_date', 'created_at'))
    .map((d) => ({
      id: d.id,
      quandoMs: quando(d, 'created_date', 'created_at'),
      pessoa: nomeDe(d.buyer_id || d.user_id) || d.buyer_name || 'sem nome',
      forma: formaEmPalavras(d.payment_method),
      valor: cent(num(d.total_amount)),
      pago: estaPago(d),
    }));

  const arremate = cent(num(leilao.current_price));
  const frete = cent(num(leilao.frete_reservado_valor));

  return {
    ressalva: RESSALVA,
    selo: SELO_INTERNO,
    leilao: {
      id: leilao.id,
      titulo: leilao.title || 'sem título',
      status: leilao.status || null,
      abriuMs: janela.abriu,
      fechouMs: janela.fechou,
      aindaAberto: janela.aberto,
      arrematanteId: leilao.winner_id || null,
      arrematante: nomeDe(leilao.winner_id) || leilao.winner_name || null,
      abertura: cent(num(leilao.starting_price)),
      arremate,
      frete,
      // o que o ganhador paga de verdade: o lance mais o frete
      cobradoDoGanhador: cent(arremate + frete),
      participantes: quemDeuLance(lances).size,
    },
    entrou: {
      depositosPagos: pagos.length,
      valorPago: cent(pagos.reduce((s, d) => s + num(d.total_amount), 0)),
      tentativasNaoPagas: naoPagos.length,
      valorNaoPago: cent(naoPagos.reduce((s, d) => s + num(d.total_amount), 0)),
      quemDepositou: new Set(pagos.map((d) => d.buyer_id || d.user_id)).size,
    },
    pessoas,
    totais: {
      depositos: pessoas.reduce((s, p) => s + p.depositos, 0),
      pago: cent(pessoas.reduce((s, p) => s + p.pago, 0)),
      naoPago: cent(pessoas.reduce((s, p) => s + p.naoPago, 0)),
      lances: pessoas.reduce((s, p) => s + p.lances, 0),
      reservado: cent(pessoas.reduce((s, p) => s + p.reservado, 0)),
    },
    extrato,
  };
}
