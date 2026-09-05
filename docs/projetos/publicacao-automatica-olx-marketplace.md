# Projeto — Agente de publicação automática (OLX e Facebook Marketplace)

> **Status: GUARDADO PARA IMPLEMENTAÇÃO FUTURA. Nada foi construído.**
> Recebido do dono em 05/09/2026. Nenhuma linha de código deste projeto existe
> no repositório, e nenhuma fase foi iniciada.

O documento original vai **íntegro** na segunda metade deste arquivo, sem edição.
Antes dele vão as notas de recepção: o que já existe na casa e serve, o que
precisa ser decidido, e um conflito interno do próprio documento que precisa ser
resolvido **antes** da Fase 1.

---

## Notas de recepção (05/09/2026)

### O que já existe na casa e reaproveita

| Já temos | Serve para |
|---|---|
| **2.856 produtos** em `public.products` com `description`, `image_urls`, `price_catalog`, `category_id`, `quantity` | a fonte de dados que o projeto exige — sem banco paralelo, como ele pede |
| **Playwright + Chromium** já configurados (`tests/navegador/`, `/opt/pw-browsers/`) e 4 bancas rodando | a automação de navegador não começa do zero |
| **Supabase Edge Functions** (`whatsapp-router`) com tool-calling da Claude | o padrão de agente com ferramentas já está de pé e testado |
| **8 crons na Vercel** (`vercel.json`) | agendamento e reprocessamento |
| **Padrão de extrato append-only** (`reserva_ledger`, `campanha_envios`) | o registro de publicações que o projeto pede |

### O que **falta** e não é pouco

- **1.011 dos 2.856 produtos estão sem categoria.** O projeto depende de categorizar
  para escolher a categoria da OLX/Marketplace. Isso é a demanda de categorização que
  já está em aberto — vira pré-requisito desta.
- **Nenhum controle de qualidade de imagem** existe hoje. Há 24 produtos com foto
  emprestada de terceiros, pendência antiga e não resolvida.
- **Nenhuma infra de fila/worker.** Os crons de hoje são tarefas simples, não fila com
  retry e paralelismo.
- **Vercel Functions têm teto de tempo curto** — automação de navegador com login e
  upload de imagem não cabe lá. Precisa de outro lugar para rodar (container próprio,
  runner dedicado). É a primeira decisão de arquitetura.

### 🔴 Um conflito dentro do próprio documento — resolver antes da Fase 1

A última linha do documento diz:

> *"Não implemente automações que violem os Termos de Serviço da OLX ou do Facebook"*

E o corpo pede automação de navegador que faz login, cria anúncio e publica agindo
"exatamente como um usuário humano", explicitamente **porque** as APIs são limitadas.

Os **Termos do Facebook proíbem** acesso automatizado e ações automatizadas sem
permissão escrita — inclusive login automatizado e publicação por script. Fazer o
agente "agir como humano" para contornar isso é o que os Termos chamam de acesso não
autorizado. A OLX tem restrição equivalente para automação de anúncios.

Ou seja: a instrução final e o método pedido **não cabem juntos** no Marketplace.
Isso não é detalhe jurídico distante — o risco concreto é **banimento da conta** e
perda do canal, o mesmo tipo de risco já levantado no plano de remarketing (Z-API).

**Três caminhos, para o dono decidir — a decisão precede o código:**

1. **Só OLX**, se e quando houver caminho autorizado (parceria/integração oficial),
   e Marketplace fora.
2. **Semiautomático**: o agente prepara tudo (título, descrição, imagens tratadas,
   categoria, atributos) e entrega pronto para uma pessoa colar e publicar. Elimina
   99% do trabalho manual sem contornar Termos.
3. **Buscar acesso oficial** (API de catálogo/parceria do Marketplace) e automatizar
   dentro do que é permitido.

**Minha recomendação:** começar pelo caminho 2. Ele entrega a maior parte do valor
(a IA que gera título, descrição, escolhe categoria e trata imagem é 80% do projeto e
não depende de automação de navegador), não arrisca conta nenhuma, e mantém as portas
1 e 3 abertas. A automação de publicação entra depois, na plataforma onde for legítima.

### Fases sugeridas (a confirmar quando o projeto for retomado)

