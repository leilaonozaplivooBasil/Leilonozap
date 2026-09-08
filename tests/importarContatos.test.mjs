// 📥 Fase B do importador de contatos (08/09/2026).
// Uma agenda de celular não é uma lista de network: tem SAC de banco, iFood,
// contato sem número e o mesmo número repetido três vezes. Estes testes seguram
// a separação em três baldes (pronto / já na lista / não dá pra usar), que é o
// que impede o Hábito 3 — lista QUALIFICADA — de virar despejo.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TIPOS_CONTATO,
  LIMITE_IMPORTACAO,
  tipoContatoValido,
  detectarColuna,
  mapearCabecalhos,
  lerVCard,
  prepararImportacao,
  paraGravar,
  emLotes,
} from '../src/lib/importarContatos.js';

const preparar = (args) => prepararImportacao(args);

test('as duas opções são exatamente as que o dono pediu', () => {
  assert.deepEqual(TIPOS_CONTATO.map((t) => t.id), ['pessoal', 'negocios']);
  assert.equal(tipoContatoValido('pessoal'), true);
  assert.equal(tipoContatoValido('negocios'), true);
  assert.equal(tipoContatoValido('business'), false, 'o valor gravado é o do banco, não o rótulo da tela');
  assert.equal(tipoContatoValido(null), false);
});

test('a escolha é OPCIONAL — sem tipo o contato entra como não classificado', () => {
  const { prontos } = preparar({
    linhas: [{ full_name: 'Ana', phone: '11988887777' }],
    tipo: null,
  });
  assert.equal(prontos.length, 1);
  assert.equal(prontos[0].tipo_contato, null);
  assert.ok(!('tipo_contato' in paraGravar(prontos[0])), 'não classificado não manda a coluna');
});

test('o tipo escolhido gruda em todos os contatos daquela importação', () => {
  const { prontos } = preparar({
    linhas: [{ full_name: 'Ana', phone: '11988887777' }, { full_name: 'Beto', phone: '21977776666' }],
    tipo: 'negocios',
  });
  assert.equal(prontos.length, 2);
  assert.ok(prontos.every((p) => p.tipo_contato === 'negocios'));
  assert.equal(paraGravar(prontos[0]).tipo_contato, 'negocios');
});

test('quem já está na minha lista não entra de novo', () => {
  const existentes = [{ full_name: 'Ana Maria', phone: '11988887777' }];
  const { prontos, duplicados } = preparar({
    // o MESMO número, escrito do jeito da agenda do celular
    linhas: [{ full_name: 'Ana', phone: '+55 (11) 98888-7777' }, { full_name: 'Novo', phone: '11955554444' }],
    existentes,
  });
  assert.equal(prontos.length, 1);
  assert.equal(prontos[0].full_name, 'Novo');
  assert.equal(duplicados.length, 1);
  assert.match(duplicados[0].motivo, /já na sua lista como "Ana Maria"/);
});

test('o legado sem nono dígito é reconhecido como a mesma pessoa', () => {
  // 1 dos 26 contatos da base está assim. Sem isto, importar a agenda duplica.
  const { prontos, duplicados } = preparar({
    linhas: [{ full_name: 'Carlos', phone: '11988887777' }],
    existentes: [{ full_name: 'Carlos', phone: '1188887777' }],
  });
  assert.equal(prontos.length, 0);
  assert.equal(duplicados.length, 1);
});

test('número repetido dentro do próprio arquivo entra uma vez só', () => {
  const { prontos, duplicados } = preparar({
    linhas: [
      { full_name: 'Ana', phone: '11988887777' },
      { full_name: 'Ana Casa', phone: '(11) 98888-7777' },
      { full_name: 'Beto', phone: '11955554444' },
    ],
  });
  assert.equal(prontos.length, 2);
  assert.equal(duplicados.length, 1);
  assert.match(duplicados[0].motivo, /repetido no arquivo \(linha 1\)/);
});

