import { MessageCircle, Plus } from "lucide-react";
import Link from "next/link";
import { BarraFiltros, BuscaUrl, LimparFiltros, PilulasUrl } from "@/components/filtros";
import { Abas, BotaoLink, Cabecalho, Cartao, CartaoTitulo, Entrada, Indicador, Selo, Tabela, Vazio } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { DIAS_CURTO, PERIODICIDADES, STATUS_MATRICULA, data, hojeISO, linkWhatsApp, moeda, primeiroNome, somaDias } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { salvarPrecoPlano } from "./actions";
import { AcoesMatricula, BotaoGerarCobrancas } from "./botoes";

export const metadata = { title: "Planos" };

const ABAS = [
  { id: "matriculas", rotulo: "Matrículas" },
  { id: "vencimentos", rotulo: "Vencimentos e renovações" },
  { id: "catalogo", rotulo: "Catálogo de planos" },
];

export default async function PlanosPage({ searchParams }: { searchParams: Promise<{ aba?: string; status?: string; q?: string }> }) {
  const sessao = await exigirPapel("admin", "recepcao");
  const { aba = "matriculas", status = "ativo", q = "" } = await searchParams;
  const supabase = await createClient();
  await supabase.rpc("atualizar_vencimentos");
  const hoje = hojeISO();

  const [matsR, planosR] = await Promise.all([
    supabase
      .from("matriculas")
      .select("id, inicio, vencimento, status, reposicoes_disp, dia_vencimento, plano_id, pacientes(id, nome, telefone), planos(nome, preco_mensal, periodicidade), matricula_turmas(turmas(dia_semana, hora))")
      .order("vencimento"),
    supabase.from("planos").select("id, nome, aulas_semana, periodicidade, preco_mensal, desconto_pct, servico_id, servicos(nome)").eq("ativo", true).order("servico_id").order("aulas_semana").order("preco_mensal", { ascending: false }),
  ]);
  const mats = matsR.data ?? [];
  const planos = planosR.data ?? [];

  const ativas = mats.filter((m) => m.status === "ativo");
  const receitaMensal = ativas.reduce((s, m) => s + Number(m.planos?.preco_mensal ?? 0), 0);
  const vencendo = ativas.filter((m) => m.vencimento <= somaDias(hoje, 15));
  const contagem = (s: string) => mats.filter((m) => m.status === s).length;

  return (
    <>
      <Cabecalho
        titulo="Planos"
        sub="Matrículas do Pilates, horários fixos, vencimentos e mensalidades recorrentes."
        acoes={<><BotaoGerarCobrancas /><BotaoLink href="/planos/nova"><Plus size={16} /> Nova matrícula</BotaoLink></>}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Alunos ativos" valor={ativas.length} detalhe={`${contagem("pausado")} pausados`} tom="positivo" />
        <Indicador rotulo="Receita recorrente" valor={moeda(receitaMensal)} detalhe="por mês, planos ativos" />
        <Indicador rotulo="Vencendo em 15 dias" valor={vencendo.length} detalhe="renovar com o aluno" tom={vencendo.length ? "alerta" : "neutro"} />
        <Indicador rotulo="Vencidos ou cancelados" valor={contagem("vencido") + contagem("cancelado")} detalhe="para reconquistar" tom="negativo" />
      </div>

      <Abas ativa={aba} abas={ABAS.map((a) => ({ ...a, href: `/planos?aba=${a.id}` }))} />

      {aba === "matriculas" && (() => {
        const termo = q.trim().toLowerCase();
        const lista = mats.filter((m) => (status === "todos" || m.status === status) && (!termo || m.pacientes?.nome.toLowerCase().includes(termo)));
        return (
          <>
            <BarraFiltros>
              <BuscaUrl placeholder="Buscar aluno" />
              <PilulasUrl
                param="status"
                padrao="ativo"
                opcoes={[
                  ...Object.entries(STATUS_MATRICULA).map(([k, v]) => ({ valor: k, rotulo: <>{v.rotulo} <span className="opacity-60">{contagem(k)}</span></> })),
                  { valor: "todos", rotulo: <>Todos <span className="opacity-60">{mats.length}</span></> },
                ]}
              />
              <LimparFiltros manter={["aba"]} />
            </BarraFiltros>
            <Cartao>
              {lista.length === 0 ? <Vazio>Nenhuma matrícula.</Vazio> : (
                <Tabela>
                  <thead><tr><th>Aluno</th><th>Plano</th><th>Horários fixos</th><th>Mensalidade</th><th>Vencimento</th><th>Repos.</th><th>Situação</th><th /></tr></thead>
                  <tbody>
                    {lista.map((m) => (
                      <tr key={m.id}>
                        <td><Link href={`/pacientes/${m.pacientes?.id}`} className="font-semibold text-verde-escuro hover:underline">{m.pacientes?.nome}</Link></td>
                        <td className="text-suave">{m.planos?.nome}</td>
                        <td className="whitespace-nowrap text-xs">
                          {m.matricula_turmas.filter((x) => x.turmas).sort((a, b) => a.turmas!.dia_semana - b.turmas!.dia_semana).map((x) => `${DIAS_CURTO[x.turmas!.dia_semana]} ${x.turmas!.hora.slice(0, 5)}`).join(" · ")}
                        </td>
                        <td className="tabular">{moeda(m.planos?.preco_mensal)} <span className="text-xs text-suave">dia {m.dia_vencimento}</span></td>
                        <td className="tabular">{data(m.vencimento)}</td>
                        <td className="text-center tabular">{m.reposicoes_disp || ""}</td>
                        <td><Selo className={STATUS_MATRICULA[m.status]?.classe}>{STATUS_MATRICULA[m.status]?.rotulo}</Selo></td>
                        <td><AcoesMatricula id={m.id} status={m.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </Tabela>
              )}
            </Cartao>
          </>
        );
      })()}

      {aba === "vencimentos" && (() => {
        const proximos = mats.filter((m) => m.status === "ativo" && m.vencimento <= somaDias(hoje, 30));
        const recentes = mats.filter((m) => m.status === "vencido" || (m.status === "cancelado" && m.vencimento >= somaDias(hoje, -90)));
        const Linha = ({ m }: { m: (typeof mats)[number] }) => {
          const dias = Math.round((new Date(`${m.vencimento}T12:00:00Z`).getTime() - new Date(`${hoje}T12:00:00Z`).getTime()) / 86400000);
          const msg = m.status === "ativo"
            ? `Olá, ${primeiroNome(m.pacientes?.nome ?? "")}! Aqui é da Fisiocenter 🌿 Seu plano ${m.planos?.nome} vence em ${data(m.vencimento)}. Vamos renovar e manter seus horários garantidos?`
            : `Olá, ${primeiroNome(m.pacientes?.nome ?? "")}! Sentimos sua falta no Pilates da Fisiocenter 🌿 Que tal voltar? Temos horários disponíveis na sua rotina.`;
          const zap = linkWhatsApp(m.pacientes?.telefone, msg);
          return (
            <tr>
              <td><Link href={`/pacientes/${m.pacientes?.id}`} className="font-semibold text-verde-escuro hover:underline">{m.pacientes?.nome}</Link></td>
              <td className="text-suave">{m.planos?.nome}</td>
              <td className="tabular">{data(m.vencimento)}</td>
              <td>
                <Selo className={dias < 0 ? "bg-red-100 text-red-800" : dias <= 7 ? "bg-areia text-texto" : "bg-creme text-verde-escuro"}>
                  {dias < 0 ? `há ${-dias} dias` : dias === 0 ? "hoje" : `em ${dias} dias`}
                </Selo>
              </td>
              <td className="whitespace-nowrap">
                {zap && <a href={zap} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#128C4B] hover:underline"><MessageCircle size={14} /> Avisar</a>}
              </td>
              <td><AcoesMatricula id={m.id} status={m.status} /></td>
            </tr>
          );
        };
        return (
          <div className="space-y-6">
            <Cartao>
              <CartaoTitulo titulo="Vencendo nos próximos 30 dias" sub="Renove para manter o aluno nos horários fixos. A mensalidade entra no financeiro." />
              {proximos.length === 0 ? <Vazio>Nenhum plano vencendo.</Vazio> : (
                <Tabela><thead><tr><th>Aluno</th><th>Plano</th><th>Vencimento</th><th>Prazo</th><th>WhatsApp</th><th /></tr></thead>
                  <tbody>{proximos.map((m) => <Linha key={m.id} m={m} />)}</tbody></Tabela>
              )}
            </Cartao>
            <Cartao>
              <CartaoTitulo titulo="Vencidos e cancelados recentes" sub="Bons candidatos para uma mensagem de retorno." />
              {recentes.length === 0 ? <Vazio>Ninguém por aqui.</Vazio> : (
                <Tabela><thead><tr><th>Aluno</th><th>Plano</th><th>Vencimento</th><th>Prazo</th><th>WhatsApp</th><th /></tr></thead>
                  <tbody>{recentes.map((m) => <Linha key={m.id} m={m} />)}</tbody></Tabela>
              )}
            </Cartao>
          </div>
        );
      })()}

      {aba === "catalogo" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {[...new Set(planos.map((p) => p.servicos?.nome ?? ""))].map((tipo) => (
            <Cartao key={tipo}>
              <CartaoTitulo titulo={tipo} sub="Valor mensal por frequência e periodicidade" />
              <ul className="divide-y divide-borda">
                {planos.filter((p) => p.servicos?.nome === tipo).map((p) => {
                  const alunos = ativas.filter((m) => m.plano_id === p.id).length;
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{p.aulas_semana}x por semana · {PERIODICIDADES[p.periodicidade]}</p>
                        <p className="text-xs text-suave">{alunos} aluno(s) ativo(s){Number(p.desconto_pct) > 0 ? ` · ${Number(p.desconto_pct)}% de desconto` : ""}</p>
                      </div>
                      {sessao.papel === "admin" ? (
                        <form action={salvarPrecoPlano} className="flex items-center gap-1">
                          <input type="hidden" name="id" value={p.id} />
                          <span className="text-xs text-suave">R$</span>
                          <Entrada name="preco" defaultValue={Number(p.preco_mensal)} className="h-8 w-20 px-2 text-right tabular" inputMode="decimal" />
                          <button className="rounded-md px-2 py-1 text-xs font-semibold text-verde-marca hover:bg-creme">Salvar</button>
                        </form>
                      ) : (
                        <span className="font-bold tabular">{moeda(p.preco_mensal)}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Cartao>
          ))}
        </div>
      )}
    </>
  );
}
