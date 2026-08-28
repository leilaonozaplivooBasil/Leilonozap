# PLANO DE PUBLICAÇÃO — Leilão NoZap em App Stores (iOS e Android)

**Status:** Planejamento apenas — NENHUMA ALTERAÇÃO DE CÓDIGO OU INFRAESTRUTURA  
**Data:** 28 de agosto de 2026  
**Escopo:** Documentação completa de todas etapas para publicação em Apple Store e Google Play Store

---

## 1. CONTEXTO E OBJETIVO

Atualmente o Leilão NoZap existe como:
- **Web:** React/Vite (PWA-ready) — `src/App.tsx`, `capacitor.config.ts`
- **Mobile Android:** Capacitor wrapper — `android/` directory existente
- **Mobile iOS:** Capacitor wrapper — `ios/` directory (precisa criar/atualizar)

**Objetivo final:** Publicar versões native iOS e Android em suas respectivas lojas, mantendo código compartilhado (monorepo via Capacitor).

**Resultado esperado:**
- App disponível na Apple App Store (iOS 14.0+)
- App disponível na Google Play Store (Android 8.0+)
- Ambos sincronizados com código-fonte único
- Processo de atualização automático via CI/CD

---

## 2. ARQUITETURA E FLUXO GERAL

### 2.1 Estrutura de Código (Não muda, já está em lugar)
```
leilonozap/
├── src/                    # Código React compartilhado (Web + Mobile)
├── android/                # Wrapper Capacitor para Android (presente)
├── ios/                    # Wrapper Capacitor para iOS (presente ou criar)
├── capacitor.config.ts     # Configuração Capacitor (presente)
└── [build artifacts]       # Gerados pelo build
```

### 2.2 Fluxo de Publicação (Alto Nível)

```
Código-fonte (main branch)
    ↓
Build React (npm run build)
    ↓
├─ Sync Capacitor (npx cap sync)
│   ├─ Android (npx cap sync android)
│   └─ iOS (npx cap sync ios)
│
├─ Build Android (./gradlew bundleRelease → app-release.aab)
│   └─ Sign & Upload Google Play Console
│
└─ Build iOS (xcodebuild → app.ipa)
    └─ Sign & Upload App Store Connect
```

---

## 3. PRÉ-REQUISITOS E CONTAS (Stage 0)

### 3.1 Contas Necessárias

| Conta | Status | Custo | Ação Necessária |
|---|---|---|---|
| **Google Play Console** | ❌ Verificar | $25 USD (única vez) | Criar conta de dev se não existe |
| **Apple App Store Connect** | ❌ Verificar | $99 USD/ano | Associar Apple ID com Team ID |
| **Apple Developer Program** | ❌ Verificar | $99 USD/ano | Enroll se ainda não está |
| **GitHub Secrets** (CI/CD) | ❌ Verificar | — | Armazenar chaves de assinatura |

### 3.2 Máquina Local: Requisitos de Tooling

| Ferramenta | Versão Mín. | Propósito | Windows/Mac/Linux |
|---|---|---|---|
| Node.js | 18+ | Build React | ✓ Todos |
| npm / yarn | 9+ | Package manager | ✓ Todos |
| Capacitor CLI | 5+ | Sincronização native | ✓ Todos |
| Android SDK | 34 (Target) | Build Android | ✓ Mac/Linux/Windows |
| Android Studio | Latest | IDE + tools | ✓ Todos |
| Gradle | 8.0+ | Build system Android | ✓ Todos |
| Java / OpenJDK | 17+ | Runtime Android | ✓ Todos |
| Xcode | 15+ | Build iOS | ✅ Mac ONLY |
| CocoaPods | 1.13+ | Dependency manager iOS | ✅ Mac ONLY |
| Ruby | 2.7+ | Xcode scripts iOS | ✅ Mac ONLY |

**Ação:** Verificar cada ferramenta com `--version`; instalar faltantes via Homebrew (Mac), apt/yum (Linux), ou instaladores (Windows).

### 3.3 Certificados e Chaves (Geração)

#### Android: Keystore para Assinatura

