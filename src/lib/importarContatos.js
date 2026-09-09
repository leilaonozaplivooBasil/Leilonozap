// 📥 importarContatos — a regra do importador em massa da Lista de Networking.
//
// Fase B do pedido do dono (08/09/2026): "na lista de contatos tenha um campo
// de importação... duas opções, importar lista de contatos pessoais e lista de
// contatos business... sendo opcional a escolha entre quem é um contato de
// negócios e quem é contato pessoal."
//
// Tudo que decide o que entra e o que não entra mora AQUI, fora do React, pra
// poder ser testado sem navegador. A tela só mostra o que esta função separou.
//
// POR QUE SEPARAR EM TRÊS BALDES, E NÃO SÓ IMPORTAR: uma agenda de celular não
// é uma lista de network. Ela tem o SAC do banco, o motoboy, o iFood, contato
// sem número, e o mesmo número repetido três vezes. Importar tudo transformaria
// o Hábito 3 — que é lista QUALIFICADA — num despejo. Então o arquivo entra,
// é separado em [pronto / já na lista / não dá pra usar], e a pessoa confere
// antes de gravar.

import {
  chaveTelefone,
  telefoneBR,
  telefoneParaGravar,
  formatarTelefoneBR,
} from './telefoneBR.js';

/** As duas opções que o dono pediu. `null` = não classificado (o legado). */
export const TIPOS_CONTATO = [
  {
    id: 'pessoal',
    emoji: '🙋',
    label: 'Contatos pessoais',
    ajuda: 'Família, amigos, gente que você conhece da vida.',
  },
  {
    id: 'negocios',
    emoji: '💼',
    label: 'Contatos de negócios',
    ajuda: 'Clientes, fornecedores, parceiros, gente do mercado.',
  },
];

export const tipoContatoValido = (v) => TIPOS_CONTATO.some((t) => t.id === v);
export const tipoContato = (id) => TIPOS_CONTATO.find((t) => t.id === id) || null;

/**
 * Teto por importação. Não é limite de tabela — é limite de CONFERÊNCIA: a
 * tela pede pra pessoa olhar linha por linha antes de gravar, e ninguém
 * confere 5.000 linhas. Passou disso, importa em partes.
 */
export const LIMITE_IMPORTACAO = 1000;

/** Quantos vão por vez pro servidor — mesmo tamanho do lote de produtos. */
export const TAMANHO_DO_LOTE = 25;

const texto = (v) => String(v ?? '').trim();

const normalizarCabecalho = (s) => texto(s)
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '');

// Cabeçalhos que já vimos na prática. Os em inglês são do Google Contacts, que
// exporta em inglês mesmo com a conta em português — é o caminho mais comum de
// quem tem Android.
const COLUNAS = {
  full_name: ['nome', 'nome completo', 'contato', 'name', 'full name', 'display name', 'given name', 'first name'],
  phone: ['telefone', 'celular', 'fone', 'whatsapp', 'numero', 'número', 'phone', 'phone 1 - value', 'mobile', 'tel'],
  email: ['email', 'e-mail', 'e_mail', 'e-mail 1 - value', 'mail'],
};

/** Que campo é esta coluna da planilha? `null` quando não reconhece. */
export function detectarColuna(cabecalho) {
  const h = normalizarCabecalho(cabecalho);
  if (!h) return null;
  // Exato primeiro: "Nome" tem que virar full_name, não casar por pedaço com
  // outra coisa. Só depois cai no "contém" — é ele que pega "Phone 1 - Value".
  for (const [campo, nomes] of Object.entries(COLUNAS)) {
    if (nomes.some((n) => h === normalizarCabecalho(n))) return campo;
  }
  for (const [campo, nomes] of Object.entries(COLUNAS)) {
    if (nomes.some((n) => h.includes(normalizarCabecalho(n)))) return campo;
  }
  return null;
}

