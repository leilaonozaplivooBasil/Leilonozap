// 🧾 O RASTRO QUE SEPARA "MAL USO" DE "ERRO NOSSO" (10/09/2026).
//
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE ISTO EXISTE
// ═══════════════════════════════════════════════════════════════════════════
// Dono, definindo o laudo de comprovações: serve pra "quando o usuário
// reclamar de algum erro, podermos ver na hora se foi mal uso do usuário ou se
// de fato é erro".
//
// 🔴 A comprovação de hoje NÃO respondia isso. Medido em 10/09, sobre as 255
// comprovações dos últimos 7 dias:
//     guardam quantas vezes a pessoa tentou ....... 0
//     guardam tempo de tela ...................... 19  (só o ritual)
//     marcam IA fora do ar ........................ 0
//
// O caso que provou a falta é o da Iara, na manhã de 10/09: onze envios de
// vídeo voltaram HTTP 413, ela concluiu 4 minutos depois do prazo, e a
// comprovação dizia só "reprovada — ritual perdido". Quem lesse o laudo
// concluiria MAL USO. A evidência estava só no log da Vercel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { proximaTentativa, comFalha, rastroDa, leituraDoRastro, MAX_FALHAS } from '../src/lib/rastroDaComprovacao.js';
import { semComentarios } from './_ajuda.mjs';

const ler = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CRM = semComentarios(ler('../src/components/licensing/CentralVendas/CrmMetodo.jsx'));
const COFRE = semComentarios(ler('../src/lib/cofreDeAudio.js'));

test('🔢 conta a tentativa — e um registro antigo já vale por uma', () => {
  assert.equal(proximaTentativa(null), 1, 'sem registro anterior, é a primeira');
  // registro que existe mas nasceu antes deste campo: já houve UMA entrega
  assert.equal(proximaTentativa({ status: 'reprovada' }), 2, 'comprovação antiga não pode voltar a contar como primeira');
  assert.equal(proximaTentativa({ tentativas: 3 }), 4);
  assert.equal(proximaTentativa({ tentativas: 0 }), 2, 'zero é dado sujo — piso é 1');
});

test('🔴 a falha técnica vira registro, com o erro legível', () => {
  const falhas = comFalha([], { o_que: 'video', erro: 'autorização negada (HTTP 413)' });
  assert.equal(falhas.length, 1);
  assert.equal(falhas[0].o_que, 'video');
  assert.match(falhas[0].erro, /413/);
  assert.ok(falhas[0].quando, 'sem horário, a falha não serve pra cruzar com log nenhum');
});

test('⚠️ o teto guarda as ÚLTIMAS falhas, não as primeiras', () => {
  // Quem reclama, reclama do que ACABOU de acontecer. Cortar pelo fim
  // esconderia justamente a falha da reclamação.
  let f = [];
  for (let i = 1; i <= MAX_FALHAS + 5; i += 1) f = comFalha(f, { o_que: 'video', erro: `erro ${i}` });
  assert.equal(f.length, MAX_FALHAS);
  assert.equal(f[f.length - 1].erro, `erro ${MAX_FALHAS + 5}`, 'a falha mais recente sumiu — é a que importa');
  assert.equal(f[0].erro, 'erro 6');
});

test('⚠️ falha sem descrição não polui o registro', () => {
  assert.deepEqual(comFalha([], {}), []);
  assert.deepEqual(comFalha(null, { o_que: '  ' }), []);
});

test('🧾 o rastro só carrega o que tem valor', () => {
  // Comprovação sem falha nenhuma não ganha um `falhas: []` vazio pra levar
  // pra sempre — o registro é lido por gente, não só por máquina.
  const limpo = rastroDa({ anterior: null, tempoTelaS: 120 });
  assert.deepEqual(limpo, { tentativas: 1, tempo_tela_s: 120 });
  assert.equal('falhas' in limpo, false);
  assert.equal('ia_indisponivel' in limpo, false);

  const sujo = rastroDa({ anterior: { tentativas: 2 }, tempoTelaS: 45.6, iaIndisponivel: true, falhas: [{ o_que: 'ia', erro: 'x' }] });
  assert.equal(sujo.tentativas, 3);
  assert.equal(sujo.tempo_tela_s, 46, 'o tempo é arredondado — segundo quebrado não diz nada a mais');
  assert.equal(sujo.ia_indisponivel, true);
  assert.equal(sujo.falhas.length, 1);
});

test('⚠️ tempo de tela inválido não vira 0 — vira ausente', () => {
  // 0 mentiria dizendo "ficou zero segundo na tela". Ausente diz "não sei",
  // que é a verdade pros caminhos que não medem.
  assert.equal('tempo_tela_s' in rastroDa({ tempoTelaS: null }), false);
  assert.equal('tempo_tela_s' in rastroDa({ tempoTelaS: 'abc' }), false);
  assert.equal(rastroDa({ tempoTelaS: 0 }).tempo_tela_s, 0, 'zero MEDIDO é diferente de não medido');
});

