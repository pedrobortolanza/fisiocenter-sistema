import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { BotaoLink, Cabecalho, Cartao, Entrada, Selecao, Selo, Tabela, Vazio } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { CONVENIOS, data, idade } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Pacientes" };

export default async function PacientesPage({ searchParams }: { searchParams: Promise<{ q?: string; convenio?: string; situacao?: string }> }) {
  const sessao = await exigirPapel();
  const { q = "", convenio = "", situacao = "ativos" } = await searchParams;
  const supabase = await createClient();

  let consulta = supabase
    .from("pacientes")
    .select("id, nome, telefone, nascimento, cidade, bairro, convenio, origem, criado_em, ativo, matriculas(status, planos(nome))")
    .order("nome");
  const termo = q.trim().replace(/[,()]/g, " ");
  if (termo) consulta = consulta.or(`nome.ilike.%${termo}%,cpf.ilike.%${termo}%,telefone.ilike.%${termo}%`);
  if (convenio === "particular") consulta = consulta.is("convenio", null);
  else if (convenio) consulta = consulta.eq("convenio", convenio);
  if (situacao === "ativos") consulta = consulta.eq("ativo", true);
  if (situacao === "inativos") consulta = consulta.eq("ativo", false);

  const { data: pacientes } = await consulta;
  const lista = pacientes ?? [];

  return (
    <>
      <Cabecalho
        titulo="Pacientes"
        sub={`${lista.length} pacientes${termo ? ` encontrados para "${q}"` : ""}`}
        acoes={sessao.papel !== "fisio" && <BotaoLink href="/pacientes/novo"><Plus size={16} /> Novo paciente</BotaoLink>}
      />
      <form className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-64 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-suave" />
          <Entrada name="q" defaultValue={q} placeholder="Buscar por nome, CPF ou telefone" className="pl-9" />
        </div>
        <Selecao name="convenio" defaultValue={convenio} className="w-auto">
          <option value="">Todos (particular e convênio)</option>
          <option value="particular">Particular</option>
          {CONVENIOS.map((c) => <option key={c}>{c}</option>)}
        </Selecao>
        <Selecao name="situacao" defaultValue={situacao} className="w-auto">
          <option value="ativos">Cadastros ativos</option>
          <option value="inativos">Inativos</option>
          <option value="todos">Todos</option>
        </Selecao>
        <button className="rounded-lg bg-verde-marca px-4 text-sm font-semibold text-white hover:bg-verde-escuro">Filtrar</button>
      </form>
      <Cartao>
        {lista.length === 0 ? (
          <Vazio>Nenhum paciente encontrado.</Vazio>
        ) : (
          <Tabela>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Idade</th>
                <th>Telefone</th>
                <th className="hidden md:table-cell">Bairro · Cidade</th>
                <th>Convênio</th>
                <th className="hidden lg:table-cell">Pilates</th>
                <th className="hidden lg:table-cell">Cliente desde</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const plano = p.matriculas.find((m) => m.status === "ativo");
                return (
                  <tr key={p.id}>
                    <td><Link href={`/pacientes/${p.id}`} className="font-semibold text-verde-escuro hover:underline">{p.nome}</Link></td>
                    <td className="tabular">{idade(p.nascimento) ?? "–"}</td>
                    <td className="whitespace-nowrap tabular">{p.telefone}</td>
                    <td className="hidden text-suave md:table-cell">{[p.bairro, p.cidade].filter(Boolean).join(" · ")}</td>
                    <td>{p.convenio ? <Selo className="bg-[#5E7C8A1f] text-[#3f5b68]">{p.convenio}</Selo> : <span className="text-suave">Particular</span>}</td>
                    <td className="hidden lg:table-cell">{plano ? <Selo className="bg-salvia text-verde-escuro">{plano.planos?.nome.split(" · ")[0]}</Selo> : ""}</td>
                    <td className="hidden text-suave lg:table-cell">{data(p.criado_em, "MM/yyyy")}</td>
                  </tr>
                );
              })}
            </tbody>
          </Tabela>
        )}
      </Cartao>
    </>
  );
}