test('lixo de agenda vai pro balde de "não dá pra usar", com o motivo', () => {
  const { prontos, invalidos } = preparar({
    linhas: [
      { full_name: 'SAC Banco', phone: '0800 123 4567' },
      { full_name: 'iFood', phone: '4004' },
      { full_name: 'Sem número', phone: '' },
      { full_name: 'Gente de verdade', phone: '11988887777' },
    ],
  });
  assert.equal(prontos.length, 1);
  assert.equal(invalidos.length, 3);
  assert.equal(invalidos.find((i) => i.nome === 'Sem número').motivo, 'sem telefone');
  assert.equal(invalidos.find((i) => i.nome === 'iFood').motivo, 'telefone não reconhecido');
});

test('contato sem nome não é perdido — o número vira o nome', () => {
  // Agenda exportada tem MUITO contato só com número. Recusar perderia
  // contato bom por causa de um campo em branco.
  const { prontos } = preparar({ linhas: [{ full_name: '', phone: '11988887777' }] });
  assert.equal(prontos.length, 1);
  assert.equal(prontos[0].full_name, '(11) 98888-7777');
  assert.equal(prontos[0].semNome, true, 'a tela precisa saber pra destacar');
});

test('o telefone é gravado normalizado, não como veio', () => {
  const { prontos } = preparar({ linhas: [{ full_name: 'Ana', phone: '+55 (11) 8888-7777' }] });
  assert.equal(paraGravar(prontos[0]).phone, '11988887777');
});

test('e-mail torto não é gravado', () => {
  const { prontos } = preparar({
    linhas: [
      { full_name: 'Ana', phone: '11988887777', email: 'ANA@Exemplo.COM' },
      { full_name: 'Beto', phone: '11955554444', email: 'nao é email' },
    ],
  });
  assert.equal(paraGravar(prontos[0]).email, 'ana@exemplo.com', 'e-mail entra em caixa baixa');
  assert.ok(!('email' in paraGravar(prontos[1])), 'texto que não é e-mail não vira e-mail');
});

test('o dono NÃO é mandado pelo navegador', () => {
  // Quem carimba created_by_id é o servidor (entityWrite). Mandar daqui daria
  // a falsa impressão de que o navegador decide de quem é o contato.
  const { prontos } = preparar({ linhas: [{ full_name: 'Ana', phone: '11988887777' }], tipo: 'pessoal' });
  const linha = paraGravar(prontos[0]);
  assert.ok(!('created_by_id' in linha));
  assert.ok(!('created_by' in linha));
});

test('acima do teto, o excedente é avisado em vez de entrar calado', () => {
  const muitos = Array.from({ length: LIMITE_IMPORTACAO + 5 }, (_, i) => ({
    full_name: `P${i}`,
    // números distintos e válidos: DDD 11, celular 9 + 8 dígitos
    phone: `119${String(60000000 + i)}`,
  }));
  const r = preparar({ linhas: muitos });
  assert.equal(r.excedente, 5);
  assert.equal(r.prontos.length + r.duplicados.length + r.invalidos.length, LIMITE_IMPORTACAO);
});

// ── leitura dos formatos ────────────────────────────────────────────────────

test('reconhece as colunas do Google Contacts (que exporta em inglês)', () => {
  const mapa = mapearCabecalhos(['Name', 'Given Name', 'Phone 1 - Value', 'Phone 2 - Value', 'E-mail 1 - Value']);
  assert.equal(mapa.full_name, 'Name');
  assert.equal(mapa.phone, 'Phone 1 - Value', 'o primeiro telefone é o principal');
  assert.equal(mapa.email, 'E-mail 1 - Value');
});

test('reconhece planilha em português', () => {
  const mapa = mapearCabecalhos(['Nome Completo', 'WhatsApp', 'E-mail']);
  assert.equal(mapa.full_name, 'Nome Completo');
  assert.equal(mapa.phone, 'WhatsApp');
  assert.equal(mapa.email, 'E-mail');
});

test('coluna desconhecida não é chutada', () => {
  assert.equal(detectarColuna('Aniversário'), null);
  assert.equal(detectarColuna(''), null);
  assert.equal(mapearCabecalhos(['Coluna A', 'Coluna B']).phone, undefined);
});