```bash
# Executar UMA VEZ — gera arquivo .keystore (guarde com segurança!)
keytool -genkey -v -keystore leilao-release.keystore \
  -alias leilao-key \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass <SENHA_SEGURA> \
  -keypass <SENHA_SEGURA>

# Resultado: arquivo `leilao-release.keystore` (guardar em cofre/backup)
# Fingerprint da chave: `keytool -list -v -keystore leilao-release.keystore`
```

**Ação:** Gerar e armazenar em local seguro (1Password, Vault, ou backup encriptado).  
**⚠️ CRÍTICO:** Perder este arquivo = impossível atualizar app na Play Store.

#### iOS: Certificate Signing Request (CSR) + Apple Certificates

1. Gerar CSR no Mac:
   ```bash
   # Keychain Access.app → Certificate Assistant → Request a Certificate from a Certificate Authority
   # Salvar como: `leilao_nozap.certSigningRequest`
   ```

2. Upload CSR em Apple Developer Portal:
   - Identifiers → App IDs → "Leilão NoZap"
   - Certificates → Create new → iOS App Development / Distribution
   - Upload CSR → Download `.cer`

3. Importar no Keychain:
   ```bash
   # Double-click no arquivo .cer baixado
   # Ou: open /path/to/certificate.cer
   ```

**Ação:** Completar flow em Apple Developer Portal; CSRs e certificados controlados por Apple.

### 3.4 Preparação de Assets (Imagens/Descrição)

