// 🛰️ INTELIGÊNCIA DA REGIÃO — porteiro único das chamadas (08/08/2026)
//
// PROBLEMA REAL: o cartão da região pedia o dado TODA vez que era montado —
// e ele monta de novo a cada troca de aba/período do painel. Resultado: rajada
// de chamadas na mesma URL e o alerta vermelho de "rate limit" por cima da tela.
//
// AQUI resolvemos em um lugar só, sem mexer no visual nem em regra de negócio:
//   • guarda a resposta por 2 minutos (mesma região não é pedida de novo);
//   • uma chamada por vez (quem chegar junto espera a mesma resposta);
//   • ao falhar, espera crescente (2min → 4min → 8min, teto de 15min);
//   • aba em segundo plano não dispara pedido nenhum.
// Falhar aqui NUNCA quebra a tela: devolve { available:false } e a vida segue.

const TTL_MS = 2 * 60 * 1000;          // resposta boa vale 2 minutos
const ESPERA_INICIAL_MS = 2 * 60 * 1000; // após falhar, silêncio de 2 minutos
const ESPERA_MAXIMA_MS = 15 * 60 * 1000;

const cache = new Map();      // chave -> { dados, em }
const emVoo = new Map();      // chave -> Promise
let bloqueadoAte = 0;         // silêncio global após falha
let esperaAtual = ESPERA_INICIAL_MS;

const INDISPONIVEL = { available: false };

export async function buscarRegiao(base44, { cep = '', cidade = '', uf = '' }) {
  if (!cep && !cidade) return INDISPONIVEL;

  const chave = `${cep}|${cidade}|${uf}`.toLowerCase();

  const guardado = cache.get(chave);
  if (guardado && Date.now() - guardado.em < TTL_MS) return guardado.dados;

  // aba escondida: não é hora de pedir nada
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return guardado?.dados || INDISPONIVEL;
  }

  // ainda de castigo por causa da última falha
  if (Date.now() < bloqueadoAte) return guardado?.dados || INDISPONIVEL;

  // já tem alguém pedindo isso agora: pega carona
  if (emVoo.has(chave)) return emVoo.get(chave);

  const promessa = (async () => {
    try {
      const r = await base44.functions.invoke('regiaoInteligencia', { cep, cidade, uf });
      const dados = r || INDISPONIVEL;
      cache.set(chave, { dados, em: Date.now() });
      esperaAtual = ESPERA_INICIAL_MS; // deu certo: zera o castigo
      return dados;
    } catch {
      bloqueadoAte = Date.now() + esperaAtual;
      esperaAtual = Math.min(esperaAtual * 2, ESPERA_MAXIMA_MS);
      return INDISPONIVEL;
    } finally {
      emVoo.delete(chave);
    }
  })();

  emVoo.set(chave, promessa);
  return promessa;
}