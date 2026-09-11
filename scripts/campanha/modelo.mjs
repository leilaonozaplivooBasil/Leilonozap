// ✉️ O corpo da mensagem — e-mail e SMS.
//
// Só monta texto. Não fala com banco nem com internet, para poder ser testado.
//
// Decisões de estrutura que estão aqui de propósito:
//
// 1. TODO e-mail sai com versão em texto puro junto do HTML. Provedor que recebe
//    só HTML já trata como sinal de spam, e o Gmail usa o texto no preview.
// 2. O assunto NÃO leva caixa alta nem exclamação repetida — os dois campeões de
//    filtro de spam em disparo em massa.
// 3. Tem link de descadastro em toda mensagem, e o cabeçalho List-Unsubscribe
//    (montado no disparar.mjs). Sem isso, campanha de marketing vira denúncia.
// 4. A imagem tem alt e o botão é HTML puro, não imagem — metade dos clientes de
//    e-mail bloqueia imagem por padrão e o botão precisa sobreviver a isso.

const SITE = 'https://leilaonozap.net';

/** Página do lote dentro da plataforma. */
export function urlDoLeilao(id, site = SITE) {
  return `${site}/AuctionRoom?id=${encodeURIComponent(String(id))}`;
}

/** Link de saída da lista, com o e-mail assinado pelo disparar.mjs. */
export function urlDeDescadastro(email, token, site = SITE) {
  const qs = new URLSearchParams({ email: String(email), t: String(token) });
  return `${site}/api/functions/descadastrar?${qs}`;
}