| Fase | Entrega | Depende de |
|---|---|---|
| **0** | Decidir o caminho acima (1, 2 ou 3) | dono |
| **1** | Categorização dos 1.011 produtos sem categoria | demanda já aberta |
| **2** | Motor de IA: título, descrição, palavras-chave e categoria por plataforma | Fase 1 |
| **3** | Tratamento de imagem (redimensionar, comprimir, ordenar, converter) | — |
| **4** | Fila + workers + extrato de publicações + painel | Fase 0 |
| **5** | Publicação propriamente dita | Fase 0 |

---

## Documento original, na íntegra

> O que vem abaixo é o texto recebido do dono, sem uma vírgula alterada.

---

# PROMPT MASTER

Você atuará como **Arquiteto de Software Sênior, Tech Lead, Engenheiro de IA, Especialista em Browser Automation, MCP, Playwright, Agentes Inteligentes e Arquitetura Escalável.**

Sua missão NÃO é apenas escrever código.

Sua missão é projetar e construir uma plataforma profissional, modular, escalável e preparada para evolução contínua.

Você deve tomar decisões técnicas como um arquiteto experiente.

Sempre que existir uma solução superior à que eu sugeri, explique os motivos e utilize a melhor arquitetura possível.

---

# CONTEXTO DA EMPRESA

A empresa chama-se **Leilão NoZap**.

Possuímos uma plataforma própria completamente integrada.

Nossa plataforma possui:

- loja virtual
- sistema de leilões
- gestão completa de estoque
- cadastro completo dos produtos
- imagens
- descrições
- categorias
- controle de estoque
- banco de dados

Toda essa plataforma já está integrada ao Claude Code.

O Claude Code participa do desenvolvimento de praticamente todo nosso ecossistema.

A operação manual da empresa é praticamente apenas:

- logística
- atendimento
- vendas

Todo o restante queremos automatizar utilizando IA.

---

# OBJETIVO

Quero construir um Agente Inteligente capaz de publicar automaticamente nossos produtos em:

## Plataformas

- OLX
- Facebook Marketplace

NENHUMA outra plataforma será utilizada.

Não preciso de Mercado Livre.

Não preciso de Shopee.

Não preciso de Amazon.

O foco é exclusivamente:

- OLX
- Facebook Marketplace

---

# IMPORTANTE

Essas plataformas possuem APIs limitadas.

Portanto NÃO quero uma solução baseada em API.

Quero um agente que utilize automação de navegador.

O agente deverá agir exatamente como um usuário humano.

---

# OBJETIVO FINAL

O sistema deverá funcionar praticamente sem intervenção humana.

Fluxo desejado:

Novo produto disponível

↓

IA identifica o produto

↓

Busca informações na plataforma

↓

Busca imagens

↓

Analisa qualidade

↓

Caso necessário trata automaticamente

↓

Gera título otimizado

↓

Gera descrição otimizada

↓

Seleciona categoria

↓

Seleciona atributos

↓

Abre navegador

↓

Publica na OLX

↓

Publica no Facebook Marketplace

↓

Salva links

↓

Atualiza banco

↓

Registra logs

↓

Finaliza

---

# FONTE DOS DADOS

Os produtos NÃO serão cadastrados manualmente.

Eles já existem dentro da nossa plataforma.

Todo produto possui informações como:

Nome

Descrição

Categoria

Marca

Preço

Quantidade

Fotos

Código interno

Estoque

Status

Portanto o agente deverá consumir essas informações diretamente da nossa plataforma.

Não quero duplicação de dados.

Não quero banco paralelo de produtos.

---

# INTELIGÊNCIA ARTIFICIAL

A IA deverá melhorar automaticamente todas as informações antes da publicação.

Exemplos:

Criar títulos específicos para OLX.

Criar títulos específicos para Marketplace.

Gerar descrições mais persuasivas.

Adicionar técnicas de copywriting.

Melhorar SEO interno.

Gerar palavras-chave.

Adaptar limite de caracteres.

Adaptar linguagem.

Nunca utilizar exatamente a descrição original.

---

# IMAGENS

O agente deverá analisar automaticamente as imagens.

Caso necessário:

redimensionar

comprimir

melhorar qualidade

organizar ordem

criar miniaturas

converter formato

Tudo automaticamente.

---

# PUBLICAÇÃO

Desejo automação completa.

Abrir navegador.

Efetuar login quando necessário.

