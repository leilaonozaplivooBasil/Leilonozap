// 🪪 CPF — uma conta só, usada pelos dois lados (09/09/2026).
//
// O mesmo algoritmo já existia copiado em TRÊS lugares (Cart.jsx,
// api/functions/atualizarCpfComprador.js, api/_lib/melhorEnvioShipment.js).
// Esta peça não apaga as três — mexer em caminho de checkout que está
// funcionando, por arrumação, é risco sem prêmio. Ela existe pra que o
// caminho NOVO (adesão do vendedor) não vire a quarta cópia.

/** Só os dígitos — é assim que o CPF viaja pro Mercado Pago e pro banco. */
export const soDigitos = (valor) => String(valor || '').replace(/\D/g, '');

/**
 * O CPF é válido? (11 dígitos + os dois dígitos verificadores)
 *
 * Rejeita também os repetidos (111.111.111-11 e afins): eles passam na conta
 * dos verificadores mas não são CPF de ninguém — é o preenchimento que a
 * pessoa faz pra "pular" o campo, e é justamente o que faz o pagamento morrer
 * lá no gateway, longe da tela onde daria pra avisar.
 */
export function cpfValido(valor) {
  const cpf = soDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base) => {
    let soma = 0;
    for (let i = 0; i < base; i += 1) soma += parseInt(cpf[i], 10) * (base + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return digito(9) === parseInt(cpf[9], 10) && digito(10) === parseInt(cpf[10], 10);
}

/** 000.000.000-00 enquanto a pessoa digita, sem atrapalhar quem apaga. */
export function formatarCpf(valor) {
  const d = soDigitos(valor).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}