test('lê o .vcf do celular', () => {
  const vcf = [
    'BEGIN:VCARD', 'VERSION:3.0',
    'FN:Ana Maria', 'TEL;TYPE=CELL:+55 11 98888-7777', 'EMAIL;TYPE=INTERNET:ana@exemplo.com',
    'END:VCARD',
    'BEGIN:VCARD', 'VERSION:3.0',
    'N:Souza;Beto;;;', 'TEL:(21) 97777-6666',
    'END:VCARD',
  ].join('\r\n');
  const contatos = lerVCard(vcf);
  assert.equal(contatos.length, 2);
  assert.equal(contatos[0].full_name, 'Ana Maria');
  assert.equal(contatos[0].email, 'ana@exemplo.com');
  assert.equal(contatos[1].full_name, 'Beto Souza', 'sem FN, monta o nome pelo N');

  const { prontos } = preparar({ linhas: contatos, tipo: 'pessoal' });
  assert.equal(prontos.length, 2);
  assert.equal(prontos[0].phone, '11988887777');
});

test('no vCard, o primeiro telefone VÁLIDO ganha — não o primeiro da lista', () => {
  // Muita agenda guarda um ramal ou um número quebrado antes do celular.
  const vcf = [
    'BEGIN:VCARD', 'FN:Carlos', 'TEL;TYPE=WORK:4004', 'TEL;TYPE=CELL:11988887777', 'END:VCARD',
  ].join('\n');
  assert.equal(lerVCard(vcf)[0].phone, '11988887777');
});

test('vCard sem telefone nenhum não vira contato pronto', () => {
  const vcf = 'BEGIN:VCARD\nFN:Só nome\nEND:VCARD';
  const contatos = lerVCard(vcf);
  assert.equal(contatos.length, 1, 'o leitor devolve, pra tela poder dizer por que não entrou');
  assert.equal(preparar({ linhas: contatos }).prontos.length, 0);
  assert.equal(preparar({ linhas: contatos }).invalidos[0].motivo, 'sem telefone');
});

test('arquivo vazio ou sujo não quebra o leitor', () => {
  for (const v of ['', null, undefined, 'isto não é um vcard']) {
    assert.deepEqual(lerVCard(v), []);
  }
  assert.deepEqual(preparar({}).prontos, []);
  assert.deepEqual(preparar({ linhas: [] }).invalidos, []);
});

test('o Google junta vários números na mesma célula com :::', () => {
  const { prontos } = preparar({
    linhas: [{ Nome: 'Ana', 'Phone 1 - Value': '4004 ::: +55 11 98888-7777' }],
    mapa: { full_name: 'Nome', phone: 'Phone 1 - Value' },
  });
  assert.equal(prontos.length, 1);
  assert.equal(prontos[0].phone, '11988887777', 'pega o que é telefone de verdade, não o primeiro da célula');
});

test('vai pro servidor em lotes de 25', () => {
  const itens = Array.from({ length: 57 }, (_, i) => i);
  const lotes = emLotes(itens);
  assert.deepEqual(lotes.map((l) => l.length), [25, 25, 7]);
  assert.equal(lotes.flat().length, 57, 'nenhum item se perde na quebra');
  assert.deepEqual(emLotes([]), []);
});

