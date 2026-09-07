// 📅 A ROTINA É DELA — DIR-80
//
// Ordem do dono (06/09/2026): *"foi gerada uma vez, ela tem que ficar todo dia,
// só se a pessoa pedir pra parar. A pessoa tem que ter o botão de editar, de
// excluir — ela pode gerar a perfeita e excluir e incluir, na rotina dela.
// Existem pessoas que não vão pra empresa, então ela tem outra rotina."*
//
// O que existia: `metodo_perfil.rotina` (JSONB) no banco desde a migração do
// Método, e a tela só LENDO dela — nunca ninguém escreveu. Todo mundo recebia a
// rotina da casa e não tinha como ter a sua. Este arquivo é a regra de escrita
// que faltava, e a régua da geração automática.
//
// Tudo aqui é função pura: a tela só desenha. É o que deixa a regra testável
// sem navegador — e o que permite provar as duas travas abaixo sem abrir tela.

/** Hora de relógio DE VERDADE: 00:00 a 23:59.
 *  Só conferir o formato deixa passar "25:99" — que ordena errado e vira lixo
 *  na hora de gerar o dia. */
export function horaValida(hora) {
  const m = /^(\d{2}):(\d{2})$/.exec(String(hora || '').trim());
  if (!m) return false;
  return Number(m[1]) <= 23 && Number(m[2]) <= 59;
}

/** Um item da rotina, sempre com a mesma forma venha de onde vier. */
export function itemDaRotina(bruto = {}) {
  const hora = String(bruto.hora || '').trim();
  return {
    hora: horaValida(hora) ? hora : '',
    titulo: String(bruto.titulo || '').trim(),
    detalhe: String(bruto.detalhe || '').trim(),
  };
}

/** Ordena pelo relógio; quem não tem hora vai pro fim, na ordem em que está. */
export function ordenarRotina(itens = []) {
  const lista = (Array.isArray(itens) ? itens : []).map(itemDaRotina).filter((i) => i.titulo);
  return lista
    .map((item, i) => ({ item, i }))
    .sort((a, b) => {
      if (!a.item.hora && !b.item.hora) return a.i - b.i;
      if (!a.item.hora) return 1;
      if (!b.item.hora) return -1;
      return a.item.hora.localeCompare(b.item.hora) || a.i - b.i;
    })
    .map(({ item }) => item);
}

/** Incluir um item. Devolve rotina NOVA — nada é mutado no lugar. */
export function incluirNaRotina(rotina = [], bruto = {}) {
  const novo = itemDaRotina(bruto);
  if (!novo.titulo) return ordenarRotina(rotina);
  return ordenarRotina([...(Array.isArray(rotina) ? rotina : []), novo]);
}

/** Editar o item de um índice. Índice fora da lista não faz nada (não cria lixo). */
export function editarNaRotina(rotina = [], indice, patch = {}) {
  const lista = Array.isArray(rotina) ? [...rotina] : [];
  if (!Number.isInteger(indice) || indice < 0 || indice >= lista.length) return ordenarRotina(lista);
  const alvo = itemDaRotina({ ...lista[indice], ...patch });
  if (!alvo.titulo) return ordenarRotina(lista); // esvaziar o título não apaga: pra apagar existe excluir
  lista[indice] = alvo;
  return ordenarRotina(lista);
}

/** Excluir o item de um índice. */
export function excluirDaRotina(rotina = [], indice) {
  const lista = Array.isArray(rotina) ? [...rotina] : [];
  if (!Number.isInteger(indice) || indice < 0 || indice >= lista.length) return ordenarRotina(lista);
  lista.splice(indice, 1);
  return ordenarRotina(lista);
}

// ── ⚙️ A GERAÇÃO AUTOMÁTICA ─────────────────────────────────────────────────

/** O estado da rotina automática, com os padrões de quem nunca mexeu. */
export function estadoDaRotina(perfil) {
  const p = perfil && typeof perfil === 'object' ? perfil : {};
  return {
    // a rotina só é DELA quando ela escreveu; senão é a da casa
    propria: Array.isArray(p.rotina) && p.rotina.length > 0,
    // liga na primeira geração e só desliga se a pessoa pedir
    automatica: p.rotina_automatica === true,
    desde: p.rotina_automatica_desde || null,
    // DIR-81 — ela PEDIU pra parar (botão "parar de gerar todo dia"). Diferente
    // de "nunca decidiu": é o que trava o cron de religar sozinho.
    recusada: p.rotina_automatica_recusada === true,
  };
}

/**
 * DIR-81 — dono: "eu quero mudar a questão de depender delas gerarem
 * automáticas, já vamos deixar abertas pra incentivá-las". Quem tem direito
 * ao X-Game não devia precisar clicar uma vez antes da rotina se repetir
 * sozinha — a CASA liga por ela, na primeira vez que o cron a vir. Só não
 * liga quem JÁ decidiu (ligou por conta própria, ou pediu pra parar).
 */
export function devePreAbrirAutomatico(perfil) {
  const estado = estadoDaRotina(perfil);
  return !estado.automatica && !estado.recusada;
}

/**
 * Deve gerar o dia sozinha AGORA?
 *
 * As duas travas da diretiva moram aqui, e não na tela — é o único jeito de
 * prová-las sem navegador:
 *
 * 1. **Só em dia vazio.** Abrir a tela duas vezes não pode duplicar o dia. Se
 *    já existe QUALQUER tarefa no dia, o automático não encosta.
 * 2. **Nunca pra trás.** Gerar sozinha num dia que já passou reescreveria
 *    história — e ainda faria a pessoa "perder" tarefas que nunca existiram.
 *
 * E mais uma que o dono não pediu mas quebra a confiança se faltar: só gera a
 * partir do dia em que ela ligou. Ligar hoje não pode encher a semana passada.
 */
export function deveGerarSozinha({ perfil, dia, hojeISO, tarefasDoDia = [] } = {}) {
  const estado = estadoDaRotina(perfil);
  if (!estado.automatica) return false;
  if (!dia || !hojeISO) return false;
  if (dia < hojeISO) return false;                       // nunca pra trás
  if (estado.desde && dia < String(estado.desde).slice(0, 10)) return false;
  const lista = Array.isArray(tarefasDoDia) ? tarefasDoDia : [];
  if (lista.length > 0) return false;                    // dia com qualquer coisa: não encosta
  return true;
}

/** A rotina que vale pra esta pessoa: a dela quando existe, senão a da casa. */
export function rotinaEmVigor(perfil, rotinaDaCasa = []) {
  const estado = estadoDaRotina(perfil);
  return estado.propria ? ordenarRotina(perfil.rotina) : ordenarRotina(rotinaDaCasa);
}

/**
 * O que muda quando a pessoa mexe na rotina.
 *
 * Decisão registrada na DIR-80: vale **a partir de amanhã**. Mexer no dia que
 * ela já está tocando apagaria o que ela já fez. Aplicar hoje existe, mas por
 * botão — nunca sozinho.
 */
export function valeAPartirDe(hojeISO) {
  const d = new Date(`${String(hojeISO).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
