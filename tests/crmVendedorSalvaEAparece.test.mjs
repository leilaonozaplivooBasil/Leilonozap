// "meu nome nao esta na aba de vendedor do crm" + "esta dando erro quando eu tento salvar"
//
// Duas queixas, dois bugs diferentes, o mesmo dia:
//
// 1) O seletor "Vendedor responsável" lia SÓ a tabela `sellers` — lista herdada
//    da Base44, mantida na mão, cuja linha mais nova é de 03/04/2026. Em
//    02/09 havia 29 nomes lá contra 60 pessoas com cargo comercial no cadastro,
//    e só 2 nomes em comum: 58 das 60 pessoas que vendem não apareciam.
//
// 2) Salvar cliente só funcionava para OPERADOR (admin ou cargo de estoque).
//    Quem não era caía numa gravação anônima que a RLS de `customers` recusa —
//    a tabela inteira tinha 4 linhas, e uma só criada desde fevereiro, por um
//    admin. O CRM tinha sido aberto para a rede em 30/08 (DIR-24 Fase 2) e o
//    botão de salvar ficou quebrado para todo mundo que não fosse admin.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { montarVendedores, ehComercial, chaveNome, CARGOS_COMERCIAIS } from '../src/lib/vendedoresDoCrm.js';

const ler = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

// ─────────────────────────── 1. A LISTA ───────────────────────────

// Retrato reduzido do banco em 02/09: a lista antiga tem nomes que não são
// pessoa, e o cadastro tem gente comercial que nunca entrou nela.
const SELLERS = [
  { id: 's1', name: 'CRISTIANO JORGE RIBEIRO' },
  { id: 's2', name: 'LOJA BANGU' },
  { id: 's3', name: ' LEILÕES CASA E VIDEO ' },   // espaço sobrando, de verdade
  { id: 's4', name: 'IARA FIGUEIREDO TEIXEIRA' },
];
const USUARIOS = [
  { id: 'u1', full_name: 'Emannuel Alves de Lima', primary_career_level: 'diretoria_operacao',
    career_levels: ['usuario', 'licenciado', 'diretoria_operacao'], active: true },
  { id: 'u2', full_name: 'Ailton Avilla', primary_career_level: 'vendedor',
    career_levels: ['usuario', 'vendedor'], active: true },
  { id: 'u3', full_name: 'Comprador Comum', primary_career_level: 'usuario',
    career_levels: ['usuario'], active: true },
  { id: 'u4', full_name: 'Vim pelo wendrel', primary_career_level: 'influenciador',
    career_levels: ['influenciador'], active: true },
  { id: 'u5', full_name: 'Vendedora Desligada', primary_career_level: 'vendedor',
    career_levels: ['vendedor'], active: false },
  { id: 'u6', full_name: 'iara figueiredo teixeira', primary_career_level: 'executivo_conta',
    career_levels: ['executivo_conta'], active: true },  // mesma pessoa da lista antiga
];

test('o Emannuel aparece na lista', () => {
  const nomes = montarVendedores(SELLERS, USUARIOS).map((v) => v.name);
  assert.ok(nomes.includes('Emannuel Alves de Lima'), 'o nome dele continua fora do seletor');
});

test('os outros vendedores da rede também aparecem', () => {
  const nomes = montarVendedores(SELLERS, USUARIOS).map((v) => v.name);
  assert.ok(nomes.includes('Ailton Avilla'));
});

test('ninguém que já estava na lista some', () => {
  // `assigned_seller` guarda TEXTO. Tirar um nome daqui deixa órfão o cliente
  // que aponta pra ele — inclusive os nomes que não são pessoa.
  const nomes = montarVendedores(SELLERS, USUARIOS).map((v) => chaveNome(v.name));
  for (const s of SELLERS) assert.ok(nomes.includes(chaveNome(s.name)), `sumiu: ${s.name}`);
});

test('a mesma pessoa nas duas fontes vira UMA opção', () => {
  const nomes = montarVendedores(SELLERS, USUARIOS).map((v) => chaveNome(v.name));
  const iaras = nomes.filter((n) => n === 'IARA FIGUEIREDO TEIXEIRA');
  assert.equal(iaras.length, 1, 'nome duplicado: o CRM gravaria dois vendedores para a mesma pessoa');
});

test('comprador comum não vira vendedor responsável', () => {
  const nomes = montarVendedores(SELLERS, USUARIOS).map((v) => v.name);
  assert.ok(!nomes.includes('Comprador Comum'));
});