// ── a ligação da tela ───────────────────────────────────────────────────────
// A regra acima pode estar perfeita e o botão não existir. Estas assertivas
// seguram o caminho: botão na Lista de Networking → modal → gravação em lote.
import { readFileSync } from 'node:fs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
/** Tira comentários pra assertiva não casar com a explicação. */
const semComentarios = (txt) =>
  txt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const METODO = semComentarios(ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx'));
const TAB = semComentarios(ler('../src/components/licensing/CentralVendas/CrmClientesTab.jsx'));
const MODAL = semComentarios(ler('../src/components/licensing/CentralVendas/CrmImportarContatosModal.jsx'));

test('o botão de importar existe na Lista de Networking', () => {
  assert.match(METODO, /onImportarContatos/, 'a prop não chegou no CrmMetodo');
  assert.match(METODO, /Importar contatos/);
  // tem que estar no painel do Hábito 3, junto de "Adicionar pessoa"
  const habito3 = METODO.slice(METODO.indexOf("painel === 'lista'"));
  assert.ok(
    habito3.indexOf('Importar contatos') < habito3.indexOf("painel === 'contato'"),
    'o botão saiu do painel da Lista de Networking',
  );
});

test('na visão de time o botão some — não se importa pra carteira alheia', () => {
  assert.match(TAB, /onImportarContatos=\{[\s\S]{0,80}?visao\.metodoTudo \? null :/);
  assert.match(METODO, /\{onImportarContatos && \(/, 'sem a guarda, o botão aparece mesmo sem handler');
});

test('a dedupe é contra a MINHA lista, não a carteira toda', () => {
  assert.match(TAB, /existentes=\{metodoEscopo\.clientes\}/);
});

test('o modal é ALCANÇÁVEL de onde o botão vive — não dentro da aba Clientes', () => {
  // 🔴 09/09 — o bug que passou pra produção. O modal estava renderizado
  // dentro de <TabsContent value="customers">, que só existe quando
  // secaoAtiva === 'acompanhamento'; na Lista de Networking aquele bloco está
  // `hidden` e o Radix desmonta a aba inativa. O clique mudava o estado e não
  // havia modal montado: botão sem efeito, sem erro, sem log.
  //
  // A assertiva antiga ("o modal está ligado com as props certas") passava
  // verde com o bug em pé, porque ligação existir não é ligação alcançável.
  // Esta cobra o LUGAR: o modal tem que estar antes do <Tabs, no mesmo nível
  // do CrmMetodo, que é quem tem o botão.
  const modal = TAB.indexOf('<CrmImportarContatosModal');
  const metodo = TAB.indexOf('<CrmMetodo');
  const abas = TAB.indexOf('<Tabs value={activeTab}');
  assert.ok(modal > 0, 'o modal sumiu da tela');
  assert.ok(modal > metodo, 'o modal tem que vir depois do CrmMetodo, no mesmo nível');
  assert.ok(
    modal < abas,
    'o modal voltou pra dentro do bloco de abas — ali ele não existe na Lista de Networking',
  );
});

test('a gravação vai em lote e conta o que o banco confirmou', () => {
  assert.match(TAB, /for \(const lote of emLotes\(linhas\)\)/);
  assert.match(TAB, /Customer\.bulkCreate\(lote\)/);
  assert.match(TAB, /criados \+= Array\.isArray\(r\) \? r\.length : lote\.length/);
  assert.match(TAB, /await loadCustomers\(\)/, 'sem recarregar, a lista não mostra o que entrou');
});

test('a tela NÃO manda o dono — quem carimba é o servidor', () => {
  const handler = TAB.slice(TAB.indexOf('handleImportarContatos'), TAB.indexOf('handleQualificarContato'));
  assert.ok(!/created_by_id/.test(handler), 'a tela voltou a mandar created_by_id');
});

test('erro real do servidor chega na tela, não vira "erro ao importar"', () => {
  // Engolir o motivo já custou tempo de suporte antes: "Sem permissão" (cargo
  // sem CRM) é problema completamente diferente de rede caída.
  assert.match(TAB, /if \(!criados && ultimoErro\) throw ultimoErro/);
  assert.match(MODAL, /err\?\.message \|\|/);
});

test('o modal deixa desmarcar antes de gravar', () => {
  assert.match(MODAL, /type="checkbox"/);
  assert.match(MODAL, /desmarcados/);
  assert.match(MODAL, /Desmarcar todos/);
});

test('o modal aceita os três formatos', () => {
  assert.match(MODAL, /accept="\.vcf,\.csv,\.xlsx,\.xls"/);
  assert.match(MODAL, /lerVCard/);
  assert.match(MODAL, /XLSX\.read/);
});