Persistir sessões.

Persistir cookies.

Criar anúncio.

Enviar imagens.

Preencher campos.

Selecionar categoria.

Selecionar localização.

Publicar.

Capturar confirmação.

Salvar URL.

Registrar sucesso.

---

# TECNOLOGIAS

Você deverá decidir a melhor arquitetura.

Pode utilizar:

Playwright

Browser Use

Stagehand

MCP

Vision Models

Computer Use

Agentes

LLMs

Workers

Filas

Escolha sempre a melhor solução.

Não quero código desnecessário.

Não quero soluções frágeis.

---

# RESILIÊNCIA

Caso algum elemento da página mude:

o agente deverá localizar novamente.

Caso um botão desapareça:

o agente deverá procurar equivalente.

Caso um campo seja movido:

o agente deverá identificar.

Evite depender exclusivamente de seletores CSS fixos.

Utilize IA quando isso aumentar robustez.

---

# CAPTCHAS

Caso exista captcha:

interrompa apenas aquela execução.

registre.

gere screenshot.

notifique.

permita retomada.

---

# LOGIN

O sistema deverá manter sessão persistente.

Evitar logins repetidos.

Persistir cookies.

Renovar sessão automaticamente.

---

# BANCO DE DADOS

Registrar:

Produto

Plataforma

Data

Hora

Status

Tempo

Logs

Screenshot

URL publicada

Mensagens de erro

---

# LOGS

Registrar detalhadamente.

Exemplo:

Inicializando

Buscando produto

Buscando imagens

Tratando imagens

Gerando título

Gerando descrição

Abrindo navegador

Entrando na OLX

Publicando

Confirmando publicação

Atualizando banco

Finalizado

---

# DASHBOARD

Criar painel contendo:

Fila

Produtos

Publicações

Erros

Tempo médio

Histórico

Execuções

Status

---

# ESCALABILIDADE

Hoje podemos publicar poucos anúncios.

Amanhã podemos publicar milhares.

A arquitetura deverá permitir:

Workers

Filas

Execuções paralelas

Retry

Reprocessamento

Agendamento

Escalabilidade horizontal

---

# MODULARIZAÇÃO

Desejo arquitetura modular.

Exemplo:

Core

↓

Produtos

↓

IA

↓

Tratamento Imagens

↓

Fila

↓

Executor

↓

Playwright

↓

OLX

↓

Marketplace

↓

Logs

↓

Dashboard

Cada módulo deverá ser independente.

---

# PADRÕES

Utilize princípios como:

SOLID

Clean Architecture

DDD (quando fizer sentido)

Repository Pattern

Dependency Injection

Services

Workers

Event Driven

MCP quando agregar valor.

---

# DOCUMENTAÇÃO

Toda implementação deverá possuir documentação.

Explique:

Arquitetura

Fluxo

Estrutura

Pastas

Dependências

Como instalar

Como atualizar

Como adicionar funcionalidades

Como realizar manutenção

---

# FORMA DE TRABALHO

NÃO implemente tudo de uma única vez.

Quero dividir o projeto em fases.

Antes de escrever código:

1. Analise completamente o problema.

2. Projete a arquitetura.

3. Identifique riscos.

4. Sugira melhorias.

5. Explique decisões técnicas.

6. Somente depois inicie a implementação.

Cada etapa deve ser aprovada antes de prosseguir.

---

# LIBERDADE TÉCNICA

Você possui liberdade para substituir qualquer tecnologia caso exista uma alternativa superior.

Sempre justifique.

Priorize:

robustez

escalabilidade

segurança

manutenção

baixo acoplamento

alta coesão

uso intensivo de IA

automação máxima

mínima intervenção humana

---

# RESULTADO ESPERADO

O resultado final não deve ser apenas um robô que publica anúncios.

Quero construir uma plataforma inteligente de publicação automatizada baseada em agentes de IA, integrada ao ecossistema da Leilão NoZap, capaz de evoluir continuamente, adaptar-se a mudanças nas interfaces da OLX e do Facebook Marketplace e operar de forma confiável, resiliente e escalável.

Não implemente automações que violem os Termos de Serviço da OLX ou do Facebook e que toda automação seja projetada para minimizar bloqueios, com controle de taxa de publicações, pausas aleatórias, persistência de sessão e monitoramento de falhas.