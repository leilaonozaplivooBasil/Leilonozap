/**
 * Banca do convite de cadastro ("Crie seu Perfil de Lance") — NÃO vai para o
 * bundle da loja.
 *
 * 🔑 POR QUE ISTO EXISTE (08/10/2026) — caso Renan Silva: cliente cadastrado
 * caía no convite toda vez que abria pelo navegador do WhatsApp (sem sessão)
 * e não tinha como entrar. Aqui o componente REAL é montado como o Layout
 * monta (com o nome de quem indicou) e se confere que o "Já tem conta? Entrar"
 * existe, fecha o convite e abre o login.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';
import GuestRegistrationModal from '@/components/common/GuestRegistrationModal';

window.__fechou = 0;
window.__abriuLogin = 0;
window.addEventListener('openLoginModal', () => { window.__abriuLogin += 1; });

const nome = new URLSearchParams(window.location.search).get('indicou') || 'Maira';

createRoot(document.getElementById('raiz')).render(
  <GuestRegistrationModal
    referrerName={nome}
    onClose={() => { window.__fechou += 1; }}
    onSuccess={() => {}}
  />,
);
