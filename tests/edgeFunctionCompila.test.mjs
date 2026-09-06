// 06/09/2026, 02h30 — o deploy foi recusado:
//
//   Failed to bundle the function (reason: The module's source code could not be parsed:
//   Expected ';', got 'canal' at .../whatsapp-router/index.ts:1813:54)
//
// Uma crase em volta de `canal` DENTRO de um template literal. A crase fechou a string e o
// resto do prompt virou código. Erro de dez segundos para consertar — e passou por tudo:
//
//   npm test    ✅  os testes do router extraem PEDAÇOS do index.ts (corpo de uma função,
//                   corpo de uma tool) e rodam só aquilo. Nenhum lê o arquivo inteiro.
//   npm run lint ✅  o eslint deste projeto não cobre supabase/functions/**.
//   npm run build ✅ o vite compila só o front (src/**). A Edge Function não passa por ele.
//   node --check  ✅ (!) não enxerga erro de sintaxe em .ts — testado, devolve rc=0 no arquivo
//                   quebrado. Não serve de rede aqui.
//
// Ou seja: até hoje NADA no repositório lia a Edge Function inteira. Um erro de sintaxe só
// aparecia no deploy, depois do merge, com a função anterior ainda no ar e o dono esperando.
//
// Este arquivo fecha esse buraco: passa o compilador do TypeScript em cada arquivo da função
// e exige zero erro de sintaxe. É o mesmo parser que o Deno/esbuild usa no deploy, então o que
// passa aqui passa lá.
//
// Não é typecheck — tipo errado não quebra o deploy, sintaxe quebra. O alvo é a sintaxe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import ts from 'typescript';

const DIR = new URL('../supabase/functions/whatsapp-router/', import.meta.url);

const arquivos = readdirSync(DIR).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));

test('a Edge Function tem arquivos de código para conferir', () => {
  assert.ok(arquivos.length >= 4, `esperava index.ts e companhia, achei: ${arquivos.join(', ')}`);
  assert.ok(arquivos.includes('index.ts'));
});

for (const nome of arquivos) {
  test(`${nome} — sintaxe válida (o que o deploy vai tentar bundlar)`, () => {
    const fonte = readFileSync(new URL(nome, DIR), 'utf8');
    const { diagnostics } = ts.transpileModule(fonte, {
      reportDiagnostics: true,
      fileName: nome,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        allowJs: true,
      },
    });

    const erros = (diagnostics || []).map((d) => {
      const pos = d.file && d.start != null
        ? ts.getLineAndCharacterOfPosition(d.file, d.start)
        : null;
      const onde = pos ? `${nome}:${pos.line + 1}:${pos.character + 1}` : nome;
      return `${onde} — ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`;
    });

    assert.deepEqual(
      erros, [],
      `o deploy vai recusar este arquivo:\n  ${erros.join('\n  ')}`,
    );
  });
}
