# Manutenção do App Mobile

## Como preservar o ícone do Android ao mesclar com a Main

O ícone do Android foi corrigido para evitar cortes (margin 18%) usando um arquivo XML de "foreground escalado".
Para garantir que essa correção não seja perdida ao atualizar a branch, siga estes passos:

1. **Commitar os arquivos de correção na branch atual:**
   Certifique-se de que estes arquivos estejam commitados na sua branch `feature/mobile-app`:
   - `android/app/src/main/res/drawable/ic_launcher_foreground_scaled.xml`
   - `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`
   - `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml`

2. **Resolvendo Conflitos de Merge:**
   Ao fazer `git merge main` (ou `pull origin main`), se houver conflito nesses arquivos XML:
   - **Sempre escolha a versão da sua branch (`Current Change` / `HEAD`)**.
   - A versão da `main` provavelmente apontará para o `@mipmap/ic_launcher_foreground` original (que corta).
   - A versão correta aponta para `@drawable/ic_launcher_foreground_scaled`.

3. **Arquivos Wrapper de Função:**
   Da mesma forma, mantenha os arquivos em `src/functions/` (como `getPartnerPurchases.js`) se houver conflito. Eles são necessários para o app funcionar.
