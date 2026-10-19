"use client";

import { useActionState } from "react";
import { Botao, Campo, Entrada, Selecao } from "@/components/ui";
import { PAPEIS } from "@/lib/format";
import { criarUsuario } from "./actions";

export function NovoUsuario({ profissionais, habilitado }: { profissionais: { id: string; nome: string }[]; habilitado: boolean }) {
  const [estado, acao, enviando] = useActionState(criarUsuario, undefined);
  if (!habilitado) {
    return (
      <div className="p-5 text-sm leading-relaxed">
        <p>Para criar usuários direto por aqui, cadastre a variável <code className="rounded bg-creme px-1">SUPABASE_SERVICE_ROLE_KEY</code> na Vercel.</p>
        <p className="mt-2 text-suave">Enquanto isso, crie pelo painel do Supabase em <b>Authentication → Users → Add user</b>. O perfil aparece aqui como Recepção e você ajusta o papel ao lado.</p>
      </div>
    );
  }
  return (
    <form action={acao} className="space-y-3 p-5">
      <Campo rotulo="Nome"><Entrada name="nome" required /></Campo>
      <Campo rotulo="E-mail"><Entrada type="email" name="email" required /></Campo>
      <Campo rotulo="Senha inicial"><Entrada name="senha" required minLength={8} /></Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Perfil"><Selecao name="papel">{Object.entries(PAPEIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Selecao></Campo>
        <Campo rotulo="Profissional"><Selecao name="profissional_id"><option value="">Nenhum</option>{profissionais.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</Selecao></Campo>
      </div>
      {estado?.erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{estado.erro}</p>}
      {estado?.msg && <p className="rounded-lg bg-salvia/40 px-3 py-2 text-sm text-verde-escuro">{estado.msg}</p>}
      <Botao className="w-full" disabled={enviando}>Criar usuário</Botao>
    </form>
  );
}
