"use client";

import { Search, UserPlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Botao, Entrada } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export type PacienteEscolhido = { id: string; nome: string; telefone: string | null; endereco: string | null; bairro: string | null; cidade: string | null; convenio: string | null };

const CAMPOS = "id, nome, telefone, endereco, bairro, cidade, convenio";

/** Campo de busca de paciente com cadastro rápido (nome + telefone). */
export function BuscaPaciente({ valor, aoEscolher, permitirNovo = true, filtroIds }: {
  valor: PacienteEscolhido | null;
  aoEscolher: (p: PacienteEscolhido | null) => void;
  permitirNovo?: boolean;
  filtroIds?: string[];
}) {
  const [termo, setTermo] = useState("");
  const [opcoes, setOpcoes] = useState<PacienteEscolhido[]>([]);
  const [novo, setNovo] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (valor || termo.trim().length < 2) {
      setOpcoes([]);
      return;
    }
    const t = setTimeout(async () => {
      const supabase = createClient();
      let q = supabase.from("pacientes").select(CAMPOS).ilike("nome", `%${termo.trim()}%`).eq("ativo", true).order("nome").limit(8);
      if (filtroIds) q = q.in("id", filtroIds);
      const { data } = await q;
      setOpcoes(data ?? []);
    }, 200);
    return () => clearTimeout(t);
  }, [termo, valor, filtroIds]);

  async function cadastrar() {
    setErro("");
    const supabase = createClient();
    const { data, error } = await supabase
      .from("pacientes")
      .insert({ nome: termo.trim(), telefone: telefone || null, origem: "Outro" })
      .select(CAMPOS)
      .single();
    if (error) return setErro("Não foi possível cadastrar. Confira os dados.");
    setNovo(false);
    aoEscolher(data);
  }

  if (valor) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-verde-marca bg-creme/60 px-3 py-2 text-sm">
        <div>
          <p className="font-semibold text-verde-escuro">{valor.nome}</p>
          <p className="text-xs text-suave">{valor.telefone ?? "sem telefone"}{valor.convenio ? ` · ${valor.convenio}` : " · particular"}</p>
        </div>
        <button type="button" onClick={() => { aoEscolher(null); setTermo(""); }} className="rounded p-1 text-suave hover:bg-white" aria-label="Trocar paciente">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-suave" />
        <Entrada value={termo} onChange={(e) => { setTermo(e.target.value); setNovo(false); }} placeholder="Digite o nome do paciente" className="pl-9" autoFocus />
      </div>
      {(opcoes.length > 0 || (permitirNovo && termo.trim().length >= 3)) && !novo && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-borda bg-white py-1 shadow-lg">
          {opcoes.map((o) => (
            <li key={o.id}>
              <button type="button" onClick={() => aoEscolher(o)} className="flex w-full justify-between px-3 py-2 text-left text-sm hover:bg-creme">
                <span className="font-semibold">{o.nome}</span>
                <span className="text-xs text-suave">{o.telefone}</span>
              </button>
            </li>
          ))}
          {permitirNovo && termo.trim().length >= 3 && (
            <li className="border-t border-borda">
              <button type="button" onClick={() => setNovo(true)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-verde-marca hover:bg-creme">
                <UserPlus size={15} /> Cadastrar &quot;{termo.trim()}&quot; como novo paciente
              </button>
            </li>
          )}
        </ul>
      )}
      {novo && (
        <div className="mt-2 flex gap-2 rounded-lg border border-dashed border-oliva-claro p-2">
          <Entrada value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="WhatsApp (41) 9...." />
          <Botao type="button" onClick={cadastrar}>Cadastrar</Botao>
        </div>
      )}
      {erro && <p className="mt-1 text-xs text-red-700">{erro}</p>}
    </div>
  );
}
