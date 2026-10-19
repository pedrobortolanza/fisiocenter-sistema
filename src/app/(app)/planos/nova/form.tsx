"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BuscaPaciente, type PacienteEscolhido } from "@/components/busca-paciente";
import { Botao, Campo, Cartao, Entrada, Selecao, cx } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { DIAS_CURTO, MESES_PERIODICIDADE, PERIODICIDADES, data, hojeISO, moeda, primeiroNome, somaDias, somaMeses } from "@/lib/format";

type Plano = { id: number; nome: string; aulas_semana: number; periodicidade: string; preco_mensal: number; servico_id: number | null; modalidade_id: number };
type Turma = { id: number; dia_semana: number; hora: string; vagas: number; servico_id: number; profissional_nome: string; alunos_fixos: number };

export function FormMatricula({ planos, turmas, pacienteInicial }: { planos: Plano[]; turmas: Turma[]; pacienteInicial: PacienteEscolhido | null }) {
  const router = useRouter();
  const [paciente, setPaciente] = useState<PacienteEscolhido | null>(pacienteInicial);
  const [planoId, setPlanoId] = useState(planos.find((p) => p.aulas_semana === 2)?.id ?? planos[0]?.id);
  const [inicio, setInicio] = useState(hojeISO());
  const [diaVenc, setDiaVenc] = useState(10);
  const [escolhidas, setEscolhidas] = useState<number[]>([]);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const plano = planos.find((p) => p.id === planoId);
  const doTipo = turmas.filter((t) => t.servico_id === plano?.servico_id);
  const horas = [...new Set(doTipo.map((t) => t.hora.slice(0, 5)))].sort();
  const dias = [...new Set(doTipo.map((t) => t.dia_semana))].sort();
  const vencimento = plano ? somaMeses(inicio, MESES_PERIODICIDADE[plano.periodicidade]) : inicio;

  function alternar(id: number) {
    setEscolhidas((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));
  }

  async function salvar() {
    if (!paciente || !plano) return setErro("Escolha o aluno e o plano.");
    if (escolhidas.length !== plano.aulas_semana)
      return setErro(`O plano ${plano.aulas_semana}x por semana precisa de ${plano.aulas_semana} horário(s) fixo(s). Você marcou ${escolhidas.length}.`);
    setSalvando(true);
    setErro("");
    const supabase = createClient();
    const { data: m, error } = await supabase
      .from("matriculas")
      .insert({ paciente_id: paciente.id, plano_id: plano.id, inicio, vencimento, dia_vencimento: diaVenc, status: "ativo" })
      .select("id")
      .single();
    if (error) { setSalvando(false); return setErro("Não foi possível salvar a matrícula."); }
    await supabase.from("matricula_turmas").insert(escolhidas.map((turma_id) => ({ matricula_id: m.id, turma_id })));
    await supabase.rpc("gerar_cobrancas", { p_mes: inicio });
    await supabase.rpc("gerar_aulas", { p_ini: inicio, p_fim: somaDias(inicio, 28) });
    router.push(`/pacientes/${paciente.id}`);
    router.refresh();
  }

  return (
    <Cartao className="space-y-6 p-5 sm:p-6">
      <Campo rotulo="Aluno" grupo><BuscaPaciente valor={paciente} aoEscolher={setPaciente} /></Campo>
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Plano" className="sm:col-span-3">
          <Selecao value={planoId} onChange={(e) => { setPlanoId(Number(e.target.value)); setEscolhidas([]); }}>
            {planos.map((p) => <option key={p.id} value={p.id}>{p.nome} · {moeda(p.preco_mensal)}/mês</option>)}
          </Selecao>
        </Campo>
        <Campo rotulo="Início"><Entrada type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} /></Campo>
        <Campo rotulo="Dia de vencimento da mensalidade">
          <Selecao value={diaVenc} onChange={(e) => setDiaVenc(Number(e.target.value))}>
            {[5, 10, 15, 20, 25].map((d) => <option key={d} value={d}>Todo dia {d}</option>)}
          </Selecao>
        </Campo>
        <Campo rotulo="Vigência">
          <div className="rounded-lg border border-borda bg-creme/60 px-3 py-2 text-sm">{plano ? PERIODICIDADES[plano.periodicidade] : ""} · até {data(vencimento)}</div>
        </Campo>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-suave">
          Horários fixos · escolha {plano?.aulas_semana} ({escolhidas.length} marcado{escolhidas.length === 1 ? "" : "s"})
        </p>
        <div className="overflow-x-auto rounded-lg border border-borda">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr><th className="w-16 p-2" />{dias.map((d) => <th key={d} className="p-2 text-left font-bold text-verde-escuro">{DIAS_CURTO[d]}</th>)}</tr></thead>
            <tbody>
              {horas.map((h) => (
                <tr key={h} className="border-t border-borda">
                  <td className="p-2 text-xs font-bold text-suave">{h}</td>
                  {dias.map((d) => {
                    const t = doTipo.find((x) => x.dia_semana === d && x.hora.slice(0, 5) === h);
                    if (!t) return <td key={d} className="p-1.5" />;
                    const cheia = t.alunos_fixos >= t.vagas;
                    const marcada = escolhidas.includes(t.id);
                    return (
                      <td key={d} className="p-1.5">
                        <button
                          type="button"
                          disabled={cheia && !marcada}
                          onClick={() => alternar(t.id)}
                          className={cx(
                            "w-full rounded-md border px-2 py-1.5 text-left text-xs",
                            marcada ? "border-verde-marca bg-verde-marca text-white" : cheia ? "cursor-not-allowed border-borda bg-zinc-100 text-zinc-400" : "border-borda bg-white hover:border-verde-marca",
                          )}
                        >
                          <b>{t.alunos_fixos}/{t.vagas}</b> {cheia ? "lotada" : "vagas"}
                          <span className="block opacity-80">{primeiroNome(t.profissional_nome)}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      <div className="flex items-center justify-between gap-2 border-t border-borda pt-5">
        <p className="text-sm text-suave">{plano && <>Mensalidade de <b className="text-verde-escuro">{moeda(plano.preco_mensal)}</b> todo dia {diaVenc}</>}</p>
        <Botao onClick={salvar} disabled={salvando || !paciente}>{salvando ? "Salvando..." : "Confirmar matrícula"}</Botao>
      </div>
    </Cartao>
  );
}