| Asset | Dimensão | Formato | Quantidade |
|---|---|---|---|
| **App Icon** | 1024×1024 | PNG | 1 |
| **Screenshots (Phone)** | 1080×1920 | JPG/PNG | 2–5 |
| **Screenshots (Tablet 7")** | 1200×1920 | JPG/PNG | 2–5 |
| **Screenshots (Tablet 10")** | 1280×1920 | JPG/PNG | 1–3 |
| **Feature Graphic (Android)** | 1024×500 | PNG | 1 |
| **App Preview Video (iOS)** | 1920×1080 / 1080×1920 | MP4 | 1–3 (opcional) |

**Ação:** Preparar screenshots em cada idioma/dimensão; incluir em repositório em `assets/store-assets/`.

---

## 4. FASE 1 — ESTRUTURA E CONFIGURAÇÃO (Semana 1)

**Objetivo:** Preparar repositório, contas e configurações iniciais.

### 4.1 Criar/Atualizar Capacitor Config

Arquivo: `capacitor.config.ts` (já existe, revisar)

```typescript
// Garantir que existem:
const config: CapacitorConfig = {
  appId: 'com.leilaonozap.app',      // ID único (com.empresa.produto)
  appName: 'Leilão NoZap',             // Nome exibido
  webDir: 'dist',                      // Pasta de build do React
  server: {
    androidScheme: 'https',            // Force HTTPS em Android
  },
  plugins: {
    // Listar plugins Capacitor que serão usados
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FFFFFF',
    },
    Keyboard: {
      resize: 'native',
    },
  },
};
```

**Ação:** Validar contra a versão em repositório; ajustar se necessário.

### 4.2 Android: Configurar gradle (build.gradle.kts ou build.gradle)

Arquivo: `android/app/build.gradle` (já existe, revisar valores)

```gradle
android {
  compileSdkVersion 34              // Manter atualizado
  
  defaultConfig {
    applicationId = "com.leilaonozap.app"
    minSdkVersion = 26               // Mín. Android 8.0 (API 26)
    targetSdkVersion = 34            // Target latest Google Play exige
    versionCode = 1                  // Incrementa a cada build (1, 2, 3...)
    versionName = "1.0.0"            // Semântico (1.0.0, 1.0.1, 1.1.0...)
  }
  
  signingConfigs {
    release {
      storeFile = file("../leilao-release.keystore")
      storePassword = System.getenv("KEYSTORE_PASSWORD")  // Via env var
      keyAlias = "leilao-key"
      keyPassword = System.getenv("KEYSTORE_KEY_PASSWORD")
    }
  }
  
  buildTypes {
    release {
      signingConfig = signingConfigs.release
      minifyEnabled = true
      proguardFiles(getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro")
    }
  }
}
```

**Ação:** Verificar valores; senhas vão em GitHub Secrets (CI/CD), não em arquivo.

### 4.3 iOS: Preparar Projeto Xcode

Arquivo: `ios/App/App.xcodeproj/project.pbxproj` (gerado por Capacitor, revisar manualmente em Xcode)

1. Abrir em Xcode:
   ```bash
   open ios/App/App.xcworkspace
   ```

2. Verificar em Xcode:
   - General → Bundle Identifier: `com.leilaonozap.app`
   - General → Version: `1.0.0`
   - General → Build: `1`
   - Signing & Capabilities → Team ID (Apple ID associado)
   - Signing & Capabilities → Provisioning Profile (gerado automaticamente se Team ID correto)

**Ação:** Validar no Xcode; deixar Team ID auto-assinar (Xcode gerencia para desenvolvimento local).

### 4.4 Integração com GitHub (CI/CD Template)

Arquivo: `.github/workflows/publish-app-stores.yml` (criar, TEMPLATE APENAS)

```yaml
# ⚠️ TEMPLATE — NÃO ATIVA AUTOMATICAMENTE
# Uso: Gatilho manual ou schedule (após teste em ambiente staging)

name: "[TEMPLATE] Publish to App Stores"
on:
  workflow_dispatch:  # Manual trigger apenas
    inputs:
      version:
        description: 'Version to publish (e.g., 1.0.0)'
        required: true

jobs:
  publish-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Build React
        run: npm run build
      
      - name: Sync Capacitor
        run: npx cap sync android
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v3
      
      - name: Build AAB
        run: |
          cd android
          ./gradlew bundleRelease \
            -Pandroid.injected.signing.store.file=../leilao-release.keystore \
            -Pandroid.injected.signing.store.password=${{ secrets.KEYSTORE_PASSWORD }} \
            -Pandroid.injected.signing.key.alias=leilao-key \
            -Pandroid.injected.signing.key.password=${{ secrets.KEYSTORE_KEY_PASSWORD }}
      
      - name: Upload to Google Play
        # Usar ferramenta como fastlane ou google-play-api
        run: |
          # Placeholder — implementar com credenciais corretas
          echo "AAB pronto em: android/app/build/outputs/bundle/release/app-release.aab"

  publish-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Build React
        run: npm run build
      
      - name: Sync Capacitor
        run: npx cap sync ios
      
      - name: Build iOS
        run: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace \
            -scheme App \
            -configuration Release \
            -derivedDataPath build \
            -archivePath build/App.xcarchive \
            archive
      
      - name: Export IPA
        # Placeholder — implementar com export options
        run: echo "IPA pronto para App Store Connect"

  notify:
    runs-on: ubuntu-latest
    needs: [publish-android, publish-ios]
    steps:
      - name: Notify Slack
        run: |
          # Notificar em #top-tech-digital sobre publicação
          echo "Apps publicados!"
```

**Ação:** Criar arquivo como template; ativar apenas após testes em staging.

---

## 5. FASE 2 — BUILD LOCAL E TESTE (Semana 2)

**Objetivo:** Executar build completo localmente; validar funcionamento em dispositivos reais.

### 5.1 Build da Web

```bash
npm run build       # Gera dist/
npm run preview     # Teste local do build
```

**Checklist:**
- [ ] Sem erros de TypeScript (`npm run lint`)
- [ ] Sem erros de build (`npm run build`)
- [ ] Todos assets carregam corretamente
- [ ] Funcionalidades críticas (busca, leilão, carrinho, checkout) testadas

### 5.2 Sincronizar Capacitor e Build Android

```bash
# 1. Sync (copia web dist → Android assets)
npx cap sync android

# 2. Build APK para teste (não assinado)
cd android
./gradlew installDebug   # Instala direto em dispositivo/emulador conectado

# 3. Build AAB para Play Store (assinado)
./gradlew bundleRelease  # Requer env vars KEYSTORE_PASSWORD, KEYSTORE_KEY_PASSWORD
```

**Teste em dispositivo:**
- [ ] Emulador Android 8.0 (API 26)
- [ ] Emulador Android 14+ (API 34)
- [ ] Dispositivo real Android (se possível)
- [ ] Funcionalidades específicas: câmera (se usada), localização, storage

**Resultado esperado:** `android/app/build/outputs/bundle/release/app-release.aab` pronto.

### 5.3 Sincronizar Capacitor e Build iOS

```bash
# 1. Sync (copia web dist → iOS assets)
npx cap sync ios

# 2. Abrir no Xcode
open ios/App/App.xcworkspace

# 3. Testar no Xcode (run em simulador)
# Em Xcode: Product → Run (simulador iPhone 15)

# 4. Build Archive para TestFlight/App Store
# Em Xcode: Product → Archive
# (Isto gera um .xcarchive pronto para export)
```

**Teste em simulador:**
- [ ] Simulador iPhone 15 (iOS 17+)
- [ ] Simulador iPhone SE (iOS 14, mín. suportado)
- [ ] Funcionalidades específicas: notificações (push), deep linking

**Resultado esperado:** `.xcarchive` gerado, pronto para exportar como `.ipa`.

### 5.4 Exportar e Validar IPA (iOS)

```bash
# Em Xcode, após Archive:
# 1. Organizer → Archives → Select archive → Distribute App
# 2. Choose: App Store Connect
# 3. Follow prompts (cert, provisioning profile, etc)
# 4. Resultado: .ipa file

# Validar com Apple tools:
xcrun altool --validate-app -f /path/to/App.ipa \
  -t ios -u <apple-id> -p <app-specific-password>
```

---

## 6. FASE 3 — CONTAS EM LOJAS E PRIMEIROS ENVIOS (Semana 3)

**Objetivo:** Criar presença em lojas; fazer primeiro envio para testes (TestFlight/Internal Testing).

### 6.1 Google Play Console

#### Setup Inicial

1. Acessar [play.google.com/console](https://play.google.com/console)
2. Criar app:
   - Nome: "Leilão NoZap"
   - Tipo: Apps
   - Categoria: Shopping
   - Idioma: Portuguese (Brazil)

#### Seções Obrigatórias (antes de qualquer envio)

| Seção | O Que Preencher | Notas |
|---|---|---|
| **Informações do App** | ID do app, ícone, categoria | Descrição curta/longa |
| **Política de Privacidade** | URL completa | Obrigatória; hospedar em site |
| **Permissões & Políticas** | Consentimento de classificação | Respondidas no formulário |
| **Classificação de Conteúdo** | Google Play Questionnaire | Algumas perguntas; gera rating |
| **Público-alvo** | Idade mín., conteúdo | Ex: 13+, Famílias |
| **Localização Geográfica** | País/região onde vender | Brasil é obrigatório |

**Ação:** Preencher todas antes de enviar qualquer .aab.

#### Criar Teste Interno (Internal Testing)

1. No console: **Testing** → **Internal Testing**
2. Criar grupo de teste "Internal"
3. Adicionar testers: emails do time (ou seus próprios emails)
4. Upload do `.aab`
5. Revisar lançamento → Publicar no Internal Testing

**Tempo esperado:** Minutos a poucas horas para revisão automática.

**Ação:** Recrutar 3–5 testadores; coletar feedback.

### 6.2 App Store Connect (iOS)

#### Setup Inicial

1. Acessar [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Criar novo app:
   - Nome: "Leilão NoZap"
   - Bundle ID: `com.leilaonozap.app` (ou `com.leilaonozap.ios` se separado)
   - SKU: `leilao_nozap_001` (único internamente)

#### Seções Obrigatórias (App Store)

| Seção | O Que Preencher | Notas |
|---|---|---|
| **App Information** | Bundle ID, categoria, privacidade | Categoria: Shopping |
| **Pricing and Availability** | Grátis ou pago; mercados | Selecionar Brasil |
| **App Preview / Screenshots** | Imagens em 3–5 idiomas | Requerido para cada idioma |
| **Description** | Texto em 3–5 idiomas | ~170 chars + 4000 descr. completa |
| **Keywords** | Tags de busca | ~100 chars |
| **Support URL** | Email ou página de suporte | Obrigatória |
| **Privacy Policy URL** | Link à política | Mesma do Google Play |
| **Age Rating** | Questionário IARC | Gera rating 4+/12+/17+ |
| **App Review Information** | Login test account (se needed) | Se app tiver paywall/assinatura |

**Ação:** Preencher todas seções com valores localizados (pt-BR e en-US mín.).

#### Criar Versão para TestFlight

1. Em App Store Connect: **TestFlight** → **Builds**
2. Upload do `.ipa` (via Xcode ou Transporter)
3. Preencher "Build Details"
4. Submeter para revisão interna (rápido) e/ou externa (1–3 dias)
5. Convidar testadores via email

**Ação:** Recrutar 5–20 testadores via link TestFlight.

### 6.3 Feedback Loop (2–3 semanas)

- **Android Internal Testing:** Feedback dia 1–3
- **iOS TestFlight:** Feedback dia 1–3 (revisão interna) + dia 4–7 (revisão externa)
- **Coletar:** Crashes, UX feedback, sugestões
- **Priorizar:** Bugs críticos (crash) vs. enhancements
- **Iterar:** Enviar build v1.0.1, v1.0.2 etc com fixes

**Checklist de teste (ambos):**
- [ ] App abre e carrega home
- [ ] Login/cadastro funciona
- [ ] Busca de leilões funciona
- [ ] Detalhes de leilão carregam (imagens, descrição)
- [ ] Carrinho e checkout funcionam
- [ ] Pagamento PIX (sem processar!) é mockado ou integrado real
- [ ] Sem crashes em operações normais
- [ ] Sem permissões não-esperadas solicitadas
- [ ] Interface responsiva (landscape/portrait)

---

## 7. FASE 4 — SUBMISSÃO PARA PRODUÇÃO (Semana 4)

**Objetivo:** Enviar apps para review final nas lojas; aguardar aprovação.

### 7.1 Google Play Console — Produção

1. **Testing** → **Closed Testing** (opcional, entre Internal e Produção):
   - Grupo maior de testadores (50–1000)
   - Feedback durante 2–3 semanas antes de produção
   - Recomendado, mas pode pular para direto à Produção

2. **Production** → **Create new release**:
   - Upload do `.aab` final (v1.0.0)
   - Fill "Release notes" (texto em pt-BR):
     ```
     Versão inicial do Leilão NoZap!
     
     ✓ Busca e participação em leilões
     ✓ Pagamento via Mercado Pago (PIX)
     ✓ Histórico de compras
     ✓ Notificações push de leilões
     ```
   - Review & rollout percentage (recomendado: 5% → 10% → 50% → 100% ao longo de 1 semana)

3. **Submeter para revisão**:
   - Google Play revê em ~4 horas a 24 horas
   - Feedback via console (aceito = publicado automaticamente)

**Ação:** Enviar; monitorar console diariamente por aprovação/rejeição.

### 7.2 App Store Connect — Produção

1. **Version Release**:
   - Seção "App Store": Preencher todas seções (descrição, keywords, screenshots etc)
   - Seção "Build": Selecionar build TestFlight aprovado
   - Seção "App Review Information": Preencher dados para revisor Apple
     - Demo account (se app tem paywall)
     - Video demo (se funcionalidade não é óbvia)

2. **Submeter para App Review**:
   - Clique em "Submit for Review"
   - Apple revê em ~24–48 horas (pode levar 5 dias em períodos de pico)
   - Feedback via email + console

3. **Após aprovação**:
   - Escolher "Release This Version Manually" ou "Automatic Release" (7 dias após aprovação)
   - Versão vai ao App Store (todos veem ~30 min após ativação)

**Ação:** Enviar; preparar-se para possível rejeição (Apple é mais rigorosa que Google).

### 7.3 Possíveis Rejeições e Recursos

| Motivo | Frequência | Resolução |
|---|---|---|
| **Privacidade inadequada** | Comum | Atualizar Privacy Policy; desabilitar tracking desnecessário |
| **Permissões não justificadas** | Comum | Remover permissões não usadas (câmera, localização se não precisa) |
| **Performance/Crashes** | Médio | Fix bugs; enviar novo build |
| **UI/UX issue** | Médio | Ajustar design; garantir navegação clara |
| **Conteúdo ofensivo** | Raro | Revisar assets/texto |
| **Negócio proibido** | Raro (não aplica) | N/A — e-commerce é permitido |

**Ação:** Preparar recursos (appeal) se rejeitado; resubmeter com correções.

---

## 8. FASE 5 — PÓS-LANÇAMENTO E MONITORAMENTO (Ongoing)

**Objetivo:** Monitorar saúde do app em produção; gerenciar updates.

### 8.1 Métricas e Monitoring (Primeiras 2–4 semanas)

Acompanhar no console de cada loja:

| Métrica | Google Play | App Store | Ação |
|---|---|---|---|
| **Installs** | Console → Overview | App Analytics | Esperado: ramp-up lento |
| **Crashes** | Console → Vitals | Xcode Organizer | Crítico: < 0.1% crash rate |
| **Ratings** | Console → Rating | Ratings & Reviews | Esperado: 3.5–4.5 stars |
| **Reviews** | Console → Reviews | Ratings & Reviews | Ler feedback de 5★ e 1★ |
| **Uninstalls** | Console → Metrics | App Analytics | Anormal: > 20% = problema |

**Dashboard recomendado:**
- Plataforma de analytics (Amplitude, Mixpanel, ou Firebase Analytics)
- Sentry/Crashlytics para crash tracking automático
- Slack notification se: crash rate > 0.5%, install rate 0

**Ação:** Configurar alerts; revisar diariamente primeiras 2 semanas.

### 8.2 Bug Fixes e Patches (v1.0.1, v1.0.2...)

Fluxo para cada versão:
1. Fix no código-fonte (main branch, PR normal)
2. Merge e tag novo versionCode/versionName
3. Build novo (.aab e .ipa)
4. Testar em staging (emulador) ou TestFlight
5. Enviar para Play Console / App Store Connect
6. Rollout gradual (Google) ou automático (Apple)

**SLA sugerido:**
- **Critical bug (crash):** Fix + deploy em 4–24 horas
- **Major bug (feature broken):** Fix + deploy em 2–7 dias
- **Minor enhancement:** Batched em semanal ou quinzenal

**Ação:** Estabelecer processo de release; documentar em CONTRIBUTING.md.

### 8.3 Updates de Dependências

| Dependência | Frequência | Crítico? | Ação |
|---|---|---|---|
| **Capacitor** | Meses | Sim | Testar em ambos plataforms |
| **React** | Meses | Médio | Testar; pode quebrar plugins |
| **Android SDK Target** | Anual | Sim | Google Play exige `targetSdk = latest` |
| **iOS minimum version** | Anual | Sim | Apple incrementa mín. (14.0 → 15.0...) |
| **Plugins (camera, etc)** | Ad-hoc | Médio | Teste antes de update |

**Ação:** Manter calendar de updates críticos; testar em CI/CD antes de merge.

### 8.4 A/B Testing e Análise

- **Versão A:** 50% de usuários
- **Versão B:** 50% de usuários (novo feature/design)
- **Métrica:** Conversion rate (checkout), retention (DAU/MAU), LTV
- **Duração:** 2–4 semanas
- **Decisão:** Rollout 100% (B venceu) ou revert (A mantém)

**Ação:** Integrar feature flags (LaunchDarkly, Statsig) para experimentos.

---

## 9. FASE 6 — DISTRIBUIÇÃO CONTÍNUA (Ongoing)

**Objetivo:** Automatizar pipeline de build e deploy; reduce time-to-market.

### 9.1 GitHub Actions Workflow (Ativar após Fase 5)

Workflow (ativar manualmente, não automático):

```yaml
# .github/workflows/release-app-stores.yml
name: Release to App Stores
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Semantic version (e.g., 1.0.0, 1.0.1)'
        required: true

env:
  NODE_VERSION: '18'

jobs:
  build-android:
    runs-on: ubuntu-latest
    outputs:
      aab-path: ${{ steps.build.outputs.aab }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build web
        run: npm run build
      
      - name: Lint & format check
        run: npm run lint
      
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - name: Sync Capacitor
        run: npx cap sync android
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v3
      
      - name: Build release AAB
        run: |
          cd android
          ./gradlew bundleRelease \
            -Pandroid.injected.signing.store.file=../leilao-release.keystore \
            -Pandroid.injected.signing.store.password='${{ secrets.ANDROID_KEYSTORE_PASSWORD }}' \
            -Pandroid.injected.signing.key.alias=leilao-key \
            -Pandroid.injected.signing.key.password='${{ secrets.ANDROID_KEY_PASSWORD }}'
      
      - id: build
        name: Output AAB path
        run: echo "aab=$(find android/app/build/outputs/bundle -name '*.aab' | head -1)" >> $GITHUB_OUTPUT
  
  build-ios:
    runs-on: macos-latest
    outputs:
      ipa-path: ${{ steps.build.outputs.ipa }}
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build web
        run: npm run build
      
      - name: Sync Capacitor
        run: npx cap sync ios
      
      - name: Setup iOS signing
        env:
          IOS_P12_CONTENT: ${{ secrets.IOS_P12_CONTENT }}
          IOS_P12_PASSWORD: ${{ secrets.IOS_P12_PASSWORD }}
          IOS_PROVISION_PROFILE: ${{ secrets.IOS_PROVISION_PROFILE }}
        run: |
          # Restore certs + provisioning profile
          # (scripted in separate action or inline)
      
      - name: Build iOS archive
        run: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace \
            -scheme App \
            -configuration Release \
            -derivedDataPath build \
            -archivePath build/App.xcarchive \
            archive
      
      - name: Export IPA
        run: |
          # xcodebuild -exportArchive ...
          # (export options plist needed)
      
      - id: build
        name: Output IPA path
        run: echo "ipa=$(find build -name '*.ipa' | head -1)" >> $GITHUB_OUTPUT
  
  upload-play-store:
    needs: build-android
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Google Play API credentials
        env:
          PLAY_STORE_JSON: ${{ secrets.PLAY_STORE_JSON }}
        run: |
          echo "$PLAY_STORE_JSON" > play-store-key.json
      
      - name: Upload AAB to Play Store
        run: |
          # Usar fastlane, google-play-api, ou ferramentas do SDK
          # Example com fastlane:
          # cd android && fastlane supply --aab=$AAB_PATH --track=internal
      
      - name: Notify Slack
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"✅ Android v${{ github.event.inputs.version }} uploaded to Play Store"}'
  
  upload-app-store:
    needs: build-ios
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Upload IPA to App Store Connect
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
        run: |
          # xcrun altool ou Transporter
          # Example:
          # xcrun altool --upload-app -f ${{ needs.build-ios.outputs.ipa-path }} \
          #   -t ios -u $APPLE_ID -p $APPLE_ID_PASSWORD
      
      - name: Notify Slack
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{"text":"✅ iOS v${{ github.event.inputs.version }} submitted to App Store Connect"}'
```

**Ação:** Usar como template; customizar com credenciais de cada loja.

### 9.2 Secrets para CI/CD

Adicionar em GitHub Secrets (Settings → Secrets and variables → Actions):

| Secret | Descrição | Sensibilidade |
|---|---|---|
| `ANDROID_KEYSTORE_PASSWORD` | Senha do keystore | 🔴 Alta |
| `ANDROID_KEY_PASSWORD` | Senha da chave RSA | 🔴 Alta |
| `PLAY_STORE_JSON` | JSON da service account Google | 🔴 Alta |
| `IOS_P12_CONTENT` | Certificate + key (base64) | 🔴 Alta |
| `IOS_P12_PASSWORD` | Senha do P12 | 🔴 Alta |
| `IOS_PROVISION_PROFILE` | Provisioning profile (base64) | 🔴 Alta |
| `APPLE_ID` | Apple ID de publicação | 🟡 Médio |
| `APPLE_ID_PASSWORD` | App-specific password (não senha Apple ID) | 🔴 Alta |
| `APPLE_TEAM_ID` | Team ID | 🟡 Médio |
| `SLACK_WEBHOOK` | Webhook para notificações | 🟡 Médio |

**Ação:** Criar após confirmar processo CI/CD é robusto.

---

## 10. CHECKLIST COMPLETO

### Pré-Lançamento (Fases 1–4)

- [ ] **Fase 1: Estrutura**
  - [ ] Contas criadas (Google Play, App Store)
  - [ ] Tooling instalado localmente
  - [ ] Keystore Android gerado e seguro
  - [ ] Certificates iOS criados
  - [ ] Capacitor config atualizado
  - [ ] Assets preparados (ícone, screenshots)

- [ ] **Fase 2: Build & Teste Local**
  - [ ] `npm run build` sem erros
  - [ ] `npm run lint` limpo
  - [ ] Android APK/AAB compila
  - [ ] iOS .xcarchive compila
  - [ ] Teste em emulador Android 8.0, 14+
  - [ ] Teste em simulador iOS 14, 17+
  - [ ] Funcionalidades críticas testadas

- [ ] **Fase 3: Setup Lojas**
  - [ ] Google Play: Todas seções obrigatórias preenchidas
  - [ ] App Store Connect: Todas seções obrigatórias preenchidas
  - [ ] Lançamento em Internal Testing (Android)
  - [ ] Lançamento em TestFlight (iOS)
  - [ ] 5–20 testadores recrutados
  - [ ] Feedback coletado e priorizado

- [ ] **Fase 4: Submissão**
  - [ ] Google Play: v1.0.0 submetido para review
  - [ ] App Store: v1.0.0 submetido para review
  - [ ] Nenhuma rejeição crítica
  - [ ] Apps live em ambas lojas

### Pós-Lançamento (Fases 5–6)

- [ ] **Fase 5: Monitoramento**
  - [ ] Dashboard de métricas configurado
  - [ ] Alerts de crash/uninstall ligadas
  - [ ] Reviews lidos diariamente (primeiras 2 semanas)
  - [ ] Bug fixes priotizados e deployados
  - [ ] v1.0.1, v1.0.2... lançados conforme necessário

- [ ] **Fase 6: Automação (Optional, após estabilidade)**
  - [ ] CI/CD workflow criado e testado
  - [ ] Secrets armazenados seguramente
  - [ ] Release process documentado
  - [ ] Team treinado em novo fluxo

---

## 11. TIMELINE ESTIMADA

| Semana | Fase | Milestone |
|---|---|---|
| **Semana 1** | 1 | Setup contas, tooling, config |
| **Semana 2** | 2 | Builds locais, testes em emulador |
| **Semana 3** | 3 | Interno + TestFlight, feedback |
| **Semana 4** | 4 | Envio para produção, esperar review |
| **Semana 5** | 5 | Apps live, monitoramento 24h |
| **Semanas 6+** | 6 | Updates, automação, A/B testing |

**Total: ~5–6 semanas até produção; ongoing para updates.**

---

## 12. RISCOS E MITIGAÇÃO

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| **Rejeição App Store** | Média | Alto | Review Apple antecipada; preparar appeals |
| **Rejeição Google Play** | Baixo | Médio | Testar extensivamente; comply com policies |
| **Perda de chave privada (keystore)** | Baixo | Crítico | Backup seguro + 1Password/Vault |
| **Crashes em produção** | Médio | Alto | Crashlytics ativa; rollback rápido |
| **Performance ruim (iOS)** | Médio | Médio | Profiling local; otimizar React bundle |
| **Battery drain** | Médio | Médio | Limpar listeners; background tasks apenas se needed |
| **Versioning conflict** | Baixo | Médio | CI/CD enforcement; auto-increment |

**Ação:** Revisar semanalmente; escalar se risco materializa.

---

## 13. PÓS-PLANO: ROADMAP FUTURO

Após v1.0.0 estabelecido, considerar:

- **v1.1.0:** Deep linking (clique no leilão de push = abre direto)
- **v1.2.0:** Offline mode (cache de leilões recentes)
- **v1.3.0:** Widgets (iOS/Android) mostrando leilões ao vivo
- **v2.0.0:** AR preview de produtos (câmera do celular)
- **Análytics avançada:** Cohort analysis, funnel tracking, heatmaps

---

## DOCUMENTAÇÃO RELACIONADA

- `PUBLISHING.md` — Guia originário (Android)
- `capacitor.config.ts` — Configuração Capacitor
- `android/app/build.gradle` — Build config Android
- `ios/App/App.xcodeproj` — Project Xcode
- `.github/workflows/` — CI/CD (quando ativado)
- `DEPLOYMENT.md` — (Criar se necessário) deploy local detalhado

---

**Última atualização:** 28 de agosto de 2026  
**Status:** Planejamento completo — Pronto para execução
