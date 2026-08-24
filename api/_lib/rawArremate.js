// rawArremate — monta o `raw_base44` do pedido de arremate.
//
// 🔴 POR QUE VIROU LIB COMPARTILHADA (22/08/2026)
// Este código morava dentro de settleAuctionWithBalance.js, então SÓ o arremate
// pago com saldo tinha pacote de entrega completo. O arremate pago com PIX ou
// cartão nasce em createMPWalletDeposit.js, que criava a venda SEM raw_base44
// nenhum — e aí gerarEnvioAutomatico lia `raw = {}`, via `delivery_type`
// indefinido e devolvia `skipped: 'retirada_na_loja'`.
//
// Ou seja: o cliente pagava o frete e o sistema classificava como retirada no
// balcão. Nunca gerava etiqueta, e a tela mostrava uma pendência que ninguém
// conseguia resolver. É o caso AR3BEF1939, documentado em CatalogOrdersAdmin.jsx.
//
// Agora os dois caminhos de pagamento montam o MESMO pacote, por esta função.
// 🚚 O PACOTE DE ENTREGA DO ARREMATE — corrigido em 21/08/2026
// ══════════════════════════════════════════════════════════════════════════════
// COMO ESTAVA, e os quatro defeitos numa linha só:
//
//   ...(freteAmount > 0 ? { raw_base44: { frete: { valor: freteAmount }, amount_charged: amount } } : {})
//
//   ① `delivery_type` NUNCA era gravado. E as duas pontas discordam do valor
//      ausente: CatalogOrdersAdmin.jsx só esconde a etiqueta quando é 'pickup',
//      melhorEnvioShipment.js só aceita quando é 'delivery'. Resultado: a tela
//      mostrava "Etiqueta pendente" e o servidor respondia "é retirada no
//      balcão". Acontecia em TODO arremate, não em alguns.
//   ② Com frete zero, o `raw_base44` inteiro deixava de existir — sem frete,
//      sem amount_charged, sem nada. Foi o caso do pedido ARD5856D19.
//   ③ O frete ia como `{ valor }` só. melhorEnvioShipment.js exige `frete.id`
//      (o serviço escolhido) ou devolve 'sem_frete_id'. Ou seja: mesmo o
//      arremate COM frete jamais geraria etiqueta. E sem `empresa`/`servico`,
//      a tela mostrava "Frete: R$ 11,60" sem nome de transportadora.
//   ④ Nenhum endereço de entrega era gravado. A Melhor Envio precisa dele.
//
// COMO FICOU: o raw_base44 nasce SEMPRE, com delivery_type, endereço do
// vencedor e o frete completo.
//
// ⚠️ POR QUE O DETALHE DO FRETE É RESOLVIDO AQUI, E NÃO NO LANCE
// O caminho óbvio seria o lance já gravar id/empresa/serviço. Não dá: o PATCH
// do lance (submitAtomicBid.js) não aceita campo que não exista na tabela —
// coluna inexistente ali faz o PostgREST devolver 42703 e TODO lance morre.
// Foi o que derrubou a produção de 03/08 15:03 até o PONTO 83, e está anotado
// no cabeçalho daquele arquivo. Então aqui a gente RECOTA o frete com o CEP do
// vencedor só para descobrir o `id` do serviço.
//
// ⚠️ O VALOR COBRADO NÃO MUDA. Quem manda é `frete_reservado_valor`, que foi o
// que o cliente viu e teve reservado no lance. A recotação serve só para achar
// o id/empresa/serviço da etiqueta. Se ela falhar, o pedido nasce com o valor
// certo e sem id — vira etiqueta pendente, que é um problema de logística, não
// de dinheiro.
export async function montarRawArremate({ user, freteAmount, amount, produtoAmount, auction, origem = 'arremate' }) {
  const cep = String(user?.address_zip_code || '').replace(/\D/g, '');
  const endereco = {
    street: user?.address_street || null,
    number: user?.address_number || null,
    complement: user?.address_complement || null,
    neighborhood: user?.address_neighborhood || null,
    city: user?.address_city || null,
    state: user?.address_state || null,
    zip: cep || null,
  };
  const temEndereco = !!(endereco.street && cep.length === 8);

  // ⚠️ F9 — NUNCA transformar entrega paga em retirada.
  // A primeira versão marcava 'pickup' quando faltava endereço, MESMO com frete
  // cobrado. Isso é apagar um problema com outro: o cliente pagou frete, então
  // aquilo é entrega. Sem endereço vira 'delivery_pendente' — pendência
  // operacional visível, que a logística resolve pedindo o endereço.
  const situacao = freteAmount > 0
    ? (temEndereco ? 'delivery' : 'delivery_pendente')
    : (temEndereco ? 'delivery' : 'pickup');

  const raw = {
    delivery_type: situacao,
    address: temEndereco ? endereco : null,
    amount_charged: amount,
    produto_amount: produtoAmount,
    origem,
    // 🔗 BLOQUEADOR 7 (auditoria OpenAI, 21/08/2026) — DE ONDE VEIO ESTE PEDIDO.
    // O pedido de arremate nascia sem NENHUMA referência ao leilão que o gerou.
    // Quem precisasse recotar o frete depois (a rota cobrarFretePendente) não
    // tinha como descobrir o produto, e acabava passando o id da VENDA para
    // `cotarOpcoes` — que procura em `products`, não acha, e cai na caixa mínima
    // dos Correios. Mesmo defeito F8, um andar acima. Agora o vínculo fica
    // gravado no pedido.
    auction_id: auction?.id || null,
    product_id: auction?.product_id || null,
    frete: { id: null, valor: freteAmount, empresa: null, servico: null, prazo: null, cep: cep || null },
  };

  if (situacao === 'delivery_pendente') {
    raw.pendencia = 'Frete cobrado mas o comprador está sem endereço completo no cadastro. Peça o endereço antes de despachar.';
  }
  if (!(temEndereco && freteAmount > 0)) return raw;

  // recotação só para descobrir o serviço — nunca para mudar o valor.
  // ⚠️ F8 — o produto é `auction.product_id`. A primeira versão passava o id do
  // LEILÃO, que não existe em `public.products`: `cotarOpcoes` não achava nada e
  // caía silenciosamente na caixa mínima dos Correios (11×2×16 cm, 0,3 kg). Ou
  // seja, escolhia transportadora e preço por um pacote fictício. Achado da
  // auditoria independente da OpenAI, e o erro era meu.
  try {
    const { cotarFreteDoLeilao } = await import('../_lib/freteLeilao.js');
    const r = await cotarFreteDoLeilao({ auctionId: auction.id, userId: user.id, auction, cep });
    if (r?.ok && Array.isArray(r.opcoes) && r.opcoes.length) {
      const escolhida = r.opcoes.reduce((melhor, o) =>
        Math.abs(o.preco - freteAmount) < Math.abs(melhor.preco - freteAmount) ? o : melhor, r.opcoes[0]);
      raw.frete.id = String(escolhida.id);
      raw.frete.empresa = escolhida.empresa || null;
      raw.frete.servico = escolhida.nome || null;
      raw.frete.prazo = escolhida.prazo ?? null;
      raw.frete.valor_recotado = escolhida.preco;   // trilha: dá pra comparar depois
    } else if (r?.motivo) {
      raw.frete.recotacao_falhou = r.motivo;        // a logística vê por que não saiu etiqueta
    }
  } catch (e) {
    console.warn('[SETTLE] recotacao de frete falhou (pedido segue com o valor reservado):', e?.message);
    raw.frete.recotacao_falhou = String(e?.message || e).slice(0, 120);
  }
  return raw;
}
