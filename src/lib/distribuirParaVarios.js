// 👥 DISTRIBUIR UMA TAREFA PARA VÁRIAS PESSOAS DE UMA VEZ (24/09/2026).
//
// Dono: "lista completa de usuários do método reunidos para selecionar e
// enviar tarefa de uma vez. Como agora por exemplo o Emannuel queria enviar
// uma tarefa para vários de uma vez."
//
// Cada pessoa recebe a SUA cópia (a própria linha em metodo_tarefas, o
// próprio card no quadro, o próprio sino) — não uma tarefa compartilhada.
// Assim cada um dá o pronto sozinho, e o valor do dia de cada um continua
// saindo do fixo dele. Esta régua é pura: só decide QUEM recebe e monta as
// linhas; quem grava é DistribuirTarefa.jsx, num insert só por tabela.

/** Quem recebe: a pessoa escolhida (modo de sempre) ou os marcados, sem repetir. */
export function destinatariosDoEnvio({ pessoa = null, varios = false, marcados = [] } = {}) {
  if (!varios) return pessoa ? [String(pessoa)] : [];
  const vistos = new Set();
  const lista = [];
  for (const id of Array.isArray(marcados) ? marcados : []) {
    const s = id ? String(id) : '';
    if (!s || vistos.has(s)) continue;
    vistos.add(s); lista.push(s);
  }
  return lista;
}

/** Marca ou desmarca uma pessoa, preservando a ordem de quem já estava. */
export function alternarMarcado(marcados = [], id) {
  const s = String(id);
  return marcados.includes(s) ? marcados.filter((x) => x !== s) : [...marcados, s];
}

/** "Marcar todos" da lista que está na tela. */
export function todosDaLista(lista = []) {
  return (Array.isArray(lista) ? lista : []).map((p) => String(p.id)).filter(Boolean);
}

/** As mesmas linhas de tarefa, uma cópia por pessoa (user_id trocado). */
export function linhasParaVarios(linhasBase = [], ids = []) {
  return ids.flatMap((id) => linhasBase.map((l) => ({ ...l, user_id: id })));
}

/**
 * A primeira linha gravada de cada pessoa — é a ela que o card do quadro
 * se liga (na mentoria completa são três blocos; na semana, um por dia).
 */
export function primeiraDeCadaPessoa(gravadas = []) {
  const m = new Map();
  for (const t of Array.isArray(gravadas) ? gravadas : []) {
    if (t?.user_id && !m.has(t.user_id)) m.set(t.user_id, t);
  }
  return m;
}

/** O resumo do toast: "3 pessoas: Ana, Bia e Caio" / "7 pessoas: Ana, Bia, Caio e mais 4". */
export function resumoDoEnvio(nomes = []) {
  const n = nomes.length;
  if (n === 0) return 'ninguém';
  if (n === 1) return nomes[0];
  const mostra = nomes.slice(0, 3);
  const resto = n - mostra.length;
  const lista = resto > 0
    ? `${mostra.join(', ')} e mais ${resto}`
    : `${mostra.slice(0, -1).join(', ')} e ${mostra.at(-1)}`;
  return `${n} pessoas: ${lista}`;
}
