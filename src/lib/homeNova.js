// 🏠 HOME NOVA — as regras da página de entrada, separadas da tela.
//
// Fica aqui tudo que decide O QUE aparece; os componentes só desenham. Assim a
// régua é testável sem navegador e não se repete em três lugares diferentes.
//
// ⚠️ NENHUM NÚMERO INVENTADO. Toda contagem exibida na home vem do banco. Se a
// consulta falhar, o bloco correspondente some — nunca entra um valor de enfeite.

/** Preço que o card mostra: o lance atual e, sem lance, o de abertura. */
export function precoDoLeilao(leilao) {
  const atual = Number(leilao?.current_price);
  if (Number.isFinite(atual) && atual > 0) return atual;
  const abertura = Number(leilao?.starting_price);
  return Number.isFinite(abertura) && abertura > 0 ? abertura : 0;
}

/** "R$ 1.350,00" — sempre pt-BR, sempre com centavos. */
export function emReais(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return 'R$ 0,00';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** "2.853" — separador de milhar do Brasil, sem arredondar pra cima. */
export function numeroBonito(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '0';
  return Math.trunc(n).toLocaleString('pt-BR');
}

/**
 * Os 6 cards de "Explore por categoria".
 *
 * A categoria do leilão é HERDADA do produto ligado (`products.category_id`) —
 * o campo `auctions.category` é herança do Base44 e tem 52% em "outros", então
 * não serve de vitrine. Quem entrega essa conta é a view `vw_home_categorias`.
 *
 * 🖼️ QUEM TEM FOTO VAI NA FRENTE — 19/09/2026.
 *
 * Antes a ordem era só volume de leilão. O dono mandou as artes de cinco
 * categorias (Moda, Eletrônicos, Casa & Cozinha, Ferramentas, Games) e só UMA
 * delas estava entre as seis mais movimentadas: as outras quatro ficariam de
 * fora da home, com a arte encostada. Medido em 19/09: Moda é a 7ª, Ferramentas
 * a 9ª, Video Games a 18ª.
 *
 * Escolher a foto de uma categoria É a decisão de colocá-la na vitrine — é a
 * régua mais honesta que existe aqui, porque é a única que alguém tomou de
 * propósito. O volume continua valendo para preencher o que sobrar, então a
 * vitrine nunca encolhe: as sem foto entram com o ícone, como sempre.
 *
 * Dentro de cada grupo (com foto, sem foto) a ordem segue a de antes: mais
 * leilão primeiro, empate por produto na loja, depois nome.
 *
 * Categoria sem nada dos dois não entra — card vazio é porta fechada na cara
 * de quem clicou.
 */
export const CATEGORIAS_NA_VITRINE = 12;

/**
 * O número que alguém escolheu para esta categoria, ou null.
 *
 * `null`, texto ilegível e **zero** devolvem null — ver o comentário longo em
 * `categoriasDaVitrine`: zero é o valor padrão da coluna, não uma escolha.
 */
export function ordemEscolhida(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  if (!Number.isFinite(n)) return null;
  return n > 0 ? n : null;
}

/**
 * 🔢 20/09/2026 — DE SEIS PARA DOZE, E A ORDEM GANHA DONO.
 *
 * Com as nove artes novas, catorze categorias passaram a ter foto e a vitrine
 * mostrava seis: oito sumiam, e QUATRO das cinco que o dono escolheu a dedo
 * estavam entre as que sumiam. Ter foto deixou de discriminar — quando todo
 * mundo tem, o critério vira só o volume.
 *
 * Doze vagas resolvem pelo tamanho: sobram duas de fora em vez de oito, e a
 * escolha deixa de ser dolorosa.
 *
 * Mas o volume de leilão MUDA TODO DIA — uma categoria entrava e saía da home
 * entre uma visita e outra. Isso não é vitrine, é sorteio. Agora quem define a
 * ordem é `categories.sort_order` (a coluna já existia, sem uso): quem tem
 * número vem primeiro, na ordem que a pessoa escolheu, e o volume só desempata
 * o resto. Ordem é decisão de quem vende, não sobra de contagem — e muda sem
 * deploy.
 */
export function categoriasDaVitrine(linhas, quantas = CATEGORIAS_NA_VITRINE) {
  const porMovimento = (a, b) => b.leiloes - a.leiloes || b.naLoja - a.naLoja || a.nome.localeCompare(b.nome, 'pt-BR');
  // quem tem ordem definida vem antes de quem não tem; entre as sem ordem, volume
  const porOrdem = (a, b) => {
    const temA = Number.isFinite(a.ordem);
    const temB = Number.isFinite(b.ordem);
    if (temA && temB) return a.ordem - b.ordem || porMovimento(a, b);
    if (temA) return -1;
    if (temB) return 1;
    return porMovimento(a, b);
  };

  const vivas = (linhas || [])
    .map((c) => ({
      id: c.id,
      nome: c.nome ?? c.name ?? '',
      leiloes: Number(c.leiloes_ativos) || 0,
      naLoja: Number(c.produtos_na_loja) || 0,
      imagem: c.imagem ?? c.image_url ?? null,
      // 🔴 20/09/2026 — ZERO NÃO É ESCOLHA, É O CAMPO EM BRANCO.
      //
      // Quando liguei a coluna `ordem` em produção, medi: das 19 categorias-raiz
      // ativas, ONZE estão com sort_order = 0 e oito têm números de 11 a 20
      // (mais duas em null). Zero é o valor que a coluna nasce, não uma decisão
      // de alguém — e tratá-lo como ordem válida jogava as onze não-numeradas
      // na frente das oito escolhidas a dedo.
      //
      // O efeito era visível: Casa & Construção, a categoria com MAIS leilão
      // ativo (11) e numerada 18, caía para o último slot visível da vitrine,
      // atrás de sete categorias que ninguém ordenou.
      //
      // Então 0 entra junto de null e de texto ilegível: "sem ordem escolhida",
      // e aí o volume manda — que é o comportamento que a vitrine já tinha e
      // que funcionava. Quem quiser uma categoria na frente escreve um número
      // a partir de 1, no PainelMídia.
      ordem: ordemEscolhida(c.ordem ?? c.sort_order),
    }))
    .filter((c) => c.nome && (c.leiloes > 0 || c.naLoja > 0));

  const temFoto = (c) => typeof c.imagem === 'string' && c.imagem.trim() !== '';
  return [
    ...vivas.filter(temFoto).sort(porOrdem),
    ...vivas.filter((c) => !temFoto(c)).sort(porOrdem),
  ].slice(0, quantas);
}

/** Frase do card de categoria: só diz o que existe de verdade. */
export function recadoDaCategoria(categoria) {
  const partes = [];
  if (categoria.leiloes > 0) partes.push(`${categoria.leiloes} ${categoria.leiloes === 1 ? 'leilão' : 'leilões'}`);
  if (categoria.naLoja > 0) partes.push(`${categoria.naLoja} na loja`);
  return partes.join(' · ');
}

/**
 * Quanto o item vale, para o carrossel "Em destaque" ordenar sozinho.
 *
 * 🔴 NÃO É `market_price` NEM `manual_market_price`. Medido em 18/09/2026: os
 * dois estão vazios em 100% dos 49 leilões ativos — ordenar por eles daria
 * ordem aleatória. O que existe é o preço do MESMO produto na nossa loja
 * (`products.price_catalog`), que é preço nosso, não estimativa de terceiro.
 *
 * Isso muda a cara da home sem mexer no acervo: ordenando assim, sobem o PS5
 * (R$ 6.000 na loja), a Harley (R$ 3.300) e o patinete (R$ 997) — que já
 * estavam lá embaixo, atrás de relógio de R$ 53,60.
 */
export function valorDoItem(leilao, precoPorProduto = {}) {
  const daLoja = Number(precoPorProduto[leilao?.product_id]);
  return Number.isFinite(daLoja) && daLoja > 0 ? daLoja : 0;
}

export const TETO_DE_DESTAQUES = 6;

/**
 * Quantos cabem no "Em destaque" sem deixar a semana vazia.
 *
 * 🔴 ISTO É CORREÇÃO DE UM DEFEITO REAL, pego na banca em 18/09/2026: com 8
 * fixos, o "Em destaque" levou TODOS os leilões que tinham preço de loja e o
 * carrossel "Leilões da semana" ficou sem nenhum — a seção inteira sumiu da
 * página. O destaque nunca pode consumir mais que metade do que existe.
 */
export function quantosDestaques(disponiveis, teto = TETO_DE_DESTAQUES) {
  const n = Number(disponiveis) || 0;
  if (n <= 1) return 0;
  return Math.max(1, Math.min(teto, Math.floor(n / 2)));
}

/** Os mais valiosos primeiro. Sem preço conhecido vai pro fim, nunca some. */
export function maisValiosos(leiloes, precoPorProduto = {}, quantos = TETO_DE_DESTAQUES) {
  return (leiloes || [])
    .filter((a) => a && a.status === 'active')
    .map((a) => ({ a, valor: valorDoItem(a, precoPorProduto) }))
    .sort((x, y) => y.valor - x.valor || String(x.a.title || '').localeCompare(String(y.a.title || ''), 'pt-BR'))
    .slice(0, quantos)
    .map(({ a }) => a);
}

export const DIAS_DA_SEMANA = 7;

/**
 * "Leilões da semana": termina nos próximos 7 dias, quem acaba primeiro na frente.
 *
 * 🔴 `jaEstaoEmCartaz` existe porque o carrossel de cima (os destaques que você
 * marca à mão) e este liam a mesma tabela — o mesmo leilão aparecia duas vezes
 * na mesma tela, um embaixo do outro. Aqui ele é descontado.
 */
export function leiloesDaSemana(leiloes, { agora = new Date(), dias = DIAS_DA_SEMANA, jaEstaoEmCartaz = [] } = {}) {
  const base = agora instanceof Date ? agora : new Date(agora);
  if (Number.isNaN(base.getTime())) return [];
  const limite = base.getTime() + dias * 24 * 60 * 60 * 1000;
  const fora = new Set((jaEstaoEmCartaz || []).map((a) => String(a?.id ?? a)));

  return (leiloes || [])
    .filter((a) => a && a.status === 'active' && !fora.has(String(a.id)))
    .map((a) => ({ leilao: a, fim: new Date(a.end_time).getTime() }))
    .filter(({ fim }) => Number.isFinite(fim) && fim > base.getTime() && fim <= limite)
    .sort((x, y) => x.fim - y.fim)
    .map(({ leilao }) => leilao);
}

/**
 * Os números da faixa. Recebe o que o banco devolveu e devolve só o que veio —
 * contagem ausente (consulta falhou) não vira zero nem "+100 mil": o ladrilho
 * simplesmente não aparece.
 */
export function numerosDaCasa({ leiloesAtivos, produtosNaLoja, acervo } = {}) {
  const tem = (n) => Number.isFinite(Number(n)) && Number(n) > 0;
  const lista = [];
  if (tem(leiloesAtivos)) lista.push({ chave: 'leiloes', valor: numeroBonito(leiloesAtivos), rotulo: 'leilões acontecendo agora' });
  if (tem(produtosNaLoja)) lista.push({ chave: 'loja', valor: numeroBonito(produtosNaLoja), rotulo: 'produtos na loja' });
  if (tem(acervo)) lista.push({ chave: 'acervo', valor: numeroBonito(acervo), rotulo: 'itens no acervo' });
  // Estes dois não são contagem, são fato — entram sempre.
  lista.push({ chave: 'brasil', valor: 'Brasil', rotulo: 'entrega em todo o país' });
  lista.push({ chave: 'pagamento', valor: 'PIX e cartão', rotulo: 'pagamento seguro' });
  return lista;
}

/**
 * O aviso legal do rodapé do hero. É obrigação de contrato, não enfeite:
 * `TermoAdesaoTexto.jsx` declara que a operação NÃO é leilão público oficial.
 * Fica numa constante para ninguém "limpar o layout" e apagar sem perceber.
 */
export const AVISO_NAO_OFICIAL = 'Leilão não oficial. Estratégia de venda operada pela Compras Full Comércio Ltda.';
