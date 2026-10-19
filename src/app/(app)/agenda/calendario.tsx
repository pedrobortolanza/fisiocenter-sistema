"use client";

import type { DateSelectArg, EventClickArg, EventContentArg, EventInput } from "@fullcalendar/core";
import ptBr from "@fullcalendar/core/locales/pt-br";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import { Plus } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { Botao, Cartao, Selecao } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { STATUS_AGENDAMENTO } from "@/lib/format";
import type { Catalogo, Usuario } from "@/lib/tipos";
import { SALA_POR_MODALIDADE, profissionaisDa } from "@/lib/tipos";
import { DetalheAgendamento, NovoAgendamento, type AgendamentoCompleto } from "./agendamento-modais";
import { AulaModal, type AulaResumo } from "./aula-modal";

const SELECT =
  "id, inicio, fim, status, obs, endereco_domiciliar, pacote_id, sala_id, profissional_id, servico_id, paciente_id, " +
  "pacientes(nome, telefone), servicos!inner(nome, modalidade_id, preco), profissionais(nome, cor_agenda), salas(nome), pacotes(total_sessoes, sessoes_usadas)";

export function AgendaCalendario({ modalidade, catalogo, usuario, visaoInicial }: {
  modalidade: string | null;
  catalogo: Catalogo;
  usuario: Usuario;
  visaoInicial: string;
}) {
  const cal = useRef<FullCalendar>(null);
  const fisio = usuario.papel === "fisio";
  const [filtroProf, setFiltroProf] = useState(fisio ? usuario.profissionalId ?? "" : "");
  const [filtroSala, setFiltroSala] = useState("");
  const [filtroMod, setFiltroMod] = useState("");
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const [novo, setNovo] = useState<{ inicio: Date } | null>(null);
  const [detalhe, setDetalhe] = useState<AgendamentoCompleto | null>(null);
  const [aula, setAula] = useState<AulaResumo | null>(null);
  const [aviso, setAviso] = useState("");

  const mod = catalogo.modalidades.find((m) => m.slug === modalidade);
  const corMod = (id: number) => catalogo.modalidades.find((m) => m.id === id)?.cor ?? "#607E36";
  const tipoSala = modalidade ? SALA_POR_MODALIDADE[modalidade] : undefined;
  const salas = catalogo.salas.filter((s) => (tipoSala === undefined ? s.tipo !== "pilates" : s.tipo === tipoSala));
  const pilatesId = catalogo.modalidades.find((m) => m.slug === "pilates")?.id;

  const recarregar = useCallback(() => cal.current?.getApi().refetchEvents(), []);

  const buscarEventos = useCallback(
    async (info: { startStr: string; endStr: string }, ok: (e: EventInput[]) => void, falha: (e: Error) => void) => {
      const supabase = createClient();
      let q = supabase.from("agendamentos").select(SELECT).gte("inicio", info.startStr).lt("inicio", info.endStr).order("inicio");
      const modId = mod?.id ?? (filtroMod ? Number(filtroMod) : null);
      if (modId) q = q.eq("servicos.modalidade_id", modId);
      if (filtroProf) q = q.eq("profissional_id", filtroProf);
      if (filtroSala) q = q.eq("sala_id", Number(filtroSala));
      if (!mostrarCancelados) q = q.neq("status", "cancelado");
      const { data, error } = await q;
      if (error) return falha(new Error(error.message));

      const eventos: EventInput[] = ((data ?? []) as unknown as AgendamentoCompleto[]).map((a) => ({
        id: a.id,
        start: a.inicio,
        end: a.fim,
        title: a.pacientes?.nome ?? "",
        backgroundColor: modalidade ? a.profissionais?.cor_agenda : corMod(a.servicos.modalidade_id),
        classNames: [`status-${a.status}`],
        extendedProps: { tipo: "agendamento", ag: a },
      }));

      // Na visão geral, mostra também as aulas de Pilates
      if (!modalidade && (!filtroMod || Number(filtroMod) === pilatesId) && !filtroSala) {
        let qa = supabase
          .from("aulas")
          .select("id, data, status, turma_id, turmas!inner(hora, duracao_min, vagas, profissional_id, servicos(nome), profissionais(nome, cor_agenda), salas(nome)), presencas(status)")
          .gte("data", info.startStr.slice(0, 10))
          .lt("data", info.endStr.slice(0, 10));
        if (filtroProf) qa = qa.eq("turmas.profissional_id", filtroProf);
        const { data: aulas } = await qa;
        for (const au of aulas ?? []) {
          const t = au.turmas;
          if (!t) continue;
          const ini = new Date(`${au.data}T${t.hora}-03:00`);
          eventos.push({
            id: `aula-${au.id}`,
            start: ini,
            end: new Date(ini.getTime() + t.duracao_min * 60000),
            title: `${t.servicos?.nome} · ${au.presencas.length}/${t.vagas}`,
            backgroundColor: corMod(pilatesId ?? 0),
            classNames: au.status === "cancelada" ? ["status-cancelado"] : [],
            extendedProps: {
              tipo: "aula",
              aula: { id: au.id, data: au.data, status: au.status, turma_id: au.turma_id, hora: t.hora, vagas: t.vagas, servico: t.servicos?.nome ?? "", profissional: t.profissionais?.nome ?? "", profissional_id: t.profissional_id, sala: t.salas?.nome ?? "" },
            },
          });
        }
      }
      ok(eventos);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modalidade, filtroProf, filtroSala, filtroMod, mostrarCancelados],
  );

  const eventSources = useMemo(() => [{ events: buscarEventos }], [buscarEventos]);

  function aoSelecionar(s: DateSelectArg) {
    cal.current?.getApi().unselect();
    if (fisio) return;
    if (s.start < new Date(Date.now() - 1000 * 60 * 60 * 24 * 30)) {
      setAviso("Esse horário é muito antigo para agendar.");
      return;
    }
    setNovo({ inicio: s.start });
  }

  function aoClicar(e: EventClickArg) {
    const p = e.event.extendedProps;
    if (p.tipo === "aula") setAula(p.aula as AulaResumo);
    else setDetalhe(p.ag as AgendamentoCompleto);
  }

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        {!fisio && (
          <Selecao value={filtroProf} onChange={(e) => setFiltroProf(e.target.value)} className="w-auto min-w-48">
            <option value="">Todos os profissionais</option>
            {profissionaisDa(catalogo.profissionais, modalidade).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </Selecao>
        )}
        {!modalidade && (
          <Selecao value={filtroMod} onChange={(e) => setFiltroMod(e.target.value)} className="w-auto min-w-44">
            <option value="">Todas as modalidades</option>
            {catalogo.modalidades.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </Selecao>
        )}
        {salas.length > 1 && !fisio && (
          <Selecao value={filtroSala} onChange={(e) => setFiltroSala(e.target.value)} className="w-auto min-w-44">
            <option value="">Todas as salas</option>
            {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </Selecao>
        )}
        <label className="flex items-center gap-2 px-2 text-sm text-suave">
          <input type="checkbox" checked={mostrarCancelados} onChange={(e) => setMostrarCancelados(e.target.checked)} className="accent-verde-marca" />
          Mostrar cancelados
        </label>
        <div className="flex-1" />
        {!fisio && (
          <Botao onClick={() => setNovo({ inicio: proximoHorario() })}>
            <Plus size={16} /> Novo agendamento
          </Botao>
        )}
      </div>

      <div className="no-print mb-3 flex flex-wrap gap-3 text-xs text-suave">
        {Object.entries(STATUS_AGENDAMENTO).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5"><span className={`rounded px-1.5 py-0.5 ${v.classe}`}>{v.rotulo}</span></span>
        ))}
        {modalidade
          ? profissionaisDa(catalogo.profissionais, modalidade).map((p) => (
              <span key={p.id} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: p.cor_agenda }} />{p.nome}</span>
            ))
          : catalogo.modalidades.map((m) => (
              <span key={m.id} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: m.cor }} />{m.nome}</span>
            ))}
      </div>

      {aviso && <p className="mb-3 rounded-lg bg-areia px-3 py-2 text-sm" onClick={() => setAviso("")}>{aviso}</p>}

      <Cartao className="p-3 sm:p-4">
        <FullCalendar
          ref={cal}
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          locale={ptBr}
          initialView={visaoInicial}
          headerToolbar={{ left: "prev,next today", center: "title", right: "timeGridDay,timeGridWeek,dayGridMonth" }}
          buttonText={{ today: "Hoje", day: "Dia", week: "Semana", month: "Mês" }}
          hiddenDays={[0]}
          slotMinTime="07:00:00"
          slotMaxTime="20:30:00"
          slotDuration="00:30:00"
          slotLabelFormat={{ hour: "2-digit", minute: "2-digit" }}
          allDaySlot={false}
          nowIndicator
          selectable={!fisio}
          selectMirror
          dayMaxEvents={4}
          height="auto"
          expandRows
          eventSources={eventSources}
          select={aoSelecionar}
          eventClick={aoClicar}
          eventContent={ConteudoEvento}
        />
      </Cartao>

      {novo && (
        <NovoAgendamento
          inicio={novo.inicio}
          modalidade={modalidade}
          catalogo={catalogo}
          profissionalPadrao={filtroProf}
          aoFechar={() => setNovo(null)}
          aoSalvar={() => { setNovo(null); recarregar(); }}
        />
      )}
      {detalhe && (
        <DetalheAgendamento
          ag={detalhe}
          catalogo={catalogo}
          usuario={usuario}
          aoFechar={() => setDetalhe(null)}
          aoAlterar={() => { setDetalhe(null); recarregar(); }}
        />
      )}
      {aula && <AulaModal aula={aula} usuario={usuario} aoFechar={() => { setAula(null); recarregar(); }} />}
    </>
  );
}

function ConteudoEvento(arg: EventContentArg) {
  const p = arg.event.extendedProps;
  const inicio = arg.event.start ? arg.event.start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
  if (p.tipo === "aula") {
    return (
      <div className="overflow-hidden leading-tight text-white">
        <div className="text-[11px] opacity-90">{inicio} · Pilates</div>
        <div className="truncate font-semibold">{arg.event.title}</div>
      </div>
    );
  }
  const ag = p.ag as AgendamentoCompleto;
  return (
    <div className="overflow-hidden leading-tight text-white">
      <div className="truncate text-[11px] opacity-90">{inicio} · {ag.servicos?.nome}</div>
      <div className="truncate font-semibold">{arg.event.title}</div>
      {arg.view.type === "timeGridDay" && (
        <div className="truncate text-[11px] opacity-90">
          {ag.profissionais?.nome}{ag.salas ? ` · ${ag.salas.nome}` : ""}{ag.endereco_domiciliar ? ` · ${ag.endereco_domiciliar}` : ""} · {STATUS_AGENDAMENTO[ag.status]?.rotulo}
        </div>
      )}
    </div>
  );
}

function proximoHorario() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}