/** R$ 1.234,50 — sem depender de locale do sistema operacional. */
export function emReais(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return 'R$ 0,00';
  const [inteiro, centavos] = Math.abs(n).toFixed(2).split('.');
  const comPonto = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${n < 0 ? '-' : ''}R$ ${comPonto},${centavos}`;
}

/** "hoje às 20h15" / "amanhã às 09h00" / "sábado, 13/09 às 08h49". */
export function quandoEncerra(fim, agora = new Date()) {
  // 🔴 `new Date(null)` NÃO é data inválida: vale 01/01/1970. Sem esta linha,
  // leilão sem prazo no banco saía no e-mail como "quarta-feira, 31/12 às 21h00".
  if (fim === null || fim === undefined || fim === '') return '';
  const d = fim instanceof Date ? fim : new Date(fim);
  if (Number.isNaN(d.getTime())) return '';

  const fmt = (opcoes) =>
    new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', ...opcoes }).format(d);
  const hora = fmt({ hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
  const dia = (x) =>
    new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short' }).format(x);

  const amanha = new Date(agora.getTime() + 86400000);
  if (dia(d) === dia(agora)) return `hoje às ${hora}`;
  if (dia(d) === dia(amanha)) return `amanhã às ${hora}`;
  return `${fmt({ weekday: 'long' })}, ${fmt({ day: '2-digit', month: '2-digit' })} às ${hora}`;
}

/** Primeiro nome, com inicial maiúscula. Vazio quando o cadastro não tem nome. */
export function primeiroNome(nome) {
  const limpo = String(nome ?? '').trim().replace(/\s+/g, ' ');
  if (!limpo) return '';
  const [primeiro] = limpo.split(' ');
  // Cadastros vindos de indicação têm "nome" que é recado ("Vim pelo wendrel").
  // Nesses casos é melhor não chamar ninguém pelo nome do que chamar errado.
  if (/^(vim|indicado|indica[cç][aã]o|parceiro|teste|qa)$/i.test(primeiro)) return '';
  if (primeiro.length < 2 || /\d/.test(primeiro)) return '';
  return primeiro.charAt(0).toLocaleUpperCase('pt-BR') + primeiro.slice(1).toLocaleLowerCase('pt-BR');
}

export function escaparHtml(txt) {
  return String(txt ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Assunto do e-mail. Curto, com o preço e a hora — é o que faz abrir.
 * Fica abaixo de 60 caracteres sempre que o título do lote permite, porque é
 * onde o Gmail no celular corta.
 */
export function assunto(destaque) {
  const titulo = String(destaque?.title ?? '').trim();
  const curto = titulo.length > 28 ? `${titulo.slice(0, 27).trimEnd()}…` : titulo;
  return `${curto} está em ${emReais(destaque?.current_price)} — encerra ${quandoEncerra(destaque?.end_time)}`;
}

/** Linha de prévia, que aparece na caixa de entrada depois do assunto. */
export function previa(destaque, outros = []) {
  const resto = outros.length
    ? ` e mais ${outros.length} ${outros.length === 1 ? 'lote fechando' : 'lotes fechando'} hoje.`
    : '.';
  return `Lance atual de ${emReais(destaque?.current_price)}${resto} Entre e dê o seu.`;
}

/**
 * Versão em texto puro. Vai junto do HTML em todo envio.
 */
export function corpoTexto({ contato, destaque, outros = [], linkSaida, site = SITE }) {
  const nome = primeiroNome(contato?.nome);
  const linhas = [
    nome ? `${nome}, o leilão de hoje fecha daqui a pouco.` : 'O leilão de hoje fecha daqui a pouco.',
    '',
    `${destaque.title}`,
    `Lance atual: ${emReais(destaque.current_price)}`,
    `Encerra: ${quandoEncerra(destaque.end_time)}`,
    `Dar lance: ${urlDoLeilao(destaque.id, site)}`,
  ];

  if (outros.length) {
    linhas.push('', 'Também fechando:');
    for (const o of outros) {
      linhas.push(`- ${o.title} — ${emReais(o.current_price)} (${quandoEncerra(o.end_time)})`);
      linhas.push(`  ${urlDoLeilao(o.id, site)}`);
    }
  }

  linhas.push(
    '',
    'Quem dá o maior lance quando o cronômetro zera leva o produto.',
    'O pagamento sai do saldo da sua carteira na plataforma.',
    '',
    '---',
    'Você recebeu este e-mail porque tem cadastro no Leilão NoZap.',
    `Para não receber mais: ${linkSaida}`,
    'Leilão NoZap - relacionamento@leilaonozap.com',
  );
  return linhas.join('\n');
}

/**
 * Versão HTML. Tabela em vez de flex/grid de propósito: cliente de e-mail
 * (principalmente Outlook) não renderiza layout moderno.
 */
export function corpoHtml({ contato, destaque, outros = [], linkSaida, site = SITE }) {
  const nome = primeiroNome(contato?.nome);
  const saudacao = nome
    ? `${escaparHtml(nome)}, o leilão de hoje fecha daqui a pouco.`
    : 'O leilão de hoje fecha daqui a pouco.';

  const capa = destaque.capa
    ? `<tr><td style="padding:0">
         <img src="${escaparHtml(destaque.capa)}" width="560" alt="${escaparHtml(destaque.title)}"
              style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:12px 12px 0 0">
       </td></tr>`
    : '';

  const maisLotes = outros.length
    ? `<tr><td style="padding:24px 28px 4px;border-top:1px solid #1f3a2e">
         <p style="margin:0 0 12px;font:600 13px/1.4 Arial,Helvetica,sans-serif;color:#7fd1aa;
                   text-transform:uppercase;letter-spacing:.08em">Também fechando</p>
       </td></tr>
       ${outros.map((o) => `
       <tr><td style="padding:0 28px 10px">
         <a href="${escaparHtml(urlDoLeilao(o.id, site))}"
            style="display:block;text-decoration:none;background:#15241d;border:1px solid #24483a;
                   border-radius:10px;padding:12px 14px">
           <span style="display:block;font:400 14px/1.35 Arial,Helvetica,sans-serif;color:#e8ece9">
             ${escaparHtml(o.title)}</span>
           <span style="display:block;margin-top:4px;font:700 14px/1.2 Arial,Helvetica,sans-serif;color:#34d399">
             ${emReais(o.current_price)}
             <span style="font-weight:400;color:#9aa3a0"> · ${escaparHtml(quandoEncerra(o.end_time))}</span></span>
         </a>
       </td></tr>`).join('')}`
    : '';

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escaparHtml(destaque.title)}</title></head>
<body style="margin:0;padding:0;background:#0a1410">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escaparHtml(previa(destaque, outros))}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a1410;padding:24px 12px">
<tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0"
         style="width:100%;max-width:560px;background:#0d1f17;border-radius:14px;overflow:hidden">

    <tr><td style="padding:20px 28px 0">
      <p style="margin:0;font:800 15px/1 Arial,Helvetica,sans-serif;color:#34d399;letter-spacing:.04em">
        LEILÃO NOZAP</p>
    </td></tr>

    <tr><td style="padding:16px 28px 18px">
      <p style="margin:0;font:400 16px/1.45 Arial,Helvetica,sans-serif;color:#e8ece9">${saudacao}</p>
    </td></tr>

    <tr><td style="padding:0 28px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
             style="background:#15241d;border:1px solid #2f6f55;border-radius:12px;overflow:hidden">
        ${capa}
        <tr><td style="padding:18px 20px 20px">
          <p style="margin:0 0 10px;font:700 18px/1.3 Arial,Helvetica,sans-serif;color:#ffffff">
            ${escaparHtml(destaque.title)}</p>
          <p style="margin:0 0 2px;font:400 12px/1 Arial,Helvetica,sans-serif;color:#9aa3a0">Lance atual</p>
          <p style="margin:0 0 14px;font:900 32px/1.1 Arial,Helvetica,sans-serif;color:#34d399">
            ${emReais(destaque.current_price)}</p>
          <p style="margin:0 0 18px;font:400 14px/1.4 Arial,Helvetica,sans-serif;color:#bfe8d6">
            Encerra <strong style="color:#ffffff">${escaparHtml(quandoEncerra(destaque.end_time))}</strong>.</p>
          <a href="${escaparHtml(urlDoLeilao(destaque.id, site))}"
             style="display:block;background:#34d399;color:#06231a;text-align:center;text-decoration:none;
                    font:800 16px/1 Arial,Helvetica,sans-serif;padding:16px 20px;border-radius:10px">
            Dar meu lance</a>
        </td></tr>
      </table>
    </td></tr>

    ${maisLotes}

    <tr><td style="padding:22px 28px 24px">
      <p style="margin:0;font:400 13px/1.5 Arial,Helvetica,sans-serif;color:#9aa3a0">
        Quem está com o maior lance quando o cronômetro zera leva o produto.
        O pagamento sai do saldo da sua carteira na plataforma.</p>
    </td></tr>

    <tr><td style="padding:16px 28px 22px;border-top:1px solid #1f3a2e">
      <p style="margin:0 0 6px;font:400 11px/1.5 Arial,Helvetica,sans-serif;color:#6b7a74">
        Você recebeu este e-mail porque tem cadastro no Leilão NoZap.</p>
      <p style="margin:0;font:400 11px/1.5 Arial,Helvetica,sans-serif;color:#6b7a74">
        <a href="${escaparHtml(linkSaida)}" style="color:#7fd1aa">Não quero mais receber</a>
        · relacionamento@leilaonozap.com</p>
    </td></tr>

  </table>
</td></tr></table>
</body></html>`;
}

