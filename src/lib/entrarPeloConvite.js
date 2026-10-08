// 🔑 "JÁ TEM CONTA? ENTRAR" NO CONVITE DE CADASTRO (08/10/2026)
//
// O caso Renan Silva: cliente cadastrado (dono: Lorranye) abria a plataforma
// pelo navegador de dentro do WhatsApp — que não tem a sessão do Safari/app.
// Ali ele era visitante, com o link de OUTRA vendedora (Maira) guardado na
// memória de 90 dias. Resultado: o convite "Crie seu Perfil de Lance" abria
// toda vez ("ainda está nisso…"), o cartão da Loja mostrava a Maira e o botão
// compartilhar saía com o código dela. O popup só tinha o X: não existia um
// caminho para quem JÁ É cadastrado simplesmente entrar.
//
// Agora o convite oferece "Entrar". Ao logar, o Layout já apaga o link alheio
// de quem tem dono (regra de dono único, 06/08/2026) e, como marcamos a
// renovação de sessão, a MESMA tela recarrega: cartão, compartilhar e painel
// passam a ser os da conta — sem a pessoa precisar saber o que é cache.
import { CHAVE_RELOGIN } from './sessaoCliente.js';

/**
 * Fecha o convite e abre o login na mesma tela, marcando que ao entrar a
 * página deve recarregar. `fechar` é o onClose do popup (opcional).
 */
export function entrarPeloConvite({ fechar, storage, janela } = {}) {
  const st = storage ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
  const win = janela ?? (typeof window !== 'undefined' ? window : null);
  try { st?.setItem(CHAVE_RELOGIN, '1'); } catch { /* sem storage: só abre o login */ }
  try { fechar?.(); } catch { /* o popup já pode ter sumido */ }
  try { win?.dispatchEvent(new CustomEvent('openLoginModal')); } catch { /* fora do navegador */ }
}