/**
 * Adivinha o mapeamento das colunas. A tela deixa corrigir à mão — isto é só
 * o chute inicial, pra quem sobe um Google Contacts não ter que mapear nada.
 * A primeira coluna reconhecida de cada campo ganha: no Google Contacts,
 * "Phone 1 - Value" vem antes de "Phone 2 - Value", e é o número principal.
 */
export function mapearCabecalhos(cabecalhos = []) {
  const mapa = {};
  for (const h of cabecalhos) {
    const campo = detectarColuna(h);
    if (campo && !mapa[campo]) mapa[campo] = h;
  }
  return mapa;
}

/**
 * Lê um .vcf (a agenda exportada do iPhone e do Android).
 *
 * vCard é formato de linha: cada contato vive entre BEGIN:VCARD e END:VCARD,
 * e as chaves vêm com parâmetros colados (`TEL;TYPE=CELL:...`). Só precisamos
 * de três: nome, telefone e e-mail — por isso um leitor de 30 linhas em vez de
 * uma biblioteca nova. O que não for reconhecido é ignorado, não quebra.
 */
export function lerVCard(conteudo) {
  const linhas = String(conteudo ?? '').split(/\r\n|\r|\n/);
  const contatos = [];
  let atual = null;
  for (const linha of linhas) {
    const l = linha.trim();
    if (/^BEGIN:VCARD$/i.test(l)) { atual = { full_name: '', phone: '', email: '' }; continue; }
    if (/^END:VCARD$/i.test(l)) {
      if (atual && (atual.full_name || atual.phone)) contatos.push(atual);
      atual = null;
      continue;
    }
    if (!atual) continue;
    const sep = l.indexOf(':');
    if (sep < 1) continue;
    const chave = l.slice(0, sep).toUpperCase();
    const valor = l.slice(sep + 1).trim();
    if (!valor) continue;
    // `FN` é o nome já pronto pra exibir; `N` é o nome quebrado em pedaços
    // (Sobrenome;Nome;;;) e só serve de reserva quando não veio FN.
    if (chave === 'FN' && !atual.full_name) atual.full_name = valor;
    else if (chave.startsWith('N;') || chave === 'N') {
      if (!atual.full_name) {
        const [sobre, nome] = valor.split(';');
        atual.full_name = [texto(nome), texto(sobre)].filter(Boolean).join(' ');
      }
    } else if (chave === 'TEL' || chave.startsWith('TEL;')) {
      // O primeiro telefone VÁLIDO ganha: a agenda costuma listar o celular
      // primeiro, mas se o primeiro for um ramal quebrado o próximo serve.
      if (!telefoneBR(atual.phone) && valor) atual.phone = valor;
    } else if (chave === 'EMAIL' || chave.startsWith('EMAIL;')) {
      if (!atual.email) atual.email = valor;
    }
  }
  return contatos;
}

/** Parece e-mail? Não valida servidor — só evita gravar lixo no campo. */
const ehEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(texto(v));

/**
 * O Google Contacts junta vários valores da mesma coluna com ` ::: `. Pega o
 * primeiro que for telefone brasileiro de verdade, e não simplesmente o
 * primeiro da lista — muita agenda guarda o fixo antigo na frente do celular.
 */
function primeiroTelefoneUtil(bruto) {
  const partes = texto(bruto).split(/:::|\r?\n/);
  for (const p of partes) if (telefoneBR(p)) return texto(p);
  return texto(partes[0] || '');
}

/**
 * Separa o arquivo lido em três baldes. NÃO grava nada — quem grava é a tela,
 * e só depois da conferência.
 *
 * @param linhas    array de objetos (planilha) ou {full_name, phone, email} (vCard)
 * @param mapa      {full_name, phone, email} → nome da coluna. Vazio no vCard.
 * @param tipo      'pessoal' | 'negocios' | null
 * @param existentes contatos que a pessoa JÁ tem (pra não duplicar)
 *
 * Devolve { prontos, duplicados, invalidos, excedente }.
 */
