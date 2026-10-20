import { Layers, MessageCircle } from "lucide-react";
import Link from "next/link";
import { GraficoBarras, GraficoRosca } from "@/components/graficos";
import { PilulasUrl, SelecaoUrl } from "@/components/filtros";
import { Cabecalho, Cartao, CartaoTitulo, Indicador, Tabela, Vazio } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { data, hojeISO, linkWhatsApp, moeda, primeiroNome, somaDias } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Estatísticas" };

type Item = { nome: string; total: number };
type Estat = {
  resumo: { pacientes_atendidos: number; novos: number; sessoes_realizadas: number; faltas: number; taxa_faltas: number | null; ticket_medio: number | null; receita: number };
  faixa_etaria: { faixa: string; total: number }[];
  sexo: { sexo: string; total: number }[];
  bairros: Item[]; cidades: Item[]; profissoes: Item[]; origem: Item[];
  novos_por_mes: { mes: string; total: number }[];
  ativos_por_modalidade: { modalidade: string; cor: string; total: number }[];
  servicos: Item[];
  horarios: { hora: string; total: number }[];
  dias_semana: { dia: string; total: number }[];
  ocupacao_turmas: { turma: string; vagas: number; alunos: number; ocupacao: number }[];
  retencao: { renovacoes: number; cancelamentos: number; vencidas_sem_renovar: number; ativas: number; pausadas: number };
  inativos: { id: string; nome: string; telefone: string | null; ultima: string; dias: number }[];
  faltas_turmas: { turma: string; taxa: number; faltas: number }[];
  faltas_pacientes: { id: string; nome: string; faltas: number; taxa: number }[];
  ticket_modalidade: { modalidade: string; cor: string; ticket: number; receita: number }[];
};

const PERIODOS = [
  { dias: 30, rotulo: "Últimos 30 dias" },
  { dias: 90, rotulo: "Últimos 3 meses" },
  { dias: 180, rotulo: "Últimos 6 meses" },
  { dias: 365, rotulo: "Último ano" },
];

