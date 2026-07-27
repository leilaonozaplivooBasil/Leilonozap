// copyLink — cópia de texto ROBUSTA. O padrão `navigator.clipboard?.writeText()` falha em
// SILÊNCIO nos navegadores in-app (WhatsApp/Instagram webview) e em contexto não-HTTPS —
// justamente onde os usuários abrem os links da loja. Aqui tem fallback + retorno booleano
// REAL, pra UI só mostrar "copiado" quando copiou de verdade.
export async function copyLink(text) {
  const value = String(text ?? '');
  try {
    if (navigator?.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch { /* cai no fallback */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
