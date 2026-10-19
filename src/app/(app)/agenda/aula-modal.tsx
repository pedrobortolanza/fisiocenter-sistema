"use client";

import { Ban, RotateCcw, Sparkles, UserPlus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BuscaPaciente, type PacienteEscolhido } from "@/components/busca-paciente";
import { Modal } from "@/components/modal";
import { Botao, Selecao, Selo, Vazio, cx } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { data } from "@/lib/format";
import type { Usuario } from "@/lib/tipos";

export type AulaResumo = {
  id: string | null;
  data: string;
  status: string;
  turma_id: number;
  hora: string;
  vagas: number;
  servico: string;
  profissional: string;
  profissional_id: string;
  sala: string;
};

type Presenca = {
  paciente_id: string;
  tipo: string;
  status: string;
  matricula_id: string | null;
  pacientes: { nome: string; telefone: string | null } | null;
};

const STATUS_PRESENCA = [
  { id: "presente", rotulo: "Presente", classe: "bg-verde-marca text-white border-verde-marca" },
  { id: "falta", rotulo: "Falta", classe: "bg-red-600 text-white border-red-600" },
  { id: "justificada", rotulo: "Justificada", classe: "bg-areia text-texto border-areia" },
];

const TIPO_ROTULO: Record<string, string> = { fixo: "Fixo", reposicao: "Reposição", experimental: "Experimental" };

