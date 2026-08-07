// 🔐 PORTA DE ENTRADA DA CAPTAÇÃO PRIVADA.
// A apresentação (/Partners) só é liberada depois que a pessoa se cadastra na
// plataforma E declara ciência de que a operação é privada/confidencial.
// O aceite é gravado por usuário no próprio aparelho (chave por id).
const chave = (userId) => `pc_ciente_${userId || 'anon'}`;

export function usuarioLocal() {
  try {
    const bruto = localStorage.getItem('currentUser');
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

export function temAceiteParceiro(user) {
  const u = user || usuarioLocal();
  if (!u?.id) return false;
  try {
    return localStorage.getItem(chave(u.id)) === '1';
  } catch {
    return false;
  }
}

export function registrarAceiteParceiro(user) {
  const u = user || usuarioLocal();
  if (!u?.id) return;
  try {
    localStorage.setItem(chave(u.id), '1');
    localStorage.setItem(`${chave(u.id)}_em`, new Date().toISOString());
  } catch {
    /* storage indisponível: segue sem travar o acesso na sessão atual */
  }
}