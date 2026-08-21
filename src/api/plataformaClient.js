/**
 * ══════════════════════════════════════════════════════════════════════════
 * 📜 MEMÓRIA DO PROJETO — leia antes de mexer aqui (21/08/2026)
 * ══════════════════════════════════════════════════════════════════════════
 * A Leilão NoZap NASCEU na Base44 — uma plataforma de criar app com IA. Foi a
 * primeira IA do projeto, a que montou a base inicial. Isso fica registrado
 * aqui de propósito: não é vergonha, é história.
 *
 * O que mudou: o app cortou o cordão com os SERVIDORES da Base44 (SDK, plugin,
 * mídia — tudo saiu de lá; ver commit "corta o cordão"). Só ficou a FORMA da
 * API (`.entities`, `.functions.invoke`, `.auth`) porque centenas de telas já
 * chamavam esse formato, e reescrever tudo de uma vez custava mais do que
 * valia. Este arquivo é esse adapter: por fora parece a API antiga, por dentro
 * fala só com o Supabase e as rotas da Vercel do próprio projeto.
 *
 * O nome do identificador (antes `base44`, agora `plataforma`) mudou em
 * 21/08/2026 por pedido direto do dono — não porque a história é feia, mas
 * porque o nome antigo estava confundindo, fazendo parecer que o app ainda
 * dependia do servidor de terceiro. Não dependia mais; só o nome é que tinha
 * ficado desatualizado. Este comentário é o "alerta pra lembrar" que ele
 * pediu — a história fica registrada aqui, no lugar certo, em vez de
 * espalhada pelo nome de uma variável em 300 arquivos.
 * ══════════════════════════════════════════════════════════════════════════
 */
export { plataforma } from './plataformaAdapter';
export { supabase } from './supabaseClient';
