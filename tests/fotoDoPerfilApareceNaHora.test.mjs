// 🖼️ A FOTO NOVA APARECE NA HORA, SEM FECHAR E ABRIR O APP (09/09/2026).
//
// ═══════════════════════════════════════════════════════════════════════════
// O CASO, com prova no banco
// ═══════════════════════════════════════════════════════════════════════════
// A Iara trocou a própria foto QUATRO vezes no mesmo dia:
//
//   14h15 · 14h15 · 14h21   → falharam de verdade (era o bug do #304)
//   14h33                   → #304 entrou no ar e consertou a gravação
//   17h27                   → subiu o arquivo
//   17h32                   → `avatar_url` GRAVADO no banco, com sucesso
//   17h35                   → ela mandou "não consigo"
//
// Três minutos DEPOIS de salvar com sucesso. Ou seja: o conserto do #304
// funcionou, e mesmo assim a experiência dela continuou sendo "não consigo".
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUÊ
// ═══════════════════════════════════════════════════════════════════════════
// O `currentUser` do Layout é lido do localStorage UMA VEZ, na abertura do app
// (useState com função inicial). O Perfil grava no banco e no localStorage —
// mas não avisa ninguém. O avatar da barra do topo e do menu lateral seguem
// mostrando a foto antiga até a pessoa fechar e abrir o app.
//
// Salvar-e-não-mudar é indistinguível de não-salvar pra quem está olhando. Por
// isso ela tentou de novo, e de novo, e de novo.
//
// ⚠️ E POR QUE NÃO USAR O `syncUserData` QUE JÁ EXISTE: ele existe no Layout,
// buscaria o dado fresco do banco — e NUNCA É CHAMADO em lugar nenhum. Passar
// a chamá-lo resolveria, mas ao custo de uma consulta ao banco. O evento
// resolve de graça, no mesmo padrão do `cartUpdated` que já roda ali.
//
// Este teste trava as DUAS pontas: quem avisa e quem escuta. Uma ponta sozinha
// não conserta nada — e é justamente o tipo de coisa que some numa refatoração
// sem ninguém perceber, porque nada quebra na hora.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const LAYOUT = semComentarios(ler('../src/Layout.jsx'));
const PERFIL = semComentarios(ler('../src/pages/Profile.jsx'));

const EVENTO = 'usuarioAtualizado';

test('🔔 o Perfil avisa o app depois de salvar', () => {
  assert.match(
    PERFIL,
    new RegExp(`dispatchEvent\\(\\s*new CustomEvent\\(\\s*['"\`]${EVENTO}['"\`]`),
    `o Perfil parou de disparar "${EVENTO}" — a foto volta a salvar sem aparecer`,
  );
});

test('e manda o cadastro novo junto, pra quem escuta não depender do storage', () => {
  const trecho = PERFIL.slice(PERFIL.indexOf(`CustomEvent('${EVENTO}'`));
  assert.match(
    trecho.slice(0, 200),
    /detail:/,
    'o evento foi disparado sem `detail` — em navegador com storage bloqueado o aviso chega vazio',
  );
});

test('🎧 o Layout escuta o aviso e atualiza o usuário na tela', () => {
  assert.match(
    LAYOUT,
    new RegExp(`addEventListener\\(\\s*['"\`]${EVENTO}['"\`]`),
    `o Layout parou de escutar "${EVENTO}" — o avatar da barra congela na foto antiga`,
  );
  assert.match(
    LAYOUT,
    new RegExp(`removeEventListener\\(\\s*['"\`]${EVENTO}['"\`]`),
    'listener sem limpeza vaza a cada remontagem do Layout',
  );
});

test('🛡️ e o aviso passa pelo anti-downgrade, senão salvar o perfil rebaixa o admin', () => {
  // `safeMergeUser` protege o cargo em TODO setCurrentUser deste arquivo. Se o
  // caminho do evento pular essa proteção, um admin que salva o próprio perfil
  // vira 'user' na tela — bug pior do que o que estamos consertando.
  const i = LAYOUT.indexOf(`addEventListener('${EVENTO}'`);
  assert.ok(i > 0, 'sem o listener não há o que conferir');
  // O handler é declarado logo acima do addEventListener.
  const bloco = LAYOUT.slice(Math.max(0, i - 1200), i);
  assert.match(
    bloco,
    /setCurrentUser\(\s*\(\s*\w+\s*\)\s*=>\s*safeMergeUser\(/,
    'o handler do evento não passa pelo safeMergeUser — salvar o perfil rebaixaria o próprio admin',
  );
});

test('🔴 o `syncUserData` continua sem ser chamado — não foi ele que resolveu', () => {
  // Registro honesto: a função existe e é código morto. Se um dia alguém a
  // ligar, ótimo — mas aí este teste avisa, porque a decisão de gastar uma
  // consulta ao banco por navegação tem que ser tomada de propósito, não
  // herdada sem querer.
  const chamadas = (LAYOUT.match(/syncUserData/g) || []).length;
  assert.equal(
    chamadas,
    1,
    'syncUserData deixou de ser só uma declaração — confira se a consulta extra ao banco foi intencional',
  );
});