test('influenciador fica de fora — é o que enchia o seletor de cadastro de teste', () => {
  // Em 02/09 havia SEIS contas chamadas "Vim pelo wendrel", todas influenciador.
  const nomes = montarVendedores(SELLERS, USUARIOS).map((v) => v.name);
  assert.ok(!nomes.includes('Vim pelo wendrel'));
  assert.ok(!CARGOS_COMERCIAIS.includes('influenciador'));
  assert.ok(!CARGOS_COMERCIAIS.includes('usuario'));
});

test('quem foi desativado não aparece', () => {
  const nomes = montarVendedores(SELLERS, USUARIOS).map((v) => v.name);
  assert.ok(!nomes.includes('Vendedora Desligada'));
});

test('em ordem alfabética, e aguenta entrada vazia', () => {
  const nomes = montarVendedores(SELLERS, USUARIOS).map((v) => v.name);
  assert.deepEqual(nomes, [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR')));
  assert.deepEqual(montarVendedores(), []);
  assert.deepEqual(montarVendedores(null, undefined), []);
});

test('cargo comercial é lido dos dois campos, não só de um', () => {
  assert.ok(ehComercial({ career_levels: ['usuario', 'vendedor'] }));
  assert.ok(ehComercial({ primary_career_level: 'diretoria_operacao', career_levels: [] }));
  assert.ok(!ehComercial({ career_levels: ['usuario'], primary_career_level: 'usuario' }));
  assert.ok(!ehComercial({}));
});

test('a tela usa a união, não mais só a tabela sellers', () => {
  const tela = ler('../src/components/licensing/CentralVendas/CrmClientesTab.jsx');
  assert.match(tela, /montarVendedores\(sellers, appUsers\)/);
  assert.ok(!/\{sellers\.map\(\(sel\)/.test(tela), 'o seletor voltou a ler só a tabela sellers');
});

// ─────────────────────────── 2. O SALVAMENTO ───────────────────────────

const rota = ler('../api/functions/entityWrite.js');
const adapter = ler('../src/api/plataformaAdapter.js');

test('quem não é operador deixa de cair na gravação anônima', () => {
  // Era aqui que morria: `if (!op) return { _skip: true }` mandava a gravação
  // direto do navegador pro PostgREST como `anon`, e a RLS recusa.
  assert.match(adapter, /const TABELAS_CRM = \['customers'\]/);
  assert.match(adapter, /if \(!ator\) return \{ _skip: true \}/);
  assert.ok(!/^\s*if \(!op\) return \{ _skip: true \};/m.test(adapter),
    'voltou a barrar todo não-operador antes de chegar na rota');
});

test('a rota do servidor é a mesma — freio de rajada e cooldown continuam valendo', () => {
  assert.match(adapter, /actorId: ator\.id, table, action, id, payload/);
  assert.match(adapter, /_avisaRajada\(ator\.id\)/);
});

test('o servidor aceita cargo comercial, e só no CRM', () => {
  assert.match(rota, /const podeCrm = !ok && ehComercial && CRM_TABLES\.has\(table\) && action !== 'delete'/);
  assert.match(rota, /const CRM_TABLES = new Set\(\['customers'\]\)/);
  // produto, venda e leilão continuam sendo só de operador
  for (const t of ['products', 'catalog_sales', 'auctions']) {
    assert.ok(!new RegExp(`CRM_TABLES = new Set\\(\\[[^\\]]*'${t}'`).test(rota), `${t} entrou no CRM`);
  }
});

test('cargo comercial NÃO pode apagar cliente', () => {
  assert.match(rota, /action !== 'delete'/);
});

test('vendedor só edita o cliente que ele mesmo criou', () => {
  // Sem isto, um vendedor mexe na carteira do outro.
  assert.match(rota, /select=created_by_id/);
  assert.match(rota, /Este cadastro é de outra pessoa da rede/);
});

test('o dono é carimbado pelo servidor, não pelo navegador', () => {
  // É o campo que decide quem pode editar depois — não pode vir do cliente.
  assert.match(rota, /body\.payload\.created_by_id = eu/);
  assert.match(rota, /const eu = _ses\.userId \|\| actorId/);
});

test('o cargo é lido do banco, e dos dois campos', () => {
  assert.match(rota, /select=id,role,career_levels,primary_career_level/);
  assert.match(rota, /actor\.primary_career_level,/);
});

test('operador continua podendo tudo que podia', () => {
  // A trava nova só roda quando o caminho de operador NÃO liberou (`!ok`).
  assert.match(rota, /const podeCrm = !ok &&/);
  assert.match(rota, /if \(!ok && !podeCrm\) return res\.status\(403\)/);
});