export function prepararImportacao({ linhas = [], mapa = {}, tipo = null, existentes = [] } = {}) {
  const campo = (linha, nome) => (mapa[nome] ? linha?.[mapa[nome]] : linha?.[nome]);

  // A lista de quem já existe é do PRÓPRIO dono — quem chama passa o escopo
  // dele. Duplicata aqui é "essa pessoa já está na SUA lista", não "alguém da
  // empresa já tem esse contato": a carteira de cada um é separada.
  const jaTenho = new Map();
  for (const c of existentes) {
    const k = chaveTelefone(c?.phone);
    if (k && !jaTenho.has(k)) jaTenho.set(k, c);
  }

  const prontos = [];
  const duplicados = [];
  const invalidos = [];
  const vistosNoArquivo = new Map();

  const usaveis = linhas.slice(0, LIMITE_IMPORTACAO);
  const excedente = Math.max(0, linhas.length - usaveis.length);

  usaveis.forEach((linha, i) => {
    const nome = texto(campo(linha, 'full_name'));
    const foneBruto = primeiroTelefoneUtil(campo(linha, 'phone'));
    const emailBruto = texto(campo(linha, 'email'));
    const original = { linha: i + 1, nome, telefone: foneBruto || '—' };

    const chave = chaveTelefone(foneBruto);
    if (!chave) {
      // Sem telefone utilizável não há Hábito 3: a lista existe pra ligar pras
      // pessoas. Entra no balde do "não dá pra usar", com o motivo na tela.
      invalidos.push({ ...original, motivo: foneBruto ? 'telefone não reconhecido' : 'sem telefone' });
      return;
    }
    if (vistosNoArquivo.has(chave)) {
      duplicados.push({ ...original, motivo: `repetido no arquivo (linha ${vistosNoArquivo.get(chave)})` });
      return;
    }
    vistosNoArquivo.set(chave, i + 1);
    if (jaTenho.has(chave)) {
      const dono = jaTenho.get(chave);
      duplicados.push({ ...original, motivo: `já na sua lista como "${dono.full_name || 'sem nome'}"` });
      return;
    }

    prontos.push({
      chave,
      linha: i + 1,
      // Contato sem nome existe muito em agenda exportada. Em vez de recusar,
      // o número vira o nome — a pessoa reconhece e renomeia depois. Recusar
      // perderia contato bom por causa de um campo em branco.
      full_name: nome || formatarTelefoneBR(foneBruto),
      semNome: !nome,
      phone: telefoneParaGravar(foneBruto),
      telefoneVisivel: formatarTelefoneBR(foneBruto),
      email: ehEmail(emailBruto) ? emailBruto.toLowerCase() : '',
      tipo_contato: tipoContatoValido(tipo) ? tipo : null,
    });
  });

  return { prontos, duplicados, invalidos, excedente };
}

/**
 * O que vai pro banco. Sai daqui SEM created_by_id de propósito: o dono é
 * carimbado pelo servidor (entityWrite), e o que o navegador mandar nesse
 * campo é descartado. Mandar daqui só daria a falsa impressão de que é o
 * navegador quem decide de quem é o contato.
 */
export function paraGravar(pronto) {
  return {
    full_name: pronto.full_name,
    phone: pronto.phone,
    ...(pronto.email ? { email: pronto.email } : {}),
    ...(pronto.tipo_contato ? { tipo_contato: pronto.tipo_contato } : {}),
    status: 'lead',
    source: 'outro',
  };
}

/** Quebra em lotes do tamanho que o servidor aguenta. */
export function emLotes(itens, tamanho = TAMANHO_DO_LOTE) {
  const lotes = [];
  for (let i = 0; i < itens.length; i += tamanho) lotes.push(itens.slice(i, i + tamanho));
  return lotes;
}
