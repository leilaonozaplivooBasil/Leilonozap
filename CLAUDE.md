# Instruções para o Claude neste projeto

## Como falar comigo

- **Sempre responda em português do Brasil.**
- Use **linguagem simples, do dia a dia**, como se estivesse explicando para alguém que entende do negócio mas não é programador.
- **Evite jargão técnico.** Quando um termo técnico for mesmo necessário, explique logo em seguida com palavras simples.
- Prefira frases curtas e diretas: o que foi feito, o que funciona e o que ainda falta.
- Pode citar o nome de arquivos e telas quando isso ajudar a localizar as coisas — mas diga também para que servem.

## Merge de Pull Requests

- **Autorização permanente (19/08/2026):** pode mesclar um Pull Request sozinho, sem
  perguntar antes, sempre que o CI estiver verde **e** você mesmo já tiver revisado o
  diff linha por linha. Não precisa esperar revisão de ferramenta externa (ex.:
  CodeRabbit) — ela é conselheira, não é bloqueio técnico do GitHub.
- **Exceção:** PR que toca em qualquer arquivo marcado 🔴 zona vermelha no
  `.coderabbit.yaml` (pagamento, carteira, lances) continua exigindo autorização
  explícita antes de mesclar — não decida sozinho nesses casos.
