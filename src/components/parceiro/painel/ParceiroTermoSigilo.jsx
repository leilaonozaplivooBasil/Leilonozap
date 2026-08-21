import React, { useState, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ShieldCheck, Gavel, Clock, BadgeCheck } from 'lucide-react';
import { plataforma } from '@/api/plataformaClient';
import { VERSAO_TERMO } from '@/lib/termoSigiloTexto';
import { arquivarDocumentoAssinado } from '@/lib/arquivarDocumento';
import ParceiroTermoSigiloTexto from './ParceiroTermoSigiloTexto';
import ParceiroDocsUpload from './ParceiroDocsUpload';
import ParceiroAssinatura from './ParceiroAssinatura';
import ParceiroTermoAssinado from './ParceiroTermoAssinado';

// 📜 TELA "SIGILO" — leitura do termo, envio dos documentos de identificação,
// aceite e assinatura de próprio punho. Assinar aqui libera as telas que
// dependem do sigilo.
//
// ⚠️ NÃO movimenta dinheiro, não ativa plano, não altera cadastro. Só grava a
// prova de assinatura na trilha de auditoria (contrato_assinaturas).
export default function ParceiroTermoSigilo({ user, registro, onAssinado, liberadoValidacao }) {
  const [aceite, setAceite] = useState(false);
  const [cpf, setCpf] = useState(user?.cpf || '');
  const [docIdentidade, setDocIdentidade] = useState('');
  const [docCpf, setDocCpf] = useState('');
  const [salvando, setSalvando] = useState(false);

  // 📱 No celular a Etapa 2 fica muito acima da Etapa 3: o parceiro lê "informe o
  // CPF" mas não vê o campo e acha que a assinatura não abriu. Este ref leva ele
  // até lá. Só navegação — nenhuma regra de validação muda.
  const cpfRef = useRef(null);
  const irParaCpf = () => {
    const el = cpfRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => el.focus(), 350);
  };

  if (registro) {
    return <ParceiroTermoAssinado registro={registro} />;
  }

  const nome = user?.full_name || '';
  const cpfLimpo = String(cpf || '').replace(/\D/g, '');
  const docsOk = !!docIdentidade && !!docCpf;
  const identidadeOk = !!nome && cpfLimpo.length >= 11 && !!user?.email;
  const podeAssinar = aceite && docsOk && identidadeOk;

  const registrar = async (assinaturaPng) => {
    setSalvando(true);
    try {
      const resp = await plataforma.functions.invoke('registrarAssinaturaContrato', {
        documento: 'termo_confidencialidade',
        versao: VERSAO_TERMO,
        user_id: user?.id,
        nome,
        cpf: cpfLimpo,
        email: user?.email,
        assinatura_png: assinaturaPng,
        doc_identidade_url: docIdentidade,
        doc_cpf_url: docCpf,
      });

      if (!resp?.success) {
        toast.error(resp?.error || 'Não foi possível registrar a assinatura. Tente novamente.');
        return;
      }

      const a = resp.assinatura || resp.data?.assinatura || {};

      // 🗄️ Guarda a via oficial no cofre privado + cópia no Drive.
      // Segundo plano: não travamos a tela nem dependemos disso pra concluir.
      arquivarDocumentoAssinado(a.id);

      onAssinado(
        {
          nome,
          cpf: cpfLimpo,
          email: user?.email,
          assinado_em: a.assinado_em,
          ip: a.ip,
          user_agent: a.user_agent,
          versao_contrato: a.versao,
          hash_documento: a.hash,
          codigo_verificacao: a.codigo_verificacao,
          assinatura_png: assinaturaPng,
          doc_identidade_url: docIdentidade,
          doc_cpf_url: docCpf,
        },
        resp.persistido !== false
      );

      toast.success(
        resp.persistido === false
          ? 'Assinatura feita, mas o registro no servidor não foi confirmado.'
          : 'Termo de confidencialidade assinado!'
      );
    } catch (e) {
      toast.error('Falha ao registrar: ' + (e?.message || 'erro'));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <header className="border border-pc-borda bg-pc-preto-2 p-5 sm:p-7">
        {liberadoValidacao && (
          <span className="mb-4 inline-flex items-center gap-1.5 border border-pc-ouro/50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-pc-ouro">
            <BadgeCheck className="h-3 w-3" strokeWidth={2} /> Acesso de validação
          </span>
        )}
        <ShieldCheck className="h-7 w-7 text-pc-ouro" strokeWidth={1.5} />
        <h2 className="mt-3 text-xl font-bold text-pc-tinta sm:text-2xl">Termo de confidencialidade</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-pc-tinta-fraca">
          A partir daqui você vê a operação por dentro: fornecedores, custos, precificação,
          análise de lotes e as oportunidades do dia. Para liberar esse acesso, leia e assine
          o termo abaixo e envie seus documentos de identificação.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            [Clock, 'Sigilo por 5 anos', 'Contados do encerramento da relação ou do último acesso'],
            [Gavel, 'Multa contratual', 'R$ 50.000,00 ou 2× o capital aportado, prevalecendo o maior'],
            [ShieldCheck, 'Assinatura válida', 'Lei nº 14.063/2020 e MP nº 2.200-2/2001'],
          ].map(([Icone, titulo, texto]) => (
            <div key={titulo} className="border border-pc-borda bg-pc-preto p-3">
              <Icone className="h-4 w-4 text-pc-ouro" strokeWidth={1.8} />
              <p className="mt-2 text-xs font-semibold text-pc-tinta">{titulo}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-pc-tinta-fraca">{texto}</p>
            </div>
          ))}
        </div>
      </header>

      {/* 1 — Documento */}
      <section className="border border-pc-borda bg-pc-preto-2 p-4 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">Etapa 1 · Leitura</p>
        <h3 className="mt-1 text-lg font-bold text-pc-tinta">Leia o termo na íntegra</h3>
        <ScrollArea className="mt-4 h-[45vh] border border-pc-borda bg-pc-preto p-4">
          <ParceiroTermoSigiloTexto />
        </ScrollArea>
      </section>

      {/* 2 — Identificação */}
      <section className="border border-pc-borda bg-pc-preto-2 p-4 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">Etapa 2 · Identificação</p>
        <h3 className="mt-1 text-lg font-bold text-pc-tinta">Confirme seus dados e envie os documentos</h3>
        <p className="mt-1 text-xs leading-relaxed text-pc-tinta-fraca">
          Os arquivos são usados apenas para comprovar sua identidade e arquivar o aceite
          (art. 7º, V e VI, da LGPD).
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-[9px] font-semibold uppercase tracking-[0.15em] text-pc-tinta-fraca">Nome completo</label>
            <Input value={nome} readOnly className="mt-1 min-h-[44px] border-pc-borda bg-pc-preto text-pc-tinta" />
          </div>
          <div>
            <label className="text-[9px] font-semibold uppercase tracking-[0.15em] text-pc-tinta-fraca">E-mail</label>
            <Input value={user?.email || ''} readOnly className="mt-1 min-h-[44px] border-pc-borda bg-pc-preto text-pc-tinta" />
          </div>
          <div>
            <label className="text-[9px] font-semibold uppercase tracking-[0.15em] text-pc-tinta-fraca">CPF / CNPJ</label>
            <Input
              ref={cpfRef}
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              inputMode="numeric"
              placeholder="Somente números"
              className={`mt-1 min-h-[44px] bg-pc-preto text-pc-tinta ${
                cpfLimpo.length >= 11 ? 'border-pc-borda' : 'border-pc-ouro ring-1 ring-pc-ouro/40'
              }`}
            />
            {cpfLimpo.length < 11 && (
              <p className="mt-1 text-[10px] text-pc-ouro">Obrigatório para assinar</p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <ParceiroDocsUpload
            userId={user?.id}
            docIdentidade={docIdentidade}
            docCpf={docCpf}
            onChange={(v) => {
              if (v.docIdentidade !== undefined) setDocIdentidade(v.docIdentidade);
              if (v.docCpf !== undefined) setDocCpf(v.docCpf);
            }}
          />
        </div>
      </section>

      {/* 3 — Aceite + assinatura */}
      <section className="border border-pc-borda bg-pc-preto-2 p-4 sm:p-6">
        <p className="text-[10px] uppercase tracking-[0.2em] text-pc-ouro">Etapa 3 · Assinatura</p>
        <h3 className="mt-1 text-lg font-bold text-pc-tinta">Aceite e assine</h3>

        <label className="mt-4 flex cursor-pointer items-start gap-3 border border-pc-borda bg-pc-preto p-4">
          <input
            type="checkbox"
            checked={aceite}
            onChange={(e) => setAceite(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[#C9A55C]"
          />
          <span className="text-xs leading-relaxed text-pc-tinta-fraca">
            Declaro que li e concordo integralmente com o Termo de Confidencialidade, inclusive
            com o prazo de sigilo de 5 (cinco) anos e com a multa contratual prevista na
            Cláusula 6, e que os documentos e dados apresentados são verdadeiros.
          </span>
        </label>

        {!podeAssinar && (
          <ul className="mt-4 space-y-1 text-[11px] text-pc-tinta-fraca">
            {!identidadeOk && (
              <li>
                <button
                  type="button"
                  onClick={irParaCpf}
                  className="min-h-[44px] text-left text-[11px] font-semibold text-pc-ouro underline decoration-pc-ouro/50 underline-offset-2"
                >
                  • Informe um CPF/CNPJ válido para assinar — toque aqui para preencher
                </button>
              </li>
            )}
            {!docIdentidade && <li>• Envie o documento de identidade.</li>}
            {!docCpf && <li>• Envie a comprovação de CPF.</li>}
            {!aceite && <li>• Marque o aceite do termo.</li>}
          </ul>
        )}

        {!podeAssinar && (
          <p className="mt-4 border border-pc-ouro/40 bg-pc-preto px-3 py-2 text-[11px] font-semibold text-pc-ouro">
            Assinatura liberada após completar os itens acima.
          </p>
        )}

        <div className={`mt-5 ${podeAssinar ? '' : 'pointer-events-none opacity-40'}`}>
          <ParceiroAssinatura
            nome={nome}
            salvando={salvando}
            onConfirmar={registrar}
            onCancelar={() => setAceite(false)}
          />
        </div>
      </section>
    </div>
  );
}