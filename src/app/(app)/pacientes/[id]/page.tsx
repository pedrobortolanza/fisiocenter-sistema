import { CalendarPlus, MessageCircle, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotaoLink, Cabecalho, Cartao, CartaoTitulo, Indicador, Selo, Tabela, Vazio } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import {
  DIAS_CURTO, FORMAS_PAGAMENTO, SITUACAO_RECEBIMENTO, STATUS_AGENDAMENTO, STATUS_MATRICULA, data, hojeISO, hora, idade, linkWhatsApp, moeda, primeiroNome,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Ficha do paciente" };

const SEXO: Record<string, string> = { F: "Feminino", M: "Masculino", O: "Outro" };

export default async function FichaPacientePage({ params }: { params: Promise<{ id: string }> }) {
  const sessao = await exigirPapel();
  const equipe = sessao.papel !== "fisio";
  const { id } = await params;
  const supabase = await createClient();

  const [pac, ags, mats, pacotes, pres, recs] = await Promise.all([
    supabase.from("pacientes").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("agendamentos")
      .select("id, inicio, status, servicos(nome, modalidades(nome, cor)), profissionais(nome)")
      .eq("paciente_id", id)
      .order("inicio", { ascending: false })
      .limit(60),
    supabase
      .from("matriculas")
      .select("id, inicio, vencimento, status, reposicoes_disp, obs, planos(nome, preco_mensal), matricula_turmas(turmas(dia_semana, hora, servicos(nome)))")
      .eq("paciente_id", id)
      .order("inicio", { ascending: false }),
    supabase.from("pacotes").select("id, total_sessoes, sessoes_usadas, valor_total, validade, criado_em, servicos(nome)").eq("paciente_id", id).order("criado_em", { ascending: false }),
    supabase.from("presencas").select("status, tipo, aulas(data)").eq("paciente_id", id),
    equipe
      ? supabase.from("vw_recebimentos").select("id, descricao, valor, vencimento, pago_em, forma_pagamento, situacao").eq("paciente_id", id).order("vencimento", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; descricao: string; valor: number; vencimento: string; pago_em: string | null; forma_pagamento: string | null; situacao: string }[] }),
  ]);

  const p = pac.data;
  if (!p) notFound();
  const agendamentos = ags.data ?? [];
  const recebimentos = recs.data ?? [];
  const presencas = pres.data ?? [];
  const agora = new Date().toISOString();
  const proximos = agendamentos.filter((a) => a.inicio >= agora && a.status !== "cancelado").reverse();
  const historico = agendamentos.filter((a) => a.inicio < agora);
  const realizados = historico.filter((a) => a.status === "realizado").length + presencas.filter((x) => x.status === "presente").length;
  const faltas = historico.filter((a) => a.status === "faltou").length + presencas.filter((x) => x.status === "falta" || x.status === "justificada").length;
  const totalPago = recebimentos.filter((r) => r.situacao === "pago").reduce((s, r) => s + Number(r.valor), 0);
  const emAberto = recebimentos.filter((r) => r.situacao === "aberto" || r.situacao === "atrasado").reduce((s, r) => s + Number(r.valor), 0);
  const zap = linkWhatsApp(p.telefone, `Olá, ${primeiroNome(p.nome)}! Aqui é da Fisiocenter 🌿`);
  const hoje = hojeISO();

  return (
    <>
      <Cabecalho
        titulo={p.nome}
        sub={
          <span className="flex flex-wrap items-center gap-2">
            {idade(p.nascimento) !== null && <span>{idade(p.nascimento)} anos</span>}
            {p.profissao && <span>· {p.profissao}</span>}
            <span>· {p.convenio ?? "Particular"}</span>
            <span>· cliente desde {data(p.criado_em, "MMMM 'de' yyyy")}</span>
            {!p.ativo && <Selo className="bg-zinc-200 text-zinc-600">Inativo</Selo>}
          </span>
        }
        acoes={
          <>
            {zap && (
              <a href={zap} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-3.5 py-2 text-sm font-semibold text-white">
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}
            {equipe && <BotaoLink href={`/agenda?aba=fisioterapia`} variante="secundario"><CalendarPlus size={16} /> Agendar</BotaoLink>}
            {equipe && <BotaoLink href={`/pacientes/${p.id}/editar`} variante="secundario"><Pencil size={16} /> Editar</BotaoLink>}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Sessões realizadas" valor={realizados} detalhe="atendimentos e aulas" tom="positivo" />
        <Indicador rotulo="Faltas" valor={faltas} detalhe={realizados + faltas ? `${Math.round((100 * faltas) / (realizados + faltas))}% de faltas` : "sem histórico"} tom={faltas > 3 ? "alerta" : "neutro"} />
        {equipe ? (
          <>
            <Indicador rotulo="Total pago" valor={moeda(totalPago)} />
            <Indicador rotulo="Em aberto" valor={moeda(emAberto)} tom={emAberto > 0 ? "negativo" : "neutro"} />
          </>
        ) : (
          <Indicador rotulo="Próximos horários" valor={proximos.length} />
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <Cartao>
            <CartaoTitulo titulo="Dados" />
            <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 p-5 text-sm">
              <dt className="text-suave">Telefone</dt><dd>{p.telefone ?? "–"}</dd>
              <dt className="text-suave">E-mail</dt><dd className="break-all">{p.email ?? "–"}</dd>
              <dt className="text-suave">CPF</dt><dd className="tabular">{p.cpf ?? "–"}</dd>
              <dt className="text-suave">Nascimento</dt><dd>{p.nascimento ? data(p.nascimento) : "–"}</dd>
              <dt className="text-suave">Sexo</dt><dd>{p.sexo ? SEXO[p.sexo] : "–"}</dd>
              <dt className="text-suave">Endereço</dt><dd>{[p.endereco, p.bairro, p.cidade].filter(Boolean).join(" · ") || "–"}</dd>
              <dt className="text-suave">Conheceu por</dt><dd>{p.origem ?? "–"}</dd>
              {p.obs && (<><dt className="text-suave">Observações</dt><dd className="rounded-lg bg-areia/50 px-2 py-1">{p.obs}</dd></>)}
            </dl>
          </Cartao>

          <Cartao>
            <CartaoTitulo titulo="Planos de Pilates" acao={equipe && <BotaoLink href={`/planos/nova?paciente=${p.id}`} variante="secundario">Matricular</BotaoLink>} />
            {(mats.data ?? []).length === 0 ? (
              <Vazio>Sem planos.</Vazio>
            ) : (
              <ul className="divide-y divide-borda">
                {(mats.data ?? []).map((m) => (
                  <li key={m.id} className="space-y-1 px-5 py-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{m.planos?.nome}</span>
                      <Selo className={STATUS_MATRICULA[m.status]?.classe}>{STATUS_MATRICULA[m.status]?.rotulo}</Selo>
                    </div>
                    <p className="text-xs text-suave">
                      {data(m.inicio)} a {data(m.vencimento)} · {moeda(m.planos?.preco_mensal)}/mês · {m.reposicoes_disp} reposição(ões) disponível(is)
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {m.matricula_turmas.map((mt, i) => mt.turmas && (
                        <Selo key={i} className="bg-creme text-verde-escuro">{DIAS_CURTO[mt.turmas.dia_semana]} {mt.turmas.hora.slice(0, 5)} · {mt.turmas.servicos?.nome.replace("Pilates ", "")}</Selo>
                      ))}
                    </div>
                    {m.obs && <p className="text-xs italic text-suave">{m.obs}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          <Cartao>
            <CartaoTitulo titulo="Pacotes de sessões" />
            {(pacotes.data ?? []).length === 0 ? (
              <Vazio>Sem pacotes.</Vazio>
            ) : (
              <ul className="divide-y divide-borda">
                {(pacotes.data ?? []).map((pc) => {
                  const pct = Math.round((100 * pc.sessoes_usadas) / pc.total_sessoes);
                  return (
                    <li key={pc.id} className="px-5 py-3 text-sm">
                      <div className="flex justify-between"><span className="font-semibold">{pc.servicos?.nome}</span><span className="tabular">{pc.sessoes_usadas}/{pc.total_sessoes}</span></div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-creme"><div className="h-full rounded-full bg-verde-marca" style={{ width: `${pct}%` }} /></div>
                      <p className="mt-1 text-xs text-suave">{moeda(pc.valor_total)} · comprado em {data(pc.criado_em)}{pc.validade ? ` · válido até ${data(pc.validade)}` : ""}{pc.validade && pc.validade < hoje ? " (vencido)" : ""}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Cartao>
        </div>

        <div className="space-y-6">
          <Cartao>
            <CartaoTitulo titulo="Próximos horários" />
            {proximos.length === 0 ? <Vazio>Nenhum horário marcado.</Vazio> : <ListaSessoes itens={proximos} />}
          </Cartao>
          <Cartao>
            <CartaoTitulo titulo="Histórico de sessões" sub="Fisioterapia, estética e domiciliar (as aulas de Pilates contam nos indicadores acima)" />
            {historico.length === 0 ? <Vazio>Sem histórico.</Vazio> : <ListaSessoes itens={historico.slice(0, 25)} />}
          </Cartao>
          {equipe && (
            <Cartao>
              <CartaoTitulo titulo="Pagamentos" />
              {recebimentos.length === 0 ? (
                <Vazio>Nenhum lançamento.</Vazio>
              ) : (
                <Tabela>
                  <thead><tr><th>Vencimento</th><th>Descrição</th><th>Forma</th><th className="text-right">Valor</th><th>Situação</th></tr></thead>
                  <tbody>
                    {recebimentos.map((r) => (
                      <tr key={r.id}>
                        <td className="tabular">{data(r.vencimento)}</td>
                        <td>{r.descricao}</td>
                        <td className="text-suave">{r.forma_pagamento ? FORMAS_PAGAMENTO[r.forma_pagamento] : "–"}</td>
                        <td className="text-right font-semibold tabular">{moeda(r.valor)}</td>
                        <td><Selo className={SITUACAO_RECEBIMENTO[r.situacao ?? ""]?.classe}>{SITUACAO_RECEBIMENTO[r.situacao ?? ""]?.rotulo}</Selo></td>
                      </tr>
                    ))}
                  </tbody>
                </Tabela>
              )}
            </Cartao>
          )}
        </div>
      </div>
      <p className="mt-6 text-xs text-suave"><Link href="/pacientes" className="hover:underline">← Voltar para pacientes</Link></p>
    </>
  );
}

function ListaSessoes({ itens }: { itens: { id: string; inicio: string; status: string; servicos: { nome: string; modalidades: { nome: string; cor: string } | null } | null; profissionais: { nome: string } | null }[] }) {
  return (
    <ul className="divide-y divide-borda">
      {itens.map((a) => (
        <li key={a.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
          <span className="w-24 shrink-0 tabular text-suave">{data(a.inicio, "dd/MM/yy")} {hora(a.inicio)}</span>
          <span className="h-6 w-1 rounded-full" style={{ background: a.servicos?.modalidades?.cor }} />
          <span className="min-w-0 flex-1 truncate"><b className="font-semibold">{a.servicos?.nome}</b> <span className="text-suave">· {a.profissionais?.nome}</span></span>
          <Selo className={STATUS_AGENDAMENTO[a.status]?.classe}>{STATUS_AGENDAMENTO[a.status]?.rotulo}</Selo>
        </li>
      ))}
    </ul>
  );
}
