import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';

import ParceiroRetratos from '@/components/parceiro/ParceiroRetratos';
import ParceiroBaseLegal from '@/components/parceiro/ParceiroBaseLegal';
import {
  usuarioLocal,
  temAceiteParceiro,
  registrarAceiteParceiro,
} from '@/lib/parceiroAcesso';

// 🖤 PORTA DA CAPTAÇÃO PRIVADA — página ÚNICA que vem ANTES da apresentação.
// Aqui a pessoa declara ciência de que a operação é privada e faz o cadastro na
// plataforma. Só então /Partners é liberada.
//
// 🌳 CADASTRO É UM SÓ: todo mundo nasce USUÁRIO na página oficial (/Register).
// Parceiro, influenciador, vendedor são camadas em cima disso. Esta página NÃO
// tem formulário próprio — antes tinha, e virava um segundo cadastro com regras
// diferentes (sem CPF, sem endereço, sem termo de adesão).
// ⚠️ Nenhum valor financeiro nesta página.
export default function AcessoParceiroPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [ciente, setCiente] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    document.body.classList.add('pc-tema');
    return () => document.body.classList.remove('pc-tema');
  }, []);

  const liberar = (u) => {
    registrarAceiteParceiro(u);
    try { sessionStorage.removeItem('pcAceitePendente'); } catch (_) {}
    navigate('/Partners');
  };

  // Ao voltar do cadastro oficial já logado, conclui o que ficou pendente:
  // registra o aceite dado ANTES de ir cadastrar e abre a apresentação.
  useEffect(() => {
    const u = usuarioLocal();
    setUser(u);
    if (!u) return;
    let pendente = false;
    try { pendente = sessionStorage.getItem('pcAceitePendente') === '1'; } catch (_) {}
    if (pendente || temAceiteParceiro(u)) liberar(u);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const acessar = () => {
    if (!ciente && !(user && temAceiteParceiro(user))) {
      setErro('É necessário declarar ciência de que se trata de captação privada.');
      return;
    }
    if (user) {
      liberar(user);
      return;
    }
    // Sem cadastro: vai para a página OFICIAL de cadastro, em versão preta,
    // e volta pra cá logado (a pendência do aceite fica guardada).
    try {
      sessionStorage.setItem('pcAceitePendente', '1');
      sessionStorage.setItem('registerTemaParceiro', '1');
      sessionStorage.setItem('registerReturnTo', '/AcessoParceiro');
    } catch (_) {}
    navigate('/Register');
  };

  return (
    <div className="min-h-screen bg-pc-preto">
      <header className="relative overflow-hidden border-b border-pc-borda">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pc-ouro to-transparent" />
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="mb-10 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="border border-pc-ouro px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.25em] text-pc-ouro sm:text-xs">
              Acesso restrito
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-pc-tinta-fraca sm:text-xs">
              Captação privada
            </span>
          </div>

          <div className="mb-6 flex items-center gap-3">
            <span className="h-px w-10 bg-pc-ouro" />
            <p className="text-[10px] uppercase tracking-[0.25em] text-pc-ouro sm:text-xs">
              Convite à parceria comercial
            </p>
          </div>

          <h1 className="max-w-3xl text-3xl font-bold leading-tight text-pc-tinta sm:text-5xl">
            Participe de uma <span className="text-pc-ouro">operação estruturada</span> de venda de
            produtos
          </h1>

          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-pc-tinta-fraca sm:text-base">
            As condições desta operação não são divulgadas publicamente. Para conhecê-las, faça seu
            cadastro na plataforma e declare ciência de que se trata de uma captação privada,
            dirigida exclusivamente a convidados identificados.
          </p>

          {/* Ciência + acesso */}
          <div className="mt-10 max-w-2xl border border-pc-borda bg-pc-preto-2 p-5">
            {user ? (
              <>
                <p className="text-[10px] uppercase tracking-[0.18em] text-pc-ouro">
                  Identificado como
                </p>
                <p className="mt-1 text-sm font-bold text-pc-tinta">
                  {user.full_name || user.email}
                </p>
              </>
            ) : (
              <p className="text-xs leading-relaxed text-pc-tinta-fraca">
                O acesso é liberado após o cadastro na plataforma Leilão NoZap — o mesmo cadastro de
                usuário de todo o ecossistema — e o aceite do termo de confidencialidade.
              </p>
            )}

            {!(user && temAceiteParceiro(user)) && (
              <label className="mt-4 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={ciente}
                  onChange={(e) => {
                    setCiente(e.target.checked);
                    setErro('');
                  }}
                  className="mt-0.5 h-5 w-5 shrink-0 accent-[#C9A55C]"
                />
                <span className="text-[11px] leading-relaxed text-pc-tinta-fraca">
                  <span className="font-bold text-pc-tinta">Estou ciente</span> de que esta é uma{' '}
                  <span className="text-pc-ouro">operação privada e confidencial</span>, que não
                  constitui oferta pública nem promessa de rentabilidade, e me comprometo a não
                  divulgar as informações apresentadas no ambiente restrito.
                </span>
              </label>
            )}

            {erro && <p className="mt-3 text-xs text-red-300">{erro}</p>}

            <button
              type="button"
              onClick={acessar}
              className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 border border-pc-ouro bg-pc-ouro px-7 text-xs font-bold uppercase tracking-[0.18em] text-pc-preto transition-colors hover:bg-pc-ouro-claro sm:w-auto"
            >
              {user ? <ShieldCheck className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {user ? 'Acessar a apresentação' : 'Fazer cadastro e acessar'}
            </button>
          </div>

          <div className="mt-16 border-t border-pc-borda pt-6 sm:flex sm:items-end sm:justify-between">
            <div className="text-xs leading-relaxed text-pc-tinta-fraca sm:text-sm">
              <p className="font-semibold text-pc-tinta">
                COMPRAS FULL COMÉRCIO LTDA · CNPJ 51.544.091/0001-67
              </p>
              <p>
                Av. das Américas, 19.005, Torre 1, Sala 1106, Recreio dos Bandeirantes, Rio de
                Janeiro/RJ
              </p>
            </div>
            <p className="mt-4 text-[10px] uppercase tracking-[0.25em] text-pc-tinta-fraca sm:mt-0 sm:text-xs">
              Não é oferta pública
            </p>
          </div>
        </div>
      </header>

      <ParceiroRetratos />
      <ParceiroBaseLegal />
    </div>
  );
}