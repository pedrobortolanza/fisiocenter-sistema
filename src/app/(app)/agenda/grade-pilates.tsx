"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Botao, Cartao, Indicador, Selecao, cx } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { DIAS_CURTO, data, hojeISO, primeiroNome, somaDias } from "@/lib/format";
import type { Catalogo, Usuario } from "@/lib/tipos";
import { AulaModal, type AulaResumo } from "./aula-modal";

type Turma = {
  id: number; dia_semana: number; hora: string; duracao_min: number; vagas: number; servico_id: number;
  servico_nome: string; sala_nome: string; profissional_id: string; profissional_nome: string; alunos_fixos: number;
};
type Aula = { id: string; turma_id: number; data: string; status: string; presencas: { status: string; tipo: string }[] };

const COR_SERVICO: Record<string, string> = { "Pilates Aparelhos": "#607E36", "Pilates Solo": "#96A27E", "Pilates Suspensus": "#5E7C8A" };

function segundaDaSemana(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  const dow = d.getUTCDay();
  return somaDias(iso, dow === 0 ? -6 : 1 - dow);
}

export function GradePilates({ catalogo, usuario }: { catalogo: Catalogo; usuario: Usuario }) {
  const hoje = hojeISO();
  const [semana, setSemana] = useState(segundaDaSemana(hoje));
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [filtroServico, setFiltroServico] = useState("");
  const [filtroProf, setFiltroProf] = useState(usuario.papel === "fisio" ? usuario.profissionalId ?? "" : "");
  const [aberta, setAberta] = useState<AulaResumo | null>(null);

  const carregar = useCallback(async () => {
    const supabase = createClient();
    if (usuario.papel !== "fisio") await supabase.rpc("gerar_aulas", { p_ini: semana, p_fim: somaDias(semana, 6) });
    const [t, a] = await Promise.all([
      supabase.from("vw_ocupacao_turmas").select("*").order("hora"),
      supabase.from("aulas").select("id, turma_id, data, status, presencas(status, tipo)").gte("data", semana).lte("data", somaDias(semana, 6)),
    ]);
    setTurmas((t.data ?? []) as Turma[]);
    setAulas((a.data ?? []) as Aula[]);
  }, [semana, usuario.papel]);

  useEffect(() => { carregar(); }, [carregar]);

  const servicosPilates = catalogo.servicos.filter((s) => catalogo.modalidades.find((m) => m.id === s.modalidade_id)?.slug === "pilates" && s.nome.startsWith("Pilates"));
  const visiveis = turmas.filter((t) => (!filtroServico || t.servico_id === Number(filtroServico)) && (!filtroProf || t.profissional_id === filtroProf));
  const horas = [...new Set(visiveis.map((t) => t.hora.slice(0, 5)))].sort();
  const dias = [1, 2, 3, 4, 5, 6];
  const instrutores = catalogo.profissionais.filter((p) => turmas.some((t) => t.profissional_id === p.id));

  const resumo = useMemo(() => {
    const vagas = visiveis.reduce((s, t) => s + t.vagas, 0);
    const fixos = visiveis.reduce((s, t) => s + Number(t.alunos_fixos), 0);
    const lotadas = visiveis.filter((t) => Number(t.alunos_fixos) >= t.vagas).length;
    const daSemana = aulas.filter((a) => visiveis.some((t) => t.id === a.turma_id));
    const pres = daSemana.flatMap((a) => a.presencas);
    const marcadas = pres.filter((p) => p.status !== "previsto");
    const faltas = marcadas.filter((p) => p.status !== "presente").length;
    return { vagas, fixos, livres: vagas - fixos, lotadas, ocup: vagas ? Math.round((100 * fixos) / vagas) : 0, faltas, marcadas: marcadas.length };
  }, [visiveis, aulas]);

  function abrir(t: Turma, dia: string) {
    const a = aulas.find((x) => x.turma_id === t.id && x.data === dia);
    setAberta({
      id: a?.id ?? null, data: dia, status: a?.status ?? "prevista", turma_id: t.id, hora: t.hora, vagas: t.vagas,
      servico: t.servico_nome, profissional: t.profissional_nome, profissional_id: t.profissional_id, sala: t.sala_nome,
    });
  }

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Ocupação da grade" valor={`${resumo.ocup}%`} detalhe={`${resumo.fixos} lugares fixos de ${resumo.vagas}`} tom="positivo" />
        <Indicador rotulo="Vagas livres" valor={resumo.livres} detalhe="para novos alunos" />
        <Indicador rotulo="Turmas lotadas" valor={resumo.lotadas} detalhe={`de ${visiveis.length} turmas`} />
        <Indicador rotulo="Faltas na semana" valor={resumo.faltas} detalhe={`${resumo.marcadas} presenças registradas`} tom={resumo.faltas > 0 ? "alerta" : "neutro"} />
      </div>

      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-borda bg-white p-1">
          <button onClick={() => setSemana(somaDias(semana, -7))} className="rounded-md p-1.5 hover:bg-creme" aria-label="Semana anterior"><ChevronLeft size={16} /></button>
          <span className="px-2 text-sm font-semibold text-verde-escuro">{data(semana, "dd/MM")} a {data(somaDias(semana, 5), "dd/MM/yyyy")}</span>
          <button onClick={() => setSemana(somaDias(semana, 7))} className="rounded-md p-1.5 hover:bg-creme" aria-label="Próxima semana"><ChevronRight size={16} /></button>
        </div>
        <Botao variante="secundario" onClick={() => setSemana(segundaDaSemana(hoje))}>Esta semana</Botao>
        <Selecao value={filtroServico} onChange={(e) => setFiltroServico(e.target.value)} className="w-auto">
          <option value="">Todos os tipos</option>
          {servicosPilates.map((s) => <option key={s.id} value={s.id}>{s.nome.replace("Pilates ", "")}</option>)}
        </Selecao>
        <Selecao value={filtroProf} onChange={(e) => setFiltroProf(e.target.value)} className="w-auto">
          <option value="">Todos os instrutores</option>
          {instrutores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </Selecao>
        <div className="ml-auto flex gap-3 text-xs text-suave">
          {Object.entries(COR_SERVICO).map(([k, c]) => (
            <span key={k} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: c }} />{k.replace("Pilates ", "")}</span>
          ))}
        </div>
      </div>

      <Cartao className="overflow-x-auto">
        <table className="w-full min-w-[860px] table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-16 border-b border-borda p-2" />
              {dias.map((d, i) => {
                const dia = somaDias(semana, i);
                return (
                  <th key={d} className={cx("border-b border-l border-borda p-2 text-left", dia === hoje && "bg-[#f6f3e9]")}>
                    <span className="font-bold text-verde-escuro">{DIAS_CURTO[d]}</span>{" "}
                    <span className="text-xs font-normal text-suave">{data(dia, "dd/MM")}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {horas.map((h) => (
              <tr key={h}>
                <td className="border-b border-borda p-2 align-top text-xs font-bold text-suave tabular">{h}</td>
                {dias.map((d, i) => {
                  const dia = somaDias(semana, i);
                  const doHorario = visiveis.filter((t) => t.dia_semana === d && t.hora.slice(0, 5) === h);
                  return (
                    <td key={d} className={cx("border-b border-l border-borda p-1.5 align-top", dia === hoje && "bg-[#f6f3e9]")}>
                      <div className="space-y-1.5">
                        {doHorario.map((t) => {
                          const a = aulas.find((x) => x.turma_id === t.id && x.data === dia);
                          const ocupadas = a ? a.presencas.length : Number(t.alunos_fixos);
                          const pct = Math.min(100, Math.round((100 * ocupadas) / t.vagas));
                          const cor = COR_SERVICO[t.servico_nome] ?? "#607E36";
                          const cancelada = a?.status === "cancelada";
                          return (
                            <button
                              key={t.id}
                              onClick={() => abrir(t, dia)}
                              className={cx("block w-full rounded-lg border bg-white p-2 text-left transition hover:shadow-md", cancelada && "opacity-50 line-through")}
                              style={{ borderColor: `${cor}55`, borderLeft: `4px solid ${cor}` }}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="truncate text-xs font-bold" style={{ color: cor }}>{t.servico_nome.replace("Pilates ", "")}</span>
                                <span className={cx("text-xs font-bold tabular", ocupadas >= t.vagas ? "text-verde-escuro" : "text-suave")}>{ocupadas}/{t.vagas}</span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-creme">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cor }} />
                              </div>
                              <div className="mt-1 truncate text-[11px] text-suave">{primeiroNome(t.profissional_nome)}</div>
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Cartao>

      {aberta && <AulaModal aula={aberta} usuario={usuario} aoFechar={() => { setAberta(null); carregar(); }} />}
    </>
  );
}