export function AulaModal({ aula, usuario, aoFechar }: { aula: AulaResumo; usuario: Usuario; aoFechar: () => void }) {
  const podeEditar = usuario.papel !== "fisio" || usuario.profissionalId === aula.profissional_id;
  const [aulaId, setAulaId] = useState(aula.id);
  const [status, setStatus] = useState(aula.status);
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [reposicoes, setReposicoes] = useState<{ id: string; paciente_id: string; reposicoes_disp: number; pacientes: { nome: string } | null }[]>([]);
  const [modo, setModo] = useState<"lista" | "reposicao" | "experimental">("lista");
  const [escolhida, setEscolhida] = useState("");
  const [experimental, setExperimental] = useState<PacienteEscolhido | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const supabase = createClient();
    let id = aulaId;
    if (!id) {
      // a aula ainda não foi gerada para essa data: gera a grade do dia
      await supabase.rpc("gerar_aulas", { p_ini: aula.data, p_fim: aula.data });
      const { data: a } = await supabase.from("aulas").select("id, status").eq("turma_id", aula.turma_id).eq("data", aula.data).maybeSingle();
      id = a?.id ?? null;
      if (a) { setAulaId(a.id); setStatus(a.status); }
    }
    if (id) {
      const { data: p } = await supabase
        .from("presencas")
        .select("paciente_id, tipo, status, matricula_id, pacientes(nome, telefone)")
        .eq("aula_id", id);
      setPresencas(((p ?? []) as Presenca[]).sort((a, b) => (a.tipo === b.tipo ? (a.pacientes?.nome ?? "").localeCompare(b.pacientes?.nome ?? "") : a.tipo === "fixo" ? -1 : 1)));
    }
    setCarregando(false);
  }, [aulaId, aula.data, aula.turma_id]);

  useEffect(() => { carregar(); }, [carregar]);

  async function marcar(pacienteId: string, novo: string) {
    if (!aulaId) return;
    const { error } = await createClient().from("presencas").update({ status: novo }).eq("aula_id", aulaId).eq("paciente_id", pacienteId);
    if (error) return setErro("Não foi possível salvar a presença.");
    setPresencas((ps) => ps.map((p) => (p.paciente_id === pacienteId ? { ...p, status: novo } : p)));
  }

  async function abrirReposicao() {
    setModo("reposicao");
    const { data: r } = await createClient()
      .from("matriculas")
      .select("id, paciente_id, reposicoes_disp, pacientes(nome)")
      .eq("status", "ativo")
      .gt("reposicoes_disp", 0)
      .order("reposicoes_disp", { ascending: false });
    setReposicoes((r ?? []).filter((m) => !presencas.some((p) => p.paciente_id === m.paciente_id)));
  }

  async function adicionar(tipo: "reposicao" | "experimental") {
    if (!aulaId) return;
    const supabase = createClient();
    const m = reposicoes.find((r) => r.id === escolhida);
    const pacienteId = tipo === "reposicao" ? m?.paciente_id : experimental?.id;
    if (!pacienteId) return;
    const { error } = await supabase.from("presencas").insert({
      aula_id: aulaId, paciente_id: pacienteId, matricula_id: tipo === "reposicao" ? m!.id : null, tipo, status: "previsto",
    });
    if (error) return setErro("Esse aluno já está nesta aula.");
    setModo("lista");
    setEscolhida("");
    setExperimental(null);
    carregar();
  }

  async function remover(pacienteId: string) {
    if (!aulaId || !confirm("Tirar este aluno da aula?")) return;
    await createClient().from("presencas").delete().eq("aula_id", aulaId).eq("paciente_id", pacienteId);
    carregar();
  }

  async function alternarCancelamento() {
    if (!aulaId) return;
    const novo = status === "cancelada" ? "prevista" : "cancelada";
    if (novo === "cancelada" && !confirm("Cancelar esta aula (feriado, imprevisto)? Os alunos fixos ficam com o registro.")) return;
    const { error } = await createClient().from("aulas").update({ status: novo }).eq("id", aulaId);
    if (!error) setStatus(novo);
  }

  const lotada = presencas.length >= aula.vagas;

  return (
    <Modal aberto aoFechar={aoFechar} titulo={`${aula.servico} · ${aula.hora.slice(0, 5)}`} largura="max-w-xl">
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2 text-suave">
          <span className="font-semibold text-texto first-letter:uppercase">{data(aula.data, "EEEE, dd/MM")}</span>·<span>{aula.profissional}</span>·<span>{aula.sala}</span>
          <Selo className={cx("ml-auto", lotada ? "bg-verde-marca text-white" : "bg-creme text-verde-escuro")}>{presencas.length}/{aula.vagas} vagas</Selo>
          {status === "cancelada" && <Selo className="bg-zinc-200 text-zinc-700">Aula cancelada</Selo>}
        </div>

        {carregando ? (
          <Vazio>Carregando alunos...</Vazio>
        ) : presencas.length === 0 ? (
          <Vazio>Nenhum aluno nesta turma ainda.</Vazio>
        ) : (
          <ul className="divide-y divide-borda rounded-lg border border-borda">
            {presencas.map((p) => (
              <li key={p.paciente_id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <Link href={`/pacientes/${p.paciente_id}`} className="font-semibold hover:underline">{p.pacientes?.nome}</Link>
                  <span className={cx("ml-2 text-xs", p.tipo === "fixo" ? "text-suave" : "font-semibold text-verde-marca")}>{TIPO_ROTULO[p.tipo]}</span>
                </div>
                <div className="flex gap-1">
                  {STATUS_PRESENCA.map((s) => (
                    <button
                      key={s.id}
                      disabled={!podeEditar}
                      onClick={() => marcar(p.paciente_id, p.status === s.id ? "previsto" : s.id)}
                      className={cx("rounded-md border px-2 py-1 text-xs font-semibold", p.status === s.id ? s.classe : "border-borda bg-white text-suave hover:border-verde-marca")}
                    >
                      {s.rotulo}
                    </button>
                  ))}
                  {podeEditar && p.tipo !== "fixo" && (
                    <button onClick={() => remover(p.paciente_id)} className="px-1 text-xs text-suave hover:text-red-700" title="Remover">✕</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {podeEditar && modo === "lista" && (
          <div className="flex flex-wrap gap-2 border-t border-borda pt-4">
            <Botao variante="secundario" onClick={abrirReposicao} disabled={lotada}><RotateCcw size={15} /> Encaixar reposição</Botao>
            <Botao variante="secundario" onClick={() => setModo("experimental")} disabled={lotada}><Sparkles size={15} /> Aula experimental</Botao>
            <Botao variante="fantasma" onClick={alternarCancelamento} className="ml-auto">
              <Ban size={15} /> {status === "cancelada" ? "Reabrir aula" : "Cancelar aula"}
            </Botao>
          </div>
        )}

        {modo === "reposicao" && (
          <div className="space-y-3 rounded-lg bg-creme/70 p-3">
            <p className="text-xs text-suave">Alunos com reposição disponível (geradas por faltas):</p>
            <Selecao value={escolhida} onChange={(e) => setEscolhida(e.target.value)}>
              <option value="">Escolha o aluno</option>
              {reposicoes.map((r) => <option key={r.id} value={r.id}>{r.pacientes?.nome} · {r.reposicoes_disp} disponível(is)</option>)}
            </Selecao>
            <div className="flex justify-end gap-2">
              <Botao variante="secundario" onClick={() => setModo("lista")}>Voltar</Botao>
              <Botao onClick={() => adicionar("reposicao")} disabled={!escolhida}><UserPlus size={15} /> Encaixar</Botao>
            </div>
          </div>
        )}

        {modo === "experimental" && (
          <div className="space-y-3 rounded-lg bg-creme/70 p-3">
            <BuscaPaciente valor={experimental} aoEscolher={setExperimental} />
            <div className="flex justify-end gap-2">
              <Botao variante="secundario" onClick={() => setModo("lista")}>Voltar</Botao>
              <Botao onClick={() => adicionar("experimental")} disabled={!experimental}><UserPlus size={15} /> Agendar experimental</Botao>
            </div>
          </div>
        )}

        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{erro}</p>}
      </div>
    </Modal>
  );
}