export const LIMITE_SMS = 160;

/**
 * Tira acento e cedilha, e troca o que sobrar de estranho por espaço.
 *
 * 🔴 Isto NÃO é frescura de estilo. SMS usa um alfabeto reduzido (GSM-7) que
 * tem "à" e "é", mas NÃO tem "ã", "õ" nem "ç". Uma única dessas letras muda a
 * codificação da mensagem inteira para UCS-2, e aí o limite despenca de 160 para
 * 70 caracteres — ou seja, "Leilão" sozinho transformaria todo SMS em três
 * mensagens cobradas.
 */
export function semAcento(txt) {
  return String(txt ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * SMS. Cabe em UMA mensagem (160 caracteres) ou não sai.
 *
 * Quando não cabe, o texto encolhe nesta ordem — do menos importante para o
 * mais importante, porque o link é a única parte que não pode faltar:
 *   1. encurta o nome do produto;
 *   2. tira a saudação pelo nome;
 *   3. tira o nome do produto de vez.
 *
 * @returns {{texto:string, tamanho:number, partes:number}}
 */
export function corpoSms({ contato, destaque, linkCurto, site = SITE }) {
  const nome = semAcento(primeiroNome(contato?.nome));
  const link = linkCurto || urlDoLeilao(destaque.id, site);
  const preco = semAcento(emReais(destaque.current_price));
  const hora = semAcento(quandoEncerra(destaque.end_time));
  const fim = `${link} SAIR=nao receber`;

  const montar = (titulo, comNome) => {
    const abre = comNome && nome ? `${nome}, ` : '';
    return titulo
      ? `${abre}${titulo} em ${preco}, encerra ${hora}. ${fim}`
      : `${abre}Leilao NoZap: lance em ${preco}, encerra ${hora}. ${fim}`;
  };

  const cheio = semAcento(destaque.title);
  const tentativas = [];
  for (let corte = cheio.length; corte >= 10; corte -= 2) {
    tentativas.push(montar(cheio.slice(0, corte).trimEnd(), true));
  }
  for (let corte = cheio.length; corte >= 10; corte -= 2) {
    tentativas.push(montar(cheio.slice(0, corte).trimEnd(), false));
  }
  tentativas.push(montar('', true), montar('', false));

  const texto = tentativas.find((t) => t.length <= LIMITE_SMS) || tentativas[tentativas.length - 1];
  return { texto, tamanho: texto.length, partes: Math.ceil(texto.length / LIMITE_SMS) || 1 };
}

/** Monta a mensagem inteira de um destinatário. */
export function montarMensagem({ contato, destaque, outros = [], linkSaida, site = SITE }) {
  return {
    assunto: assunto(destaque),
    html: corpoHtml({ contato, destaque, outros, linkSaida, site }),
    texto: corpoTexto({ contato, destaque, outros, linkSaida, site }),
    sms: corpoSms({ contato, destaque, site }),
  };
}
