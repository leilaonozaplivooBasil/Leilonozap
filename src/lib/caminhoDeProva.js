/**
 * 🔴 O PRINT NÃO SUBIA NA SEGUNDA TENTATIVA (08/09/2026)
 *
 * O caminho da prova no Storage era fixo por usuário + dia + tarefa:
 *
 *   xgame/prints/<uid>/2026-09-08_<id-da-tarefa>.jpg
 *
 * A primeira tentativa gravava. Da segunda em diante o objeto já existia, o
 * upload virava sobrescrita — e sobrescrever exige política de UPDATE em
 * `storage.objects`, que o projeto não tem (só LEITURA pública e INSERT pro
 * `anon`). O Storage devolvia 400 e o modal mostrava "Erro ao enviar a imagem",
 * sem dizer o motivo. Quem refazia a mesma tarefa no mesmo dia ficava travado
 * até virar o dia. Em 08/09 foram 49 recusas em pelo menos 5 pessoas.
 *
 * A saída NÃO é criar política de UPDATE: isso deixaria qualquer visitante
 * sobrescrever foto de produto, banner e avatar do site. A saída é nunca
 * colidir — cada envio tem um sufixo próprio. O prefixo `<dia>_<tarefa>`
 * continua igual, então continua dando pra achar a prova de uma tarefa.
 */

/** Deixa um pedaço de caminho com o que o Storage aceita sem reclamar. */
const limpo = (valor, reserva) =>
  String(valor ?? '').replace(/[^a-zA-Z0-9._-]/g, '_') || reserva;

/**
 * Monta o caminho de uma prova do X-GAME (print ou vídeo do ritual).
 *
 * @param {object} p
 * @param {string} p.pasta     'prints' | 'rituais'
 * @param {string} p.uid       id do usuário
 * @param {string} p.dia       dia no formato de `hojeStr()`
 * @param {string} p.tarefaId  id da tarefa
 * @param {string} p.ext       extensão do arquivo, com ou sem ponto
 * @param {string} [p.unico]   sufixo único (só os testes passam à mão)
 */
/**
 * ⚠️ Contador de sessão — a parte do sufixo que NÃO depende de sorte.
 *
 * A marca era `<tempo em ms><4 chars aleatórios>`. Dois envios no MESMO
 * milissegundo dependiam só dos 4 caracteres: ~1,7 milhão de combinações, que
 * pelo paradoxo do aniversário colidem **1 vez a cada ~60 rodadas de 200
 * envios**. Medido: 5 colisões em 300 rodadas.
 *
 * E colisão aqui não é detalhe estatístico — é o 400 do Storage voltando, o
 * mesmo incidente de 08/09 (49 recusas, 5 pessoas) que este arquivo existe
 * pra ter resolvido. O teste que cobre isso também piscava vermelho ~1 run em
 * 60, o que é como a falha se disfarçava de "flaky".
 *
 * Com um contador, dois envios da mesma aba NUNCA colidem — que é exatamente
 * o caso real: a mesma pessoa reenviando a mesma tarefa. O aleatório continua
 * ali pra separar abas e aparelhos diferentes.
 */
let sequencia = 0;

export function caminhoDeProva({ pasta, uid, dia, tarefaId, ext, unico }) {
  sequencia += 1;
  const marca =
    limpo(unico, '') ||
    `${Date.now().toString(36)}${sequencia.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const extensao = limpo(String(ext ?? '').replace(/^\.+/, ''), 'bin');
  return [
    'xgame',
    limpo(pasta, 'provas'),
    limpo(uid, 'sem-id'),
    `${limpo(dia, 'sem-dia')}_${limpo(tarefaId, 'sem-tarefa')}_${marca}.${extensao}`,
  ].join('/');
}

/**
 * Deixa um caminho do Storage só com o que ele aceita, preservando as pastas.
 * Cada pedaço entre barras é limpo separadamente; pedaço vazio, `.` e `..`
 * somem (senão dava pra sair da pasta pretendida).
 *
 * Vive aqui, e não no adapter, porque o adapter carrega o cliente Supabase e
 * não roda fora do navegador — aqui dá pra testar.
 */
export function caminhoSeguro(caminho) {
  return String(caminho ?? '')
    .split('/')
    .map((pedaco) => pedaco.replace(/[^a-zA-Z0-9._-]/g, '_'))
    .filter((pedaco) => pedaco && pedaco !== '.' && pedaco !== '..')
    .join('/');
}
