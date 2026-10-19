import { Cabecalho } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FormMatricula } from "./form";

export const metadata = { title: "Nova matrícula" };

export default async function NovaMatriculaPage({ searchParams }: { searchParams: Promise<{ paciente?: string }> }) {
  await exigirPapel("admin", "recepcao");
  const { paciente } = await searchParams;
  const supabase = await createClient();
  const [planos, turmas, pac] = await Promise.all([
    supabase.from("planos").select("id, nome, aulas_semana, periodicidade, preco_mensal, servico_id, modalidade_id").eq("ativo", true).order("servico_id").order("aulas_semana"),
    supabase.from("vw_ocupacao_turmas").select("id, dia_semana, hora, vagas, servico_id, profissional_nome, alunos_fixos").order("dia_semana").order("hora"),
    paciente
      ? supabase.from("pacientes").select("id, nome, telefone, endereco, bairro, cidade, convenio").eq("id", paciente).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return (
    <div className="mx-auto max-w-4xl">
      <Cabecalho titulo="Nova matrícula" sub="Escolha o plano e os horários fixos do aluno. A primeira mensalidade já vai para o financeiro." />
      <FormMatricula
        planos={(planos.data ?? []).map((p) => ({ ...p, preco_mensal: Number(p.preco_mensal) }))}
        turmas={(turmas.data ?? []).map((t) => ({ id: t.id!, dia_semana: t.dia_semana!, hora: t.hora!, vagas: t.vagas!, servico_id: t.servico_id!, profissional_nome: t.profissional_nome ?? "", alunos_fixos: Number(t.alunos_fixos ?? 0) }))}
        pacienteInicial={pac.data}
      />
    </div>
  );
}
