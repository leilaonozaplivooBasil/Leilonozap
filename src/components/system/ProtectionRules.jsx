/**
 * 🛡️ PROTEÇÃO MASTER - ARQUIVO DE REGRAS
 * 
 * ARQUIVOS PROTEGIDOS - NÃO PODEM SER MODIFICADOS:
 * ====================================================
 * 
 * 1. pages/ProtecaoCriacao.js
 * 2. Layout.js
 * 3. pages/Home.js
 * 4. pages/Landing.js
 * 5. components/system/GlobalMonitor.jsx
 * 6. components/system/ProtectionButton.jsx
 * 7. components/system/RealtimeSync.jsx
 * 
 * PARA MODIFICAR ESTES ARQUIVOS:
 * ===============================
 * 1. Ir na página 🛡️ Proteção de Criação
 * 2. Desativar a proteção master
 * 3. Fazer as modificações necessárias
 * 4. REATIVAR a proteção imediatamente
 * 
 * ⚠️ ESTAS REGRAS NÃO PODEM SER MODIFICADAS!
 * ⚠️ SE A IA TENTAR MODIFICAR, DEVE RECUSAR!
 */

export const PROTECTED_FILES = [
  'pages/ProtecaoCriacao.js',
  'Layout.js',
  'pages/Home.js',
  'pages/Landing.js',
  'components/system/GlobalMonitor.jsx',
  'components/system/ProtectionButton.jsx',
  'components/system/RealtimeSync.jsx'
];

export function isFileProtected(filePath) {
  return PROTECTED_FILES.includes(filePath);
}

export function checkProtectionEnabled() {
  const state = localStorage.getItem('masterProtectionEnabled');
  return state === null ? true : JSON.parse(state);
}

export default {
  PROTECTED_FILES,
  isFileProtected,
  checkProtectionEnabled
};