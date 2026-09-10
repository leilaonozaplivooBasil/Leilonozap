// 🔐 As funções SECURITY DEFINER abertas ao anônimo (09/09/2026).
//
// `find_user_by_phone` devolve nome, e-mail, cargo, código de indicação e
// SALDO DE COMISSÃO a partir de um telefone — e casava pelos últimos 8 dígitos,
// o que torna varredura viável. A chave `anon` vai no pacote do site: é pública.
//
// Fechar não quebrou nada porque o ÚNICO chamador é uma rota de servidor
// (waWebhook) usando service role, que ignora grants. Este teste trava as duas
// pontas dessa afirmação — se alguém passar a chamar do front, ele avisa antes
// do deploy em vez de a tela quebrar em produção.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const DIR = new URL('../supabase/migrations/', import.meta.url);
const MIG = readdirSync(DIR).find((f) => f.includes('find_user_by_phone_sem_anon'));

test('🔐 a migração que revoga o acesso anônimo continua no lugar', () => {
  assert.ok(MIG, 'sumiu a migração — a função volta a ser chamável por qualquer um');
  const sql = readFileSync(new URL(MIG, DIR), 'utf8');
  assert.match(sql, /revoke execute on function public\.find_user_by_phone\(text\) from anon/i);
  assert.match(sql, /revoke execute on function public\.find_user_by_phone\(text\) from public/i);
  assert.match(sql, /commission_balance/, 'o arquivo precisa dizer O QUE vazava — senão vira revoke sem motivo');
});

test('🔴 e `authenticated` também — senão o revoke fecha 2 das 3 portas', () => {
  // O grant real da função tem TRÊS papéis abertos: anon, public e
  // authenticated. Fechar só os dois primeiros deixa o caminho de trás aberto:
  // o projeto tem Supabase Auth ligado (contas em auth.users) e
  // plataformaAdapter.auth ainda expõe signInWithPassword. Um revoke pela
  // metade é pior que nenhum — passa a impressão de resolvido.
  //
  // Este teste existe porque a primeira versão desta migração esquecia
  // `authenticated`, e o esquecimento não aparecia em lugar nenhum.
  const sql = readFileSync(new URL(MIG, DIR), 'utf8');
  assert.match(
    sql,
    /revoke execute on function public\.find_user_by_phone\(text\) from authenticated/i,
    'faltou revogar de `authenticated` — a função continua alcançável por quem tiver um token do Supabase Auth',
  );
});

test('🔴 nenhuma tela do site chama find_user_by_phone', () => {
  // Se alguém chamar do front, a chamada vai como `anon` e passa a falhar. O
  // caminho certo é uma rota de servidor com crachá, como o cofre de áudio.
  const raiz = new URL('../src/', import.meta.url).pathname;
  let achou = '';
  try { achou = execSync(`grep -rl find_user_by_phone ${raiz} || true`, { encoding: 'utf8' }).trim(); } catch { achou = ''; }
  assert.equal(achou, '', `o front passou a chamar find_user_by_phone e vai tomar permissão negada: ${achou}`);
});

test('e o chamador de servidor usa service role, que ignora grant', () => {
  const wa = readFileSync(new URL('../api/functions/waWebhook.js', import.meta.url), 'utf8');
  assert.match(wa, /find_user_by_phone/, 'sumiu o único chamador legítimo');
  assert.match(wa, /SUPABASE_SERVICE_ROLE_KEY/, 'sem service role, o revoke quebra o robô do WhatsApp');
});
