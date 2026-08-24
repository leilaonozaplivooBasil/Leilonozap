// Prova que a trava anti-repetição do SystemLog segura o caso REAL que derrubou
// a produção em 24/08/2026: 1.581 gravações de "N requisições/min - RISCO DE
// RATE LIMIT", onde N muda a cada vez e por isso a assinatura nunca repetia.
//
// O módulo real importa '@/api/plataformaClient' (alias do Vite, e faz chamada
// de rede). Aqui replicamos SÓ a montagem da assinatura, que é o que a correção
// mudou, e conferimos contra o texto real vindo do banco de produção.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fonte = readFileSync(new URL('../src/lib/logDedupe.js', import.meta.url), 'utf8');

test('logDedupe: a assinatura tira os números da mensagem', () => {
  assert.match(fonte, /function semNumeros/, 'semNumeros() precisa existir');
  assert.match(
    fonte,
    /semNumeros\(String\(payload\.message/,
    'a assinatura precisa passar a mensagem por semNumeros()'
  );
});

// Réplica exata de semNumeros() e da montagem da assinatura.
const semNumeros = (t) => t.replace(/\d+/g, '#');
const assinar = (p) => [
  p.step || '',
  p.component_name || '',
  semNumeros(String(p.message || '').slice(0, 300)),
].join('|');

test('mensagens do incidente real colapsam numa assinatura só', () => {
  // Textos vindos de system_logs em produção (component_name GlobalMonitor).
  const rajada = [95, 99, 100, 101, 137, 204].map((n) => ({
    step: 'Monitor_rate_limit_risk',
    component_name: 'GlobalMonitor',
    message: `${n} requisições/min - RISCO DE RATE LIMIT`,
  }));

  const assinaturas = new Set(rajada.map(assinar));
  assert.equal(assinaturas.size, 1, 'as 6 mensagens tinham que virar 1 assinatura');
});

test('os outros dois casos do mesmo incidente também colapsam', () => {
  const lentas = [7378, 8902, 12044].map((ms) => ({
    step: 'Monitor_slow_request',
    component_name: 'GlobalMonitor',
    message: `Requisição lenta: ${ms}ms`,
  }));
  assert.equal(new Set(lentas.map(assinar)).size, 1);

  const perf = [8902, 9110].map((ms) => ({
    step: 'Monitor_performance',
    component_name: 'GlobalMonitor',
    message: `Performance degradada: ${ms}ms médio`,
  }));
  assert.equal(new Set(perf.map(assinar)).size, 1);
});

test('erro genuinamente diferente NÃO é engolido', () => {
  // Steps diferentes continuam separados...
  assert.notEqual(
    assinar({ step: 'Monitor_rate_limit_risk', component_name: 'GlobalMonitor', message: '99 req' }),
    assinar({ step: 'Monitor_slow_request', component_name: 'GlobalMonitor', message: '99 req' })
  );
  // ...componentes diferentes também...
  assert.notEqual(
    assinar({ step: 'X', component_name: 'GlobalMonitor', message: 'falhou' }),
    assinar({ step: 'X', component_name: 'Catalog', message: 'falhou' })
  );
  // ...e mensagens que diferem por PALAVRA seguem distintas.
  assert.notEqual(
    assinar({ step: 'X', component_name: 'Y', message: 'timeout ao cotar frete' }),
    assinar({ step: 'X', component_name: 'Y', message: 'recusado ao cotar frete' })
  );
});
