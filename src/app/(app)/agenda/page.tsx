import { Abas, Cabecalho } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ABAS_AGENDA, type Catalogo } from "@/lib/tipos";
import { AgendaCalendario } from "./calendario";
import { GradePilates } from "./grade-pilates";

export const metadata = { title: "Agendas" };

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ aba?: string; visao?: string; paciente?: string }> }) {
  const sessao = await exigirPapel();
  const { aba: abaParam, visao } = await searchParams;
  const aba = ABAS_AGENDA.some((a) => a.id === abaParam) ? abaParam! : sessao.papel === "fisio" ? "geral" : "fisioterapia";

  const supabase = await createClient();
  const [prof, salas, mods, servs] = await Promise.all([
    supabase.from("profissionais").select("id, nome, cor_agenda, especialidade, crefito").eq("ativo", true).order("nome"),
    supabase.from("salas").select("id, nome, tipo").eq("ativo", true).order("id"),
    supabase.from("modalidades").select("id, slug, nome, cor").order("id"),
    supabase.from("servicos").select("id, nome, duracao_min, preco, modalidade_id").eq("ativo", true).order("id"),
  ]);
  const catalogo: Catalogo = {
    profissionais: prof.data ?? [],
    salas: salas.data ?? [],
    modalidades: mods.data ?? [],
    servicos: (servs.data ?? []).map((s) => ({ ...s, preco: Number(s.preco) })),
  };
  const cor = (slug: string) => catalogo.modalidades.find((m) => m.slug === slug)?.cor;
  const usuario = { papel: sessao.papel, profissionalId: sessao.profissionalId };

  return (
    <>
      <Cabecalho
        titulo={sessao.papel === "fisio" ? "Minha agenda" : "Agendas"}
        sub={sessao.papel === "fisio" ? "Seus atendimentos e turmas. Marque presença e faltas por aqui." : "Clique em um horário livre para agendar. Conflitos de profissional ou sala são bloqueados."}
      />
      <Abas
        ativa={aba}
        abas={ABAS_AGENDA.map((a) => ({ id: a.id, rotulo: a.rotulo, href: `/agenda?aba=${a.id}`, cor: a.id === "geral" ? undefined : cor(a.id) }))}
      />
      {aba === "pilates" ? (
        <GradePilates catalogo={catalogo} usuario={usuario} />
      ) : (
        <AgendaCalendario key={aba} modalidade={aba === "geral" ? null : aba} catalogo={catalogo} usuario={usuario} visaoInicial={visao === "dia" ? "timeGridDay" : "timeGridWeek"} />
      )}
    </>
  );
}
