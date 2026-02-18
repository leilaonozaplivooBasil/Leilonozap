+# Guia de Publicação na Google Play Store

Este guia descreve os passos para gerar a versão final do aplicativo (Release) e publicá-lo na loja.

## 1. Preparação da Versão
Antes de gerar o build, verifique o arquivo `android/app/build.gradle`:
- **versionCode**: Incremente este número a cada atualização (ex: 1, 2, 3...).
- **versionName**: O nome visível para o usuário (ex: "1.0.0", "1.1.0").

## 2. Gerar Chave de Assinatura (Keystore)
O Android exige que todos os apps sejam assinados digitalmente.
Execute este comando na raiz do projeto para criar sua chave (se ainda não tiver uma):

```bash
keytool -genkey -v -keystore leilao-release.keystore -alias leilao-key -keyalg RSA -keysize 2048 -validity 10000
```
*Guarde este arquivo `leilao-release.keystore` e a senha em local seguro! Se perder, você não poderá atualizar o app na loja.*

## 3. Gerar o App Bundle (AAB)
O formato recomendado pela Google é o `.aab` (Android App Bundle), não mais o `.apk`.

Você pode gerar pelo Android Studio ou via terminal:

### Opção A: Via Terminal (Recomendado se tiver `keytool` e `jarsigner`)
Para gerar uma versão assinada via linha de comando facilmente:

1. Gere o bundle release (não assinado ainda, ou assinado com debug):
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
   *O arquivo será gerado em: `android/app/build/outputs/bundle/release/app-release.aab`*

2. Assine o AAB manualmente (usando `jarsigner`):
   ```bash
   jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ../leilao-release.keystore app/build/outputs/bundle/release/app-release.aab leilao-key
   ```
   *(Você precisará digitar a senha do keystore)*

### Opção B: Via Android Studio (Mais Visual)
1. Abra a pasta `android` no Android Studio.
2. Vá no menu **Build** > **Generate Signed Bundle / APK**.
3. Escolha **Android App Bundle**.
4. Selecione seu keystore gerado no passo 2 e preencha as senhas.
5. Selecione a variante **release**.
6. Clique em **Create**.
   *O Android Studio irá gerar o arquivo .aab assinado e pronto para upload.*

## 4. Google Play Console
1. Acesse [play.google.com/console](https://play.google.com/console).
2. Crie uma conta de desenvolvedor (taxa única de $25).
3. Clique em **Criar app**.
   - Nome: Leilão NoZap
   - Idioma: Português (Brasil)
   - Tipo: App
   - Gratuito
4. Preencha as seções obrigatórias:
   - **Painel**: Configure a política de privacidade, acesso a apps, classificação de conteúdo, público-alvo, etc.
   - **Loja Presente**: Upload do ícone (512x512), screenshots e descrição.
5. **Versão de Produção**:
   - Vá em "Produção" no menu lateral.
   - "Criar nova versão".
   - Faça upload do arquivo `.aab` assinado que você gerou.
   - Revise e lance a versão.

## Dicas Importantes
- **Assets**: Tenha screenshots de alta qualidade prontos (Phone, Tablet 7", Tablet 10").
- **Privacidade**: Você precisará de uma URL com a Política de Privacidade do app.
- **Testes**: Recomenda-se lançar primeiro em "Teste Interno" ou "Teste Fechado" antes da Produção para garantir que tudo funcione em dispositivos reais.
