// 🎂 dataDeNascimento — a data de nascimento no cadastro, SEM travar ninguém (03/10/2026, DIR-194).
//
// Dono: "pode colocar a data de nascimento no cadastro, mas sem ferir, sem
// restringir e sem criar ainda mais bloqueio na entrada — isso precisa ser bem
// leve". Então a regra da casa é uma só: o campo é OPCIONAL em todo lugar e
// nenhuma função daqui lança erro nem devolve mensagem de recusa. O que a
// pessoa digitou e faz sentido vira 'AAAA-MM-DD'; o que não faz sentido vira
// null — e o cadastro segue igual, como se o campo estivesse em branco.
//
// Por que existe: o Painel do Investidor (DIR-191) tem a fatia "Faixa etária"
// apagada porque o banco não tinha data de nascimento em nenhum cadastro. A
// idade não se estima pelo nome nem pelo CPF — se ela não foi informada, não
// existe. Este arquivo é a única régua, usada pelo navegador (máscara e envio)
// e pelo servidor (publicRegister, registerNetworkUser, atualizarMeuCadastro).

export const soDigitosDaData = (v) => String(v ?? '').replace(/\D/g, '').slice(0, 8);

/** Máscara progressiva DD/MM/AAAA enquanto a pessoa digita. Nunca recusa tecla: só formata. */
export function mascaraData(v) {
  const d = soDigitosDaData(v);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

const diasDoMes = (ano, mes) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();

/** {ano, mes, dia} quando o texto é uma data do calendário; null se não é. Sem régua de idade. */
function partesDaData(bruto) {
  if (bruto === null || bruto === undefined) return null;
  const s = String(bruto).trim();
  if (!s) return null;
  let ano; let mes; let dia;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (iso) { ano = Number(iso[1]); mes = Number(iso[2]); dia = Number(iso[3]); }
  else {
    const d = soDigitosDaData(s);
    if (d.length !== 8) return null;
    dia = Number(d.slice(0, 2)); mes = Number(d.slice(2, 4)); ano = Number(d.slice(4));
  }
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || !Number.isInteger(dia)) return null;
  if (mes < 1 || mes > 12 || dia < 1 || dia > diasDoMes(ano, mes)) return null;
  return { ano, mes, dia };
}

const paraISO = ({ ano, mes, dia }) => `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

/**
 * 'AAAA-MM-DD' quando o que veio é uma data de nascimento plausível; null em
 * qualquer outro caso (vazio, incompleto, dia 32, ano 1850, data futura, idade
 * acima de 120). Aceita DD/MM/AAAA, DDMMAAAA e AAAA-MM-DD (o que o banco devolve).
 */
export function nascimentoISO(bruto, hoje = new Date()) {
  const p = partesDaData(bruto);
  if (!p) return null;
  const anoHoje = hoje.getUTCFullYear();
  if (p.ano < anoHoje - 120 || p.ano > anoHoje) return null;
  const data = Date.UTC(p.ano, p.mes - 1, p.dia);
  const limite = Date.UTC(anoHoje, hoje.getUTCMonth(), hoje.getUTCDate());
  if (data > limite) return null;
  return paraISO(p);
}

/** 'DD/MM/AAAA' para mostrar; '' quando não há data do calendário. */
export function nascimentoBR(v) {
  const p = partesDaData(v);
  if (!p) return '';
  return `${String(p.dia).padStart(2, '0')}/${String(p.mes).padStart(2, '0')}/${p.ano}`;
}

/** Idade em anos completos, ou null. */
export function idadeDe(v, hoje = new Date()) {
  const iso = nascimentoISO(v, hoje);
  if (!iso) return null;
  const [a, m, d] = iso.split('-').map(Number);
  let idade = hoje.getUTCFullYear() - a;
  const mesHoje = hoje.getUTCMonth() + 1;
  if (mesHoje < m || (mesHoje === m && hoje.getUTCDate() < d)) idade -= 1;
  return idade;
}
