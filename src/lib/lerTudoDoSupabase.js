// 📄 LER TUDO DO SUPABASE — paginação por cursor pro cliente do navegador.
//
// ══════════════════════════════════════════════════════════════════════════
// POR QUE EXISTE (09/09/2026)
// ══════════════════════════════════════════════════════════════════════════
// O Supabase corta QUALQUER resposta em 1.000 linhas por padrão e NÃO avisa:
// vem HTTP 200, sem erro, sem aviso, com menos linhas do que existe. Esta casa
// já pagou por isso duas vezes — o "Valor Investido em Estoque" mostrando
// R$ 9.595 em vez de R$ 28.133 (que gerou o `listarTudo.js`), e a lista de
// clientes do CRM (CrmClientesTab.jsx).
//
// 🔴 E pagou uma terceira, na MvM: `xgame_votos_mvm` chegou a 2.030 linhas no
// ciclo, com 1.090 votos num único dia (08/09). Quem lia o ciclo inteiro
// recebia 1.000 e calculava a média em cima disso. MvM alimenta o Human Token,
// que alimenta X-Pay e remuneração — número errado, sem erro na tela.
//
// ══════════════════════════════════════════════════════════════════════════
// POR QUE NÃO DEU PRA USAR O `listarTudo.js`
// ══════════════════════════════════════════════════════════════════════════
// Aquele recebe um handle de `plataforma.entities` e chama `.filter()`. Estas
// telas falam direto com o cliente `supabase`, com filtros que o adapter não
// expressa (`gte('data', ...)`). Mesmo remédio, encaixe diferente.
//
// ══════════════════════════════════════════════════════════════════════════
// POR QUE CURSOR, E NÃO `.range(offset, ...)`
// ══════════════════════════════════════════════════════════════════════════
// A votação acontece AO VIVO: enquanto a tela pagina, gente está votando. Uma
// linha inserida no meio do carregamento desloca todos os offsets seguintes —
// a página 2 repetiria ou PULARIA linhas. Ancorando no último `id` lido, cada
// bloco continua exatamente de onde o anterior parou. É a mesma escolha, e
// pelo mesmo motivo, do `listarTudo.js`.

const PAGINA = 1000;
const MAX_BLOCOS = 50; // trava contra laço infinito: 50 mil linhas é muito além do caso

/**
 * Lê TODAS as linhas, em blocos de 1.000.
 *
 * @param montar função que devolve uma consulta NOVA a cada bloco
 *   (ex.: `() => supabase.from('xgame_votos_mvm').select('id,votado_id,nota').gte('data', ini)`).
 *   Precisa ser uma função: um objeto de consulta do supabase-js só pode ser
 *   executado uma vez, então reusar a mesma instância devolveria o bloco 1
 *   pra sempre — laço infinito até o teto.
 *
 * ⚠️ O `select` PRECISA incluir `id`: é ele que ancora o cursor. Sem `id` não
 * dá pra continuar, e a função avisa alto em vez de devolver meia lista calada
 * — que é exatamente o defeito que ela existe pra consertar.
 */
export async function lerTudoDoSupabase(montar, { pagina = PAGINA, maxBlocos = MAX_BLOCOS } = {}) {
  const tudo = [];
  const vistos = new Set();
  let ultimoId = '';

  for (let bloco = 0; bloco < maxBlocos; bloco += 1) {
    let consulta = montar().order('id', { ascending: true }).limit(pagina);
    if (ultimoId) consulta = consulta.gt('id', ultimoId);

    const { data, error } = await consulta;
    // Erro NÃO devolve o que já veio: meia lista passando por lista inteira é
    // como o corte silencioso do Supabase estraga conta. Quem chama trata
    // lista vazia como "não consegui", não como "não tem nada".
    if (error) {
      console.error('[lerTudoDoSupabase] consulta falhou:', error?.message || error);
      return [];
    }
    if (!Array.isArray(data) || data.length === 0) break;

    for (const linha of data) {
      const id = linha?.id;
      if (id != null && vistos.has(id)) continue;   // borda do cursor, se houver
      if (id != null) vistos.add(id);
      tudo.push(linha);
    }

    if (data.length < pagina) break;               // último bloco, acabou

    ultimoId = data[data.length - 1]?.id ?? '';
    if (!ultimoId) {
      // Bloco CHEIO e sem `id`: existe mais coisa e não há como alcançar.
      // Devolver o que veio seria repetir o defeito com outro nome.
      console.error('[lerTudoDoSupabase] o select não trouxe `id` — a lista está incompleta e o cursor não avança.');
      break;
    }
  }
  return tudo;
}