test('🔴 O CASO DA IARA: o rastro diz "erro do sistema", não "mal uso"', () => {
  // A manhã real: ela tentou, o vídeo voltou 413, e ela concluiu fora do prazo.
  const falhas = comFalha([], { o_que: 'video', erro: 'autorização negada (HTTP 413)' });
  const comprovacao = {
    status: 'reprovada',
    veredito_ia: { motivo: 'Ritual perdido — passou do prazo de 5h30.' },
    ...rastroDa({ anterior: null, tempoTelaS: 300, falhas }),
  };
  const leitura = leituraDoRastro(comprovacao);
  assert.equal(leitura.sinal, 'erro_do_sistema', 'o laudo voltaria a sugerir mal uso onde houve falha nossa');
  assert.match(leitura.texto, /413/, 'o número do erro tem que aparecer — é o que dá pra cruzar com o log');
});

test('🔴 IA FORA DO AR: sem falha nenhuma registrada, ainda é erro do sistema', () => {
  // O outro jeito de o sistema falhar sem deixar marca: a IA não responde e a
  // entrega volta "reprovada". Sem este campo o laudo leria mal uso — e desta
  // vez nem há uma falha de envio pra denunciar.
  const comprovacao = { status: 'reprovada', ...rastroDa({ anterior: null, iaIndisponivel: true }) };
  assert.equal(comprovacao.ia_indisponivel, true);
  assert.equal(comprovacao.falhas, undefined, 'não é falha de envio — é a IA muda');
  const leitura = leituraDoRastro(comprovacao);
  assert.equal(leitura.sinal, 'erro_do_sistema', 'a IA fora do ar deixou de contar como erro nosso');
  assert.match(leitura.texto, /não foi a pessoa/i);
});

test('⚠️ e o contrário também: entrega apressada aponta pra olhar a pessoa', () => {
  assert.equal(leituraDoRastro({ tempo_tela_s: 12, tentativas: 1 }).sinal, 'olhar');
  assert.equal(leituraDoRastro({ tentativas: 4 }).sinal, 'olhar');
  assert.equal(leituraDoRastro({ tempo_tela_s: 300, tentativas: 1 }).sinal, 'normal');
  // O limiar é 3 de propósito: o relato do dono foi "alguns tentaram mais de
  // 3x e o vídeo não salva". Duas tentativas é vida normal; três já é sinal.
  assert.equal(leituraDoRastro({ tentativas: 3 }).sinal, 'olhar', 'subiu o limiar — a terceira tentativa parou de acender');
  assert.equal(leituraDoRastro({ tentativas: 2 }).sinal, 'normal', 'desceu o limiar — toda segunda tentativa virou suspeita');
});

test('🔴 a leitura NUNCA acusa ninguém sozinha', () => {
  // Um diagnóstico automático aqui repetiria o erro que este arquivo existe
  // pra corrigir: dar confiança a uma conclusão sem prova.
  const lib = semComentarios(ler('../src/lib/rastroDaComprovacao.js'));
  assert.doesNotMatch(lib, /culpad|mal_uso|culpa/i, 'a leitura passou a acusar — ela só aponta pra onde olhar');
  assert.match(lib, /sinal: 'olhar'/, 'sumiu o sinal neutro que manda conferir sem concluir');
});

test('🔴 as falhas ATRAVESSAM as tentativas — a IA fora do ar deixa marca', () => {
  // Quando a IA não responde, `avaliarComIA` volta cedo e não grava
  // comprovação nenhuma: sem o ref, a tentativa sumiria sem rastro.
  assert.match(CRM, /const falhasPorTarefa = useRef\(\{\}\);/, 'o coletor voltou a ser local — a falha da 1ª tentativa se perde');
  assert.match(CRM, /anotarFalhaDaTarefa\(t\.id, 'ia', `IA fora do ar\$\{det\}`\)/, 'IA fora do ar voltou a não deixar marca');
  assert.match(CRM, /anotarFalhaDaTarefa\(t\.id, 'print'/, 'falha ao enviar a imagem voltou a não deixar marca');
  assert.match(CRM, /aoFalhar: anotarFalha\('video'\)/, 'a falha do vídeo voltou a morrer no console');
});

test('🔴 os TRÊS desfechos do ritual gravam rastro — inclusive o "perdido"', () => {
  // "Perdeu o prazo" é o desfecho que MAIS parece mal uso e mais esconde falha
  // nossa: foi o da Iara.
  const n = (CRM.match(/rastroDa\(\{ anterior: t\.comprovacao, tempoTelaS, falhas: falhasDaEntrega\(\) \}\)/g) || []).length;
  assert.equal(n, 3, `esperava rastro nos 3 desfechos do ritual, achei ${n}`);
  assert.match(CRM, /rastroDa\(\{ anterior: t\.comprovacao, iaIndisponivel/, 'a comprovação comum ficou sem rastro');
});

test('⚠️ o cofre conta o MOTIVO da falha, e avisar nunca derruba guardar', () => {
  assert.match(COFRE, /return falhou\(`autorização negada \(HTTP \$\{r\.status\}\)`\)/, 'o motivo do 413 voltou a se perder');
  assert.match(COFRE, /try \{ aoFalhar\?\.\(String\(erro \|\| 'sem detalhe'\)\); \} catch/, 'avisar a falha passou a poder derrubar o guardar');
});

test('⚠️ o rastro é apagado depois de gravado, pra não repetir na próxima', () => {
  const n = (CRM.match(/limparFalhasDaTarefa\(t\.id\)/g) || []).length;
  assert.equal(n, 2, `esperava limpeza nos 2 caminhos que gravam, achei ${n}`);
});
