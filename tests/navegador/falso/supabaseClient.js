// Um `supabase` de mentira só pra banca do navegador — NÃO vai pro app.
// A banca (vite.config.mjs) aponta `@/api/supabaseClient` pra cá. Tabelas em
// memória em window.__bancoFalso.tabelas (a banca semeia antes de renderizar);
// cada escrita fica em window.__bancoFalso.escritas pra prova enxergar.
// Cobre o que as telas usam: select/eq/neq/in/gte/lte/not/or/order/limit/
// maybeSingle/single, insert, update, upsert, delete. Sem rede, sem RLS.
// ⚠️ lido a cada chamada, não na importação: os imports rodam ANTES do corpo
// da banca, então semear `window.__bancoFalso` depois do import tem que valer.
const banco = () => {
  if (typeof window === 'undefined') return { tabelas: {}, escritas: [] };
  return (window.__bancoFalso ||= { tabelas: {}, escritas: [] });
};

let seq = 1;
const novoId = () => `f${seq++}`;
const tabela = (nome) => (banco().tabelas[nome] ||= []);

class Consulta {
  constructor(nome) { this.nome = nome; this.filtros = []; this.ordens = []; this.lim = null; this.modo = 'select'; this.unico = null; }
  select() { if (this.modo === 'select') this.modo = 'select'; return this; }
  eq(c, v) { this.filtros.push((r) => String(r[c]) === String(v)); return this; }
  neq(c, v) { this.filtros.push((r) => String(r[c]) !== String(v)); return this; }
  in(c, lista) { const s = new Set((lista || []).map(String)); this.filtros.push((r) => s.has(String(r[c]))); return this; }
  gte(c, v) { this.filtros.push((r) => String(r[c]) >= String(v)); return this; }
  lte(c, v) { this.filtros.push((r) => String(r[c]) <= String(v)); return this; }
  gt(c, v) { this.filtros.push((r) => String(r[c]) > String(v)); return this; }
  lt(c, v) { this.filtros.push((r) => String(r[c]) < String(v)); return this; }
  is(c, v) { this.filtros.push((r) => (v === null ? r[c] == null : r[c] === v)); return this; }
  not(c, op, v) { this.filtros.push((r) => !(op === 'is' ? (v === null ? r[c] == null : r[c] === v) : String(r[c]) === String(v))); return this; }
  or() { return this; }
  order(c, o = {}) { this.ordens.push([c, o.ascending === false ? -1 : 1]); return this; }
  limit(n) { this.lim = n; return this; }
  maybeSingle() { this.unico = 'maybe'; return this; }
  single() { this.unico = 'single'; return this; }
  insert(linhas) { this.modo = 'insert'; this.carga = Array.isArray(linhas) ? linhas : [linhas]; return this; }
  upsert(linhas, opts) { this.modo = 'upsert'; this.carga = Array.isArray(linhas) ? linhas : [linhas]; this.conflito = opts?.onConflict || 'id'; return this; }
  update(patch) { this.modo = 'update'; this.carga = patch; return this; }
  delete() { this.modo = 'delete'; return this; }

  _linhas() {
    let ls = tabela(this.nome).filter((r) => this.filtros.every((f) => f(r)));
    for (const [c, dir] of [...this.ordens].reverse()) ls = [...ls].sort((a, b) => (String(a[c] ?? '') < String(b[c] ?? '') ? -dir : String(a[c] ?? '') > String(b[c] ?? '') ? dir : 0));
    if (this.lim != null) ls = ls.slice(0, this.lim);
    return ls;
  }

  _executar() {
    const t = tabela(this.nome);
    if (this.modo === 'insert') {
      const novas = this.carga.map((l) => ({ id: novoId(), ...l }));
      t.push(...novas);
      banco().escritas.push({ tipo: 'insert', tabela: this.nome, linhas: novas });
      return { data: novas, error: null };
    }
    if (this.modo === 'upsert') {
      const ch = this.conflito;
      const saida = [];
      for (const l of this.carga) {
        const i = t.findIndex((r) => String(r[ch]) === String(l[ch]));
        if (i >= 0) { t[i] = { ...t[i], ...l }; saida.push(t[i]); } else { const n = { id: novoId(), ...l }; t.push(n); saida.push(n); }
      }
      banco().escritas.push({ tipo: 'upsert', tabela: this.nome, linhas: saida });
      return { data: saida, error: null };
    }
    if (this.modo === 'update') {
      const alvo = this._linhas();
      for (const r of alvo) Object.assign(r, this.carga);
      banco().escritas.push({ tipo: 'update', tabela: this.nome, patch: this.carga, quantas: alvo.length });
      return { data: alvo, error: null };
    }
    if (this.modo === 'delete') {
      const alvo = this._linhas();
      banco().tabelas[this.nome] = t.filter((r) => !alvo.includes(r));
      banco().escritas.push({ tipo: 'delete', tabela: this.nome, quantas: alvo.length });
      return { data: alvo, error: null };
    }
    const ls = this._linhas();
    if (this.unico) return { data: ls[0] ?? null, error: this.unico === 'single' && !ls.length ? { message: 'sem linha' } : null };
    return { data: ls, error: null };
  }

  then(ok, erro) { return Promise.resolve().then(() => this._executar()).then(ok, erro); }
}

export const supabase = {
  from: (nome) => new Consulta(nome),
  auth: { getUser: async () => ({ data: { user: null } }), getSession: async () => ({ data: { session: null } }) },
  rpc: async () => ({ data: null, error: null }),
  channel: () => ({ on() { return this; }, subscribe() { return this; }, unsubscribe() {} }),
  removeChannel() {},
};
export default supabase;
