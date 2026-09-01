// 01/09/2026 — "Estou tentando mudar a categoria de um produto e não estou vendo
// essa opção" + "gostaria de importar imagens do produto".
//
// Ela não achava porque NÃO EXISTIA: nenhuma tela do sistema deixava um humano
// definir a categoria de um produto, e a de imagem no Estoque era só leitura.
//
// O conserto atravessa TRÊS camadas, e falhar em qualquer uma reproduz o mesmo
// sintoma — campo que parece funcionar e não grava. Estes testes trancam as três:
//   1. TELA     — o campo existe e o formulário carrega/salva o valor
//   2. SERVIDOR — productAdminAction aceita `category_id` (fora da lista, descarta calado)
//   3. BANCO    — a migração cria a coluna, com nome de arquivo que o CLI não pula
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const ler = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const estoque = ler('src/pages/ProductManagement.jsx');
const rota = ler('api/functions/productAdminAction.js');
const catalogo = ler('src/pages/AddCatalogProduct.jsx');

describe('camada 1 — a tela do Estoque (a do print)', () => {
  test('🔴 o pedido: existe um campo de Categoria no formulário', () => {
    assert.match(estoque, /<Label className="text-gray-300">Categoria<\/Label>/);
    assert.match(estoque, /value=\{formData\.category_id \|\| ''\}/);
  });

  test('🔴 o pedido: dá para adicionar fotos, não só olhar', () => {
    assert.match(estoque, /Adicionar fotos/);
    assert.match(estoque, /integrations\.Core\.UploadFile/);
    assert.match(estoque, /type="file"[\s\S]{0,120}multiple/);
  });

  test('o formulário CARREGA a categoria e as fotos do produto ao editar', () => {
    // Sem isto o modal abriria com categoria vazia e sem as fotos existentes —
    // e salvar apagaria as duas coisas.
    const i = estoque.indexOf('const handleEdit = (product)');
    const bloco = estoque.slice(i, i + 1800);
    assert.match(bloco, /category_id: product\.category_id \|\| ''/);
    assert.match(bloco, /image_urls: Array\.isArray\(product\.image_urls\)/);
  });

  test('"sem categoria" grava NULL, não string vazia', () => {
    // A coluna é TEXT: '' não é nulo pro banco, e toda contagem de "Sem Categoria"
    // e o filtro da vitrine olham NULL.
    assert.match(estoque, /category_id: formData\.category_id \|\| null/);
  });

  test('categoria é OPCIONAL — nunca bloqueia salvar', () => {
    const i = estoque.indexOf('<Label className="text-gray-300">Categoria</Label>');
    const bloco = estoque.slice(i, i + 900);
    assert.ok(!/\brequired\b/.test(bloco), 'obrigatória travaria a edição de todo produto legado');
    assert.match(bloco, /— sem categoria —/, 'precisa da opção explícita de não classificar');
  });

  test('se a lista de categorias falhar, ainda dá pra salvar o produto', () => {
    // Dropdown com problema não pode travar cadastro de produto.
    assert.match(estoque, /setCategoriasErro\(true\)/);
    assert.match(estoque, /disabled=\{categoriasErro\}/);
    assert.match(estoque, /pode salvar o produto normalmente/);
  });

  test('só categorias principais e ativas entram na lista', () => {
    // A vitrine filtra por categoria PRINCIPAL; subcategoria aqui seria ruído.
    assert.match(estoque, /!c\.parent_category_id && c\.is_active !== false/);
  });
});

describe('camada 2 — a rota do servidor', () => {
  const listaPermitida = () => {
    const m = rota.match(/const ALLOWED = \[([\s\S]*?)\];/);
    assert.ok(m, 'não achei a lista ALLOWED');
    return (m[1].match(/'([a-z_]+)'/g) || []).map((s) => s.replace(/'/g, ''));
  };

  test('🔴 category_id está liberado — fora da lista, o campo é descartado calado', () => {
    assert.ok(listaPermitida().includes('category_id'));
  });

  test('image_urls continua liberado', () => {
    assert.ok(listaPermitida().includes('image_urls'));
  });

  test('a lista branca continua existindo — ela é a proteção, não um estorvo', () => {
    // Se alguém trocar o filtro por "aceita tudo", qualquer tela passaria a poder
    // gravar qualquer coluna de products pela rota de service_role.
    assert.match(rota, /if \(ALLOWED\.includes\(k\)\)/);
  });
});

describe('camada 3 — o banco', () => {
  // Procura pelo CONTEÚDO, não pelo nome exato: se alguém renomear o arquivo (o
  // que é legítimo), o teste continua valendo e a falha diz o que falta — em vez
  // de um ENOENT que não explica nada a quem tropeçar nisto daqui a meses.
  const pasta = new URL('../supabase/migrations/', import.meta.url);
  const arquivo = readdirSync(pasta).find((f) => f.endsWith('.sql') && /products[\s\S]{0,200}category_id/i.test(readFileSync(new URL(f, pasta), 'utf8')));
  assert.ok(arquivo, 'nenhuma migração cria products.category_id — sem a coluna, o campo da tela grava no vazio');
  const sql = readFileSync(new URL(arquivo, pasta), 'utf8');

  test('🔴 a migração cria a coluna, e é idempotente', () => {
    // products.category_id não aparece em NENHUMA migração deste repositório,
    // mas o código lê a coluna e há aviso de 08/08 dizendo que ela existe no
    // banco. IF NOT EXISTS deixa o conserto seguro nos dois cenários.
    assert.match(sql, /ALTER TABLE public\.products/);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS category_id TEXT/);
  });

  test('o nome do arquivo é só dígitos — senão o CLI pula em silêncio', () => {
    // Foi assim que a tabela do Heloim nunca existiu em produção.
    assert.match(arquivo, /^\d+_/);
  });

  test('a migração está de fato na pasta', () => {
    assert.ok(readdirSync(new URL('../supabase/migrations/', import.meta.url)).includes(arquivo));
  });

  test('nunca escrever na coluna `category` — foi o acidente de 08/08/2026', () => {
    // Pedir `category` (que não existe) faz o PostgREST recusar a operação
    // inteira. A vitrine do balcão apareceu VAZIA com 2.582 produtos em estoque.
    for (const [nome, fonte] of [['Estoque', estoque], ['AddCatalogProduct', catalogo], ['rota', rota]]) {
      assert.ok(!/(^|[^_a-z])category:\s*formData/.test(fonte), `${nome} está gravando "category" em vez de "category_id"`);
    }
  });
});

describe('o vazamento do AddCatalogProduct', () => {
  test('🔴 a categoria escolhida agora VAI para o banco', () => {
    // A tela tem os seletores, a IA classifica e escreve "✅ Preenchido
    // automaticamente! Categoria: X › Y" — e o pacote de gravação não levava o
    // campo. A pessoa escolhia, via a confirmação, salvava, e nada era gravado.
    const i = catalogo.indexOf('const productData = {');
    const pacote = catalogo.slice(i, catalogo.indexOf('};', i));
    assert.match(pacote, /category_id: formData\.category \|\| null/);
  });

  test('a tela continua tendo o seletor que alimenta esse campo', () => {
    assert.match(catalogo, /handleInputChange\('category', e\.target\.value\)/);
  });
});