export default async function EstatisticasPage({ searchParams }: { searchParams: Promise<{ periodo?: string; modalidade?: string }> }) {
  await exigirPapel("admin");
  const { periodo = "90", modalidade = "" } = await searchParams;
  const dias = PERIODOS.some((p) => String(p.dias) === periodo) ? Number(periodo) : 90;
  const hoje = hojeISO();
  const ini = somaDias(hoje, -dias);
  const supabase = await createClient();
  const [{ data: estat }, { data: mods }] = await Promise.all([
    supabase.rpc("fn_estatisticas", { p_ini: ini, p_fim: hoje, p_modalidade: modalidade || undefined }),
    supabase.from("modalidades").select("slug, nome").order("id"),
  ]);
  const e = estat as unknown as Estat;
  const r = e.resumo;
  const totalRet = e.retencao.renovacoes + e.retencao.cancelamentos + e.retencao.vencidas_sem_renovar;
  const taxaRenovacao = totalRet ? Math.round((100 * e.retencao.renovacoes) / totalRet) : 0;
  const pct = (v: number | null) => (v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";

  return (
    <>
      <Cabecalho
        titulo="Estatísticas de pacientes"
        sub={`${data(ini)} a ${data(hoje)}${modalidade ? ` · ${mods?.find((m) => m.slug === modalidade)?.nome}` : " · todas as modalidades"}`}
        acoes={
          <div className="flex flex-wrap items-center gap-2">
            <PilulasUrl param="periodo" padrao="90" opcoes={PERIODOS.map((p) => ({ valor: String(p.dias), rotulo: p.rotulo.replace("Últimos ", "") }))} />
            <SelecaoUrl
              param="modalidade"
              icone={<Layers size={16} />}
              opcoes={[{ valor: "", rotulo: "Todas as modalidades" }, ...(mods ?? []).map((m) => ({ valor: m.slug, rotulo: m.nome }))]}
            />
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Indicador rotulo="Pacientes atendidos" valor={r.pacientes_atendidos} tom="positivo" />
        <Indicador rotulo="Novos pacientes" valor={r.novos} detalhe="cadastrados no período" />
        <Indicador rotulo="Sessões realizadas" valor={r.sessoes_realizadas.toLocaleString("pt-BR")} />
        <Indicador rotulo="Taxa de faltas" valor={pct(r.taxa_faltas)} detalhe={`${r.faltas} faltas`} tom={(r.taxa_faltas ?? 0) > 12 ? "negativo" : "neutro"} />
        <Indicador rotulo="Ticket médio" valor={moeda(r.ticket_medio)} detalhe="por paciente pagante" />
        <Indicador rotulo="Receita" valor={moeda(r.receita)} detalhe="recebida no período" tom="positivo" />
      </div>

      <Secao titulo="Perfil" sub="Quem são os pacientes atendidos no período">
        <Cartao><CartaoTitulo titulo="Faixa etária" /><div className="p-4"><GraficoBarras dados={e.faixa_etaria} x="faixa" series={[{ chave: "total", nome: "Pacientes", cor: "#607E36" }]} altura={230} /></div></Cartao>
        <Cartao><CartaoTitulo titulo="Sexo" /><div className="p-5"><GraficoRosca dados={e.sexo} nome="sexo" valor="total" altura={170} cores={["#96A27E", "#5E7C8A", "#C49A6C"]} /></div></Cartao>
        <Cartao><CartaoTitulo titulo="Bairros (Lapa)" /><div className="p-4"><GraficoBarras dados={e.bairros} x="nome" series={[{ chave: "total", nome: "Pacientes", cor: "#96A27E" }]} horizontal altura={300} /></div></Cartao>
        <Cartao><CartaoTitulo titulo="Cidades" /><div className="p-4"><GraficoBarras dados={e.cidades} x="nome" series={[{ chave: "total", nome: "Pacientes", cor: "#5E7C8A" }]} horizontal altura={260} /></div></Cartao>
        <Cartao className="lg:col-span-2"><CartaoTitulo titulo="Profissões" /><div className="p-4"><GraficoBarras dados={e.profissoes} x="nome" series={[{ chave: "total", nome: "Pacientes", cor: "#C49A6C" }]} horizontal altura={300} /></div></Cartao>
      </Secao>

      <Secao titulo="Aquisição" sub="De onde vêm os pacientes">
        <Cartao className="lg:col-span-2"><CartaoTitulo titulo="Novos pacientes por mês" sub="Últimos 12 meses" /><div className="p-4"><GraficoBarras dados={e.novos_por_mes} x="mes" series={[{ chave: "total", nome: "Novos pacientes", cor: "#607E36" }]} altura={240} /></div></Cartao>
        <Cartao className="lg:col-span-2"><CartaoTitulo titulo="Como conheceram a clínica" /><div className="p-5"><GraficoRosca dados={e.origem} nome="nome" valor="total" altura={190} /></div></Cartao>
      </Secao>

      <Secao titulo="Uso" sub="O que é mais procurado e quando">
        <Cartao><CartaoTitulo titulo="Pacientes ativos por modalidade" /><div className="p-4"><GraficoBarras dados={e.ativos_por_modalidade} x="modalidade" series={[{ chave: "total", nome: "Pacientes" }]} coresPorItem="cor" altura={230} /></div></Cartao>
        <Cartao><CartaoTitulo titulo="Serviços mais procurados" /><div className="p-4"><GraficoBarras dados={e.servicos} x="nome" series={[{ chave: "total", nome: "Atendimentos", cor: "#607E36" }]} horizontal altura={280} /></div></Cartao>
        <Cartao><CartaoTitulo titulo="Horários de pico" /><div className="p-4"><GraficoBarras dados={e.horarios} x="hora" series={[{ chave: "total", nome: "Atendimentos", cor: "#96A27E" }]} altura={230} /></div></Cartao>
        <Cartao><CartaoTitulo titulo="Dias da semana" /><div className="p-4"><GraficoBarras dados={e.dias_semana} x="dia" series={[{ chave: "total", nome: "Atendimentos", cor: "#5E7C8A" }]} altura={230} /></div></Cartao>
        <Cartao className="lg:col-span-2">
          <CartaoTitulo titulo="Ocupação das turmas de Pilates" sub="Alunos fixos ativos ÷ vagas" />
          <div className="grid gap-x-6 gap-y-2 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {e.ocupacao_turmas.map((t) => (
              <div key={t.turma} className="text-sm">
                <div className="flex justify-between gap-2"><span className="truncate">{t.turma.replace("Pilates ", "")}</span><span className="font-bold tabular">{t.alunos}/{t.vagas}</span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-creme"><div className="h-full rounded-full" style={{ width: `${Math.min(100, t.ocupacao)}%`, background: t.ocupacao >= 100 ? "#3E5228" : t.ocupacao >= 50 ? "#607E36" : "#C49A6C" }} /></div>
              </div>
            ))}
          </div>
        </Cartao>
      </Secao>

      <Secao titulo="Retenção" sub="Renovação dos planos e pacientes para reativar">
        <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-5">
          <Indicador rotulo="Taxa de renovação" valor={`${taxaRenovacao}%`} detalhe="dos planos que venceram" tom="positivo" />
          <Indicador rotulo="Renovações" valor={e.retencao.renovacoes} />
          <Indicador rotulo="Cancelamentos" valor={e.retencao.cancelamentos} tom="negativo" />
          <Indicador rotulo="Venceram sem renovar" valor={e.retencao.vencidas_sem_renovar} tom="alerta" />
          <Indicador rotulo="Planos ativos" valor={e.retencao.ativas} detalhe={`${e.retencao.pausadas} pausados`} />
        </div>
        <Cartao className="lg:col-span-2">
          <CartaoTitulo titulo={`Inativos há mais de 60 dias (${e.inativos.length})`} sub="Sem horário marcado e sem plano ativo. Uma mensagem pode trazer de volta." />
          {e.inativos.length === 0 ? <Vazio>Nenhum paciente inativo.</Vazio> : (
            <Tabela className="max-h-96 overflow-y-auto">
              <thead><tr><th>Paciente</th><th>Última visita</th><th>Há</th><th>Telefone</th><th /></tr></thead>
              <tbody>
                {e.inativos.map((p) => {
                  const zap = linkWhatsApp(p.telefone, `Olá, ${primeiroNome(p.nome)}! Aqui é da Fisiocenter 🌿 Faz um tempinho que você não vem. Como está? Se precisar, temos horários essa semana para cuidar de você.`);
                  return (
                    <tr key={p.id}>
                      <td><Link href={`/pacientes/${p.id}`} className="font-semibold text-verde-escuro hover:underline">{p.nome}</Link></td>
                      <td className="tabular">{data(p.ultima)}</td>
                      <td className="tabular text-suave">{p.dias} dias</td>
                      <td className="tabular">{p.telefone}</td>
                      <td>{zap && <a href={zap} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#128C4B] hover:underline"><MessageCircle size={14} /> Chamar</a>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabela>
          )}
        </Cartao>
      </Secao>

      <Secao titulo="Frequência" sub="Onde e com quem as faltas acontecem">
        <Cartao>
          <CartaoTitulo titulo="Turmas com mais faltas" />
          {e.faltas_turmas.length === 0 ? <Vazio>Sem registros.</Vazio> : (
            <Tabela><thead><tr><th>Turma</th><th className="text-right">Faltas</th><th className="text-right">Taxa</th></tr></thead>
              <tbody>{e.faltas_turmas.map((t) => <tr key={t.turma}><td>{t.turma.replace("Pilates ", "")}</td><td className="text-right tabular">{t.faltas}</td><td className="text-right font-semibold tabular">{pct(t.taxa)}</td></tr>)}</tbody>
            </Tabela>
          )}
        </Cartao>
        <Cartao>
          <CartaoTitulo titulo="Pacientes que mais faltam" />
          {e.faltas_pacientes.length === 0 ? <Vazio>Sem registros.</Vazio> : (
            <Tabela><thead><tr><th>Paciente</th><th className="text-right">Faltas</th><th className="text-right">Taxa</th></tr></thead>
              <tbody>{e.faltas_pacientes.map((p) => <tr key={p.id}><td><Link href={`/pacientes/${p.id}`} className="hover:underline">{p.nome}</Link></td><td className="text-right tabular">{p.faltas}</td><td className="text-right font-semibold tabular">{pct(p.taxa)}</td></tr>)}</tbody>
            </Tabela>
          )}
        </Cartao>
      </Secao>

      <Secao titulo="Valor" sub="Quanto cada paciente representa">
        <Cartao className="lg:col-span-2">
          <CartaoTitulo titulo="Ticket médio por modalidade" sub="Receita recebida ÷ pacientes pagantes no período" />
          <div className="p-4"><GraficoBarras dados={e.ticket_modalidade} x="modalidade" series={[{ chave: "ticket", nome: "Ticket médio" }]} coresPorItem="cor" formato="moeda" altura={240} /></div>
        </Cartao>
      </Secao>
    </>
  );
}

function Secao({ titulo, sub, children }: { titulo: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-baseline gap-3 border-b border-borda pb-2">
        <h2 className="text-2xl">{titulo}</h2>
        <p className="text-sm text-suave">{sub}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">{children}</div>
    </section>
  );
}
