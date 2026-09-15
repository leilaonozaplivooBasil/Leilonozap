// 📞 WhatsApp OFICIAL da empresa — fonte única (15/09/2026).
//
// Um cliente mandou print do carrinho abrindo conversa com "+55 21 99999-9999"
// (número de exemplo que tinha ficado no botão "negociar pelo WhatsApp"). O
// WhatsApp ainda mostrou "Você confia nesta empresa?" com foto vazia — péssimo.
// O dono passou o número oficial e pediu pra trocar em todo o site. Ninguém mais
// escreve o número na mão: importa daqui.
export const WHATSAPP_OFICIAL = '5521984072064';
export const WHATSAPP_OFICIAL_FORMATADO = '(21) 98407-2064';

/** Link wa.me pro número oficial, com texto opcional já codificado. */
export function linkWhatsAppOficial(texto = '') {
  const t = String(texto || '').trim();
  return `https://wa.me/${WHATSAPP_OFICIAL}${t ? `?text=${encodeURIComponent(t)}` : ''}`;
}

/**
 * Link wa.me pra um número BR vindo do banco/formulário, em qualquer formato:
 * "(21) 98765-4321", "21987654321", "5521987654321"… Sem número válido → ''.
 * (Auditoria 15/09/2026: 6 telas prefixavam "55" na mão e geravam "5555…" ou
 * mandavam "(21) 9…" cru pro WhatsApp.)
 */
export function linkWhatsAppNumero(numero, texto = '') {
  let d = String(numero || '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  if (!(d.length === 12 || d.length === 13) || !d.startsWith('55')) return '';
  const t = String(texto || '').trim();
  return `https://wa.me/${d}${t ? `?text=${encodeURIComponent(t)}` : ''}`;
}
