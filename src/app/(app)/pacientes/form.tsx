"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AreaTexto, Botao, Campo, Cartao, Entrada, Selecao } from "@/components/ui";
import { CONVENIOS, ORIGENS } from "@/lib/format";
import { salvarPaciente } from "./actions";

export type PacienteForm = {
  id?: string; nome?: string; cpf?: string | null; telefone?: string | null; email?: string | null; nascimento?: string | null;
  sexo?: string | null; cidade?: string | null; bairro?: string | null; endereco?: string | null; profissao?: string | null;
  origem?: string | null; convenio?: string | null; obs?: string | null;
};

export function FormPaciente({ paciente }: { paciente?: PacienteForm }) {
  const [estado, acao, enviando] = useActionState(salvarPaciente, undefined);
  const p = paciente ?? {};
  return (
    <form action={acao}>
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <Cartao className="space-y-6 p-5 sm:p-6">
        <section>
          <h2 className="mb-3 text-xl">Dados pessoais</h2>
          <div className="grid gap-4 sm:grid-cols-6">
            <Campo rotulo="Nome completo" className="sm:col-span-4"><Entrada name="nome" defaultValue={p.nome} required /></Campo>
            <Campo rotulo="CPF" className="sm:col-span-2"><Entrada name="cpf" defaultValue={p.cpf ?? ""} placeholder="000.000.000-00" /></Campo>
            <Campo rotulo="Nascimento" className="sm:col-span-2"><Entrada type="date" name="nascimento" defaultValue={p.nascimento ?? ""} /></Campo>
            <Campo rotulo="Sexo" className="sm:col-span-2">
              <Selecao name="sexo" defaultValue={p.sexo ?? ""}>
                <option value="">Não informado</option>
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
                <option value="O">Outro</option>
              </Selecao>
            </Campo>
            <Campo rotulo="Profissão" className="sm:col-span-2"><Entrada name="profissao" defaultValue={p.profissao ?? ""} /></Campo>
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-xl">Contato e endereço</h2>
          <div className="grid gap-4 sm:grid-cols-6">
            <Campo rotulo="WhatsApp / telefone" className="sm:col-span-2"><Entrada name="telefone" defaultValue={p.telefone ?? ""} placeholder="(41) 99999-9999" /></Campo>
            <Campo rotulo="E-mail" className="sm:col-span-4"><Entrada type="email" name="email" defaultValue={p.email ?? ""} /></Campo>
            <Campo rotulo="Endereço" className="sm:col-span-3"><Entrada name="endereco" defaultValue={p.endereco ?? ""} placeholder="Rua, número" /></Campo>
            <Campo rotulo="Bairro" className="sm:col-span-2"><Entrada name="bairro" defaultValue={p.bairro ?? ""} /></Campo>
            <Campo rotulo="Cidade" className="sm:col-span-1"><Entrada name="cidade" defaultValue={p.cidade ?? "Lapa"} /></Campo>
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-xl">Atendimento</h2>
          <div className="grid gap-4 sm:grid-cols-6">
            <Campo rotulo="Convênio" className="sm:col-span-2" dica="Em branco = particular">
              <Selecao name="convenio" defaultValue={p.convenio ?? ""}>
                <option value="">Particular</option>
                {CONVENIOS.map((c) => <option key={c}>{c}</option>)}
                {p.convenio && !CONVENIOS.includes(p.convenio) && <option>{p.convenio}</option>}
              </Selecao>
            </Campo>
            <Campo rotulo="Como conheceu a clínica" className="sm:col-span-2">
              <Selecao name="origem" defaultValue={p.origem ?? ""}>
                <option value="">Não informado</option>
                {ORIGENS.map((o) => <option key={o}>{o}</option>)}
              </Selecao>
            </Campo>
            <Campo rotulo="Observações" className="sm:col-span-6"><AreaTexto name="obs" defaultValue={p.obs ?? ""} placeholder="Restrições, histórico, preferências de horário..." /></Campo>
          </div>
        </section>
        {estado?.erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{estado.erro}</p>}
        <div className="flex justify-end gap-2 border-t border-borda pt-5">
          <Link href={p.id ? `/pacientes/${p.id}` : "/pacientes"} className="rounded-lg px-3.5 py-2 text-sm font-semibold text-verde-escuro hover:bg-creme">Cancelar</Link>
          <Botao type="submit" disabled={enviando}>{enviando ? "Salvando..." : "Salvar paciente"}</Botao>
        </div>
      </Cartao>
    </form>
  );
}
