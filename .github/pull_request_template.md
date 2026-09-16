## O que muda, e por quê

<!-- Uma frase que alguém entenda daqui a seis meses. -->

---

## 🚦 Antes de mesclar — conferência de colisão

> **Por que isto existe:** em 15/09/2026 outro chat aplicou três migrações
> direto na produção, sem arquivo no repositório. Uma delas revogou o acesso da
> chave publicável a `app_users` e **derrubou o login por e-mail**, porque o
> `plataformaAdapter` lê com `select('*')`. Ninguém errou de propósito — faltou
> um lugar onde desse pra ver que duas frentes mexiam na mesma coisa.

- [ ] Rodei `npm run colisao` e li o que ele apontou
- [ ] **Avisei o outro chat** sobre os arquivos em comum
- [ ] Conferi se há migração registrada no banco **sem arquivo aqui**
- [ ] Se este PR tem migração: o número do arquivo bate com o registrado no banco

## Prova

- [ ] `npm test`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] Rodada de mutação nos trechos novos (quais mutações, e que todas morreram)

## Zona de risco

- [ ] Não toca arquivo 🔴 — ou toca, e tenho autorização explícita escrita aqui
- [ ] Não altera leilão que já está no ar
