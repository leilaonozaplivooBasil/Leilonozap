// 🚚 O FRETE DO LANCE — o que a sala faz com a resposta do cotarFrete (24/09/2026).
//
// Antes esta decisão vivia espalhada em AuctionRoom.jsx (o `if` da resposta e o
// `freteBloqueia`). Saiu para cá por causa do caso Harley 117: a Melhor Envio
// recusava o VOLUME e a sala dizia "confira o seu CEP". Aqui cada resposta do
// servidor vira um status com nome, e cada status tem a frase certa — a que diz
// o que a pessoa pode FAZER.
//
// Status possíveis:
//   ok             frete cotado, com selo — o lance pode sair
//   a_combinar     lote grande com retirada ligada: frete zero, com selo 'a_combinar'
//   needs_address  cotou, mas falta rua/número no cadastro
//   needs_cep      cadastro sem CEP
//   needs_login    crachá de sessão velho — sair e entrar de novo
//   produto_grande transportadoras recusaram o volume e o lote NÃO permite retirada
//   error          qualquer outra falha de cotação
//   loading        cotando
export const FRETE_A_COMBINAR_ID = 'a_combinar';

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** A resposta do cotarFrete (caminho do leilão) → {status, valor, selo, endereco}. */
export function statusDaCotacao(data) {
  const d = data?.data || data;
  if (d?.success && Array.isArray(d.opcoes) && d.opcoes.length > 0) {
    const escolhida = d.opcoes[0];
    if (d.frete_a_combinar || String(escolhida?.id) === FRETE_A_COMBINAR_ID) {
      return { status: 'a_combinar', valor: 0, selo: escolhida?.selo || null, endereco: d.endereco_atual || null };
    }
    return {
      status: d.endereco_completo ? 'ok' : 'needs_address',
      valor: money(escolhida?.preco), selo: escolhida?.selo || null, endereco: d.endereco_atual || null,
    };
  }
  if (d?.error === 'nao_autenticado') return { status: 'needs_login', valor: 0, selo: null, endereco: null };
  if (d?.motivo === 'sem_cep') return { status: 'needs_cep', valor: 0, selo: null, endereco: null };
  if (d?.motivo === 'produto_grande') return { status: 'produto_grande', valor: 0, selo: null, endereco: null };
  return { status: 'error', valor: 0, selo: null, endereco: null };
}

export const MENSAGEM_PRODUTO_GRANDE = 'Este produto é grande demais para Correios e Jadlog. Fale com a gente pelo WhatsApp para combinar a entrega.';
export const MENSAGEM_A_COMBINAR = 'Frete a combinar: retirada em mãos ou entrega combinada com a equipe. Nada de frete é cobrado no lance.';

/**
 * O que trava o lance, ou null se pode sair. A mesma régua de sempre (21/08:
 * nenhum lance sem frete cotado) — com a única exceção do selo 'a_combinar'.
 */
export function bloqueioDoFrete({ status, valor = 0, selo = null, cep = '' } = {}) {
  if (status === 'ok' && valor > 0 && selo) return null;
  if (status === 'a_combinar' && selo) return null;
  if (status === 'a_combinar' && !selo) return 'Não conseguimos confirmar o frete a combinar com o servidor. Recarregue a página e tente de novo.';
  // selo ausente com cotação "ok" só acontece se a rota antiga responder — e aí
  // o lance seria recusado no servidor assim que FRETE_MODO=bloquear subir.
  if (status === 'ok' && valor > 0 && !selo) return 'Não conseguimos confirmar o frete com o servidor. Recarregue a página e tente de novo.';
  if (status === 'needs_login') return 'Sua sessão expirou. Saia e entre de novo para calcular o frete e dar o lance.';
  if (status === 'needs_address') return 'Complete seu endereço de entrega para dar o lance.';
  if (status === 'loading') return 'Calculando o frete… aguarde um instante e tente de novo.';
  if (status === 'produto_grande') return MENSAGEM_PRODUTO_GRANDE;
  if (status === 'needs_cep' || !cep) return 'Informe seu CEP para calcular o frete antes de dar o lance.';
  if (status === 'error') return 'Não conseguimos calcular o frete para o seu CEP. Confira o CEP e tente novamente.';
  return 'O frete ainda não foi calculado. Confira seu CEP antes de dar o lance.';
}
