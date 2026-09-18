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
 * Ordem: quem tem mais leilão acontecendo aparece primeiro; empate desempata
 * por produto na loja. Categoria sem nada dos dois não entra — card vazio é
 * porta fechada na cara de quem clicou.
 */
export function categoriasDaVitrine(linhas, quantas = 6) {
  return (linhas || [])
    .map((c) => ({
      id: c.id,
      nome: c.nome ?? c.name ?? '',
      leiloes: Number(c.leiloes_ativos) || 0,
      naLoja: Number(c.produtos_na_loja) || 0,
      imagem: c.imagem ?? c.image_url ?? null,
    }))
    .filter((c) => c.nome && (c.leiloes > 0 || c.naLoja > 0))
    .sort((a, b) => b.leiloes - a.leiloes || b.naLoja - a.naLoja || a.nome.localeCompare(b.nome, 'pt-BR'))
    .slice(0, quantas);
}

/** Frase do card de categoria: só diz o que existe de verdade. */
export function recadoDaCategoria(categoria) {
  const partes = [];
  if (categoria.leiloes > 0) partes.push(`${categoria.leiloes} ${categoria.leiloes === 1 ? 'leilão' : 'leilões'}`);
  if (categoria.naLoja > 0) partes.push(`${categoria.naLoja} na loja`);
  return partes.join(' · ');
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
