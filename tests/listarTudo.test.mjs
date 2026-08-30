// listarTudo — paginação por cursor que fura o corte silencioso de 1000
// linhas do Supabase (DIR-20). Testada com uma entidade falsa que se comporta
// como o PostgREST: nunca devolve mais de 1000 linhas por chamada.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { listarTudo } from '../src/lib/listarTudo.js';

// Entidade falsa: N linhas com id sequencial zero-padded (ordena como string,
// igual ao id text do banco), respeitando filtro {id: {$gt}} e limit.
function entidadeFake(totalLinhas, { capServidor = 1000 } = {}) {
  const linhas = Array.from({ length: totalLinhas }, (_, i) => ({
    id: String(i + 1).padStart(8, '0'),
    valor: i + 1,
  }));
  let chamadas = 0;
  return {
    get chamadas() { return chamadas; },
    async filter(filtro, _orderBy, limit) {
      chamadas++;
      const min = filtro?.id?.$gt || '';
      const pagina = linhas
        .filter((l) => l.id > min)
        .slice(0, Math.min(limit || capServidor, capServidor));
      return pagina;
    },
  };
}

describe('listarTudo', () => {
  test('tabela com 2932 linhas (caso real products): carrega TODAS, não só 1000', async () => {
    const ent = entidadeFake(2932);
    const tudo = await listarTudo(ent);
    assert.equal(tudo.length, 2932);
    assert.equal(ent.chamadas, 3); // 1000 + 1000 + 932
  });

  test('tabela menor que uma página: uma chamada só', async () => {
    const ent = entidadeFake(302);
    const tudo = await listarTudo(ent);
    assert.equal(tudo.length, 302);
    assert.equal(ent.chamadas, 1);
  });

  test('tabela vazia: devolve lista vazia sem quebrar', async () => {
    const tudo = await listarTudo(entidadeFake(0));
    assert.deepEqual(tudo, []);
  });

  test('exatamente 1000 linhas (limite do corte): pega todas', async () => {
    const tudo = await listarTudo(entidadeFake(1000));
    assert.equal(tudo.length, 1000);
  });

  test('nenhuma linha duplicada mesmo com blocos consecutivos', async () => {
    const tudo = await listarTudo(entidadeFake(2500));
    const ids = new Set(tudo.map((l) => l.id));
    assert.equal(ids.size, 2500);
  });

  test('filtroBase é aplicado em todos os blocos', async () => {
    const ent = entidadeFake(1500);
    const original = ent.filter.bind(ent);
    const filtrosVistos = [];
    ent.filter = async (filtro, orderBy, limit) => { filtrosVistos.push(filtro); return original(filtro, orderBy, limit); };
    await listarTudo(ent, { catalog_active: true });
    assert.ok(filtrosVistos.length >= 2);
    for (const f of filtrosVistos) assert.equal(f.catalog_active, true);
  });
});
