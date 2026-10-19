import { AlertTriangle, CalendarCheck, CalendarClock, Wallet } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GraficoArea, GraficoRosca } from "@/components/graficos";
import { BotaoLink, Cabecalho, Cartao, CartaoTitulo, Indicador, Selo, Vazio } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { FORMAS_PAGAMENTO, STATUS_AGENDAMENTO, data, hojeISO, hora, moeda, nomeMes, primeiroNome, somaDias, somaMeses } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Painel" };

type Painel = {
  faturamento: number; a_receber: number; atrasado: number; despesas: number; despesas_pagas: number;
  sessoes_realizadas: number; faltas: number;
  por_dia: { dia: string; receitas: number; despesas: number }[];
  por_modalidade: { modalidade: string; cor: string; valor: number }[];
  por_forma: { forma: string; valor: number }[];
};

export default async function PainelPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sessao = await exigirPapel();
  if (sessao.papel === "fisio") redirect("/agenda");
  const admin = sessao.papel === "admin";

  const { mes: mesParam } = await searchParams;
  const hoje = hojeISO();
  const mes = /^\d{4}-\d{2}$/.test(mesParam ?? "") ? `${mesParam}-01` : `${hoje.slice(0, 7)}-01`;

  const supabase = await createClient();
  const [painelR, agendaR, aulasR, vencendoR] = await Promise.all([
    supabase.rpc("fn_painel", { p_mes: mes }),
    supabase
      .from("agendamentos")
      .select("id, inicio, status, endereco_domiciliar, pacientes(nome), servicos(nome, modalidades(nome, cor)), profissionais(nome, cor_agenda)")
      .gte("inicio", `${hoje}T00:00:00-03:00`)
      .lt("inicio", `${somaDias(hoje, 1)}T00:00:00-03:00`)
      .neq("status", "cancelado")
      .order("inicio"),
    supabase
      .from("aulas")
      .select("id, turmas(hora, vagas, servicos(nome), profissionais(nome)), presencas(status)")
      .eq("data", hoje),
    supabase
      .from("matriculas")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativo")
      .gte("vencimento", hoje)
      .lte("vencimento", somaDias(hoje, 7)),
  ]);

  const p = (painelR.data ?? {}) as unknown as Painel;
  const agenda = agendaR.data ?? [];
  const aulas = (aulasR.data ?? []).sort((a, b) => String(a.turmas?.hora).localeCompare(String(b.turmas?.hora)));
  const taxaFaltas = p.sessoes_realizadas + p.faltas ? Math.round((1000 * p.faltas) / (p.sessoes_realizadas + p.faltas)) / 10 : 0;
  const saldo = Number(p.faturamento) - Number(p.despesas_pagas);
  const mesAnterior = somaMeses(mes, -1).slice(0, 7);
  const mesSeguinte = somaMeses(mes, 1).slice(0, 7);
  const horaAgora = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(new Date()));
  const saudacao = horaAgora < 12 ? "Bom dia" : horaAgora < 18 ? "Boa tarde" : "Boa noite";

  return (
    <>
      <Cabecalho
        titulo={`${saudacao}, ${primeiroNome(sessao.nome)}!`}
        sub={`Hoje é ${data(hoje, "EEEE, d 'de' MMMM")} · ${agenda.length} atendimentos e ${aulas.length} aulas de Pilates`}
        acoes={
          <div className="flex items-center gap-1 rounded-lg border border-borda bg-white p-1 text-sm">
            <Link href={`/?mes=${mesAnterior}`} className="rounded-md px-2 py-1 hover:bg-creme">‹</Link>
            <span className="px-2 font-semibold text-verde-escuro">{nomeMes(mes)}</span>
            <Link href={`/?mes=${mesSeguinte}`} className="rounded-md px-2 py-1 hover:bg-creme">›</Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {admin ? (
          <>
            <Indicador rotulo="Faturamento" valor={moeda(p.faturamento)} detalhe="recebido no mês" tom="positivo" icone={<Wallet size={16} />} />
            <Indicador rotulo="A receber" valor={moeda(p.a_receber)} detalhe={<span className="text-red-700">{moeda(p.atrasado)} em atraso</span>} tom="alerta" />
            <Indicador rotulo="Despesas" valor={moeda(p.despesas)} detalhe={`${moeda(p.despesas_pagas)} já pagas`} tom="negativo" />
            <Indicador rotulo="Saldo do mês" valor={moeda(saldo)} detalhe="recebido − despesas pagas" tom={saldo >= 0 ? "positivo" : "negativo"} />
          </>
        ) : (
          <>
            <Indicador rotulo="Recebido no mês" valor={moeda(p.faturamento)} tom="positivo" icone={<Wallet size={16} />} />
            <Indicador rotulo="A receber" valor={moeda(p.a_receber)} detalhe="vencendo no mês" tom="alerta" />
            <Indicador rotulo="Em atraso" valor={moeda(p.atrasado)} detalhe={<Link className="underline" href="/financeiro?aba=receber">ver cobranças</Link>} tom="negativo" />
            <Indicador rotulo="Planos vencendo" valor={vencendoR.count ?? 0} detalhe="nos próximos 7 dias" />
          </>
        )}
        <Indicador rotulo="Sessões realizadas" valor={p.sessoes_realizadas} detalhe="atendimentos + aulas no mês" icone={<CalendarCheck size={16} />} />
        <Indicador rotulo="Taxa de faltas" valor={`${taxaFaltas.toString().replace(".", ",")}%`} detalhe={`${p.faltas} faltas no mês`} tom={taxaFaltas > 12 ? "negativo" : "neutro"} />
        {admin && <Indicador rotulo="Planos vencendo" valor={vencendoR.count ?? 0} detalhe={<Link className="underline" href="/planos?aba=vencimentos">nos próximos 7 dias</Link>} icone={<CalendarClock size={16} />} />}
        {admin && <Indicador rotulo="Em atraso" valor={moeda(p.atrasado)} detalhe={<Link className="underline" href="/financeiro?aba=receber">cobrar pacientes</Link>} tom="negativo" icone={<AlertTriangle size={16} />} />}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Cartao>
          <CartaoTitulo titulo="Movimento do mês" sub="Entradas e saídas por dia" />
          <div className="p-4">
            <GraficoArea
              dados={p.por_dia ?? []}
              x="dia"
              series={admin ? [{ chave: "receitas", nome: "Recebido", cor: "#607E36" }, { chave: "despesas", nome: "Despesas pagas", cor: "#C49A6C" }] : [{ chave: "receitas", nome: "Recebido", cor: "#607E36" }]}
            />
          </div>
        </Cartao>
        <Cartao>
          <CartaoTitulo titulo="Receita por modalidade" />
          <div className="p-5">
            {p.por_modalidade?.length ? <GraficoRosca dados={p.por_modalidade} nome="modalidade" valor="valor" formato="moeda" altura={170} /> : <Vazio>Nenhum recebimento no mês.</Vazio>}
            {!!p.por_forma?.length && (
              <div className="mt-5 grid grid-cols-2 gap-2 border-t border-borda pt-4 text-sm">
                {p.por_forma.map((f) => (
                  <div key={f.forma} className="flex justify-between gap-2">
                    <span className="text-suave">{FORMAS_PAGAMENTO[f.forma] ?? f.forma}</span>
                    <span className="font-semibold tabular">{moeda(f.valor)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Cartao>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Cartao>
          <CartaoTitulo titulo="Agenda de hoje" sub="Fisioterapia, estética e domiciliar" acao={<BotaoLink href="/agenda?aba=geral&visao=dia" variante="secundario">Abrir agenda</BotaoLink>} />
          {agenda.length === 0 ? (
            <Vazio>Nenhum atendimento hoje.</Vazio>
          ) : (
            <ul className="divide-y divide-borda">
              {agenda.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="w-12 text-sm font-bold tabular text-verde-escuro">{hora(a.inicio)}</span>
                  <span className="h-8 w-1 rounded-full" style={{ background: a.servicos?.modalidades?.cor ?? "#607E36" }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.pacientes?.nome}</p>
                    <p className="truncate text-xs text-suave">
                      {a.servicos?.nome} · {a.profissionais?.nome}
                      {a.endereco_domiciliar ? ` · ${a.endereco_domiciliar}` : ""}
                    </p>
                  </div>
                  <Selo className={STATUS_AGENDAMENTO[a.status]?.classe}>{STATUS_AGENDAMENTO[a.status]?.rotulo}</Selo>
                </li>
              ))}
            </ul>
          )}
        </Cartao>
        <Cartao>
          <CartaoTitulo titulo="Pilates hoje" acao={<BotaoLink href="/agenda?aba=pilates" variante="secundario">Grade</BotaoLink>} />
          {aulas.length === 0 ? (
            <Vazio>Sem aulas na grade hoje.</Vazio>
          ) : (
            <ul className="divide-y divide-borda">
              {aulas.map((a) => {
                const ocupadas = a.presencas.length;
                const vagas = a.turmas?.vagas ?? 0;
                return (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <span className="w-12 font-bold tabular text-verde-escuro">{String(a.turmas?.hora).slice(0, 5)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{a.turmas?.servicos?.nome}</p>
                      <p className="truncate text-xs text-suave">{a.turmas?.profissionais?.nome}</p>
                    </div>
                    <Selo className={ocupadas >= vagas ? "bg-verde-marca text-white" : "bg-creme text-verde-escuro"}>
                      {ocupadas}/{vagas} alunos
                    </Selo>
                  </li>
                );
              })}
            </ul>
          )}
        </Cartao>
      </div>
    </>
  );
}
