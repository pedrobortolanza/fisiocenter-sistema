"use client";

import { CalendarClock, Check, MessageCircle, Package, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BuscaPaciente, type PacienteEscolhido } from "@/components/busca-paciente";
import { Modal } from "@/components/modal";
import { Botao, Campo, Entrada, Selecao, Selo, cx } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { FORMAS_PAGAMENTO, STATUS_AGENDAMENTO, TZ, data, hora, linkWhatsApp, moeda, primeiroNome } from "@/lib/format";
import type { Catalogo, Usuario } from "@/lib/tipos";
import { SALA_POR_MODALIDADE, profissionaisDa } from "@/lib/tipos";
import { formatInTimeZone } from "date-fns-tz";

export type AgendamentoCompleto = {
  id: string;
  inicio: string;
  fim: string;
  status: string;
  obs: string | null;
  endereco_domiciliar: string | null;
  pacote_id: string | null;
  sala_id: number | null;
  profissional_id: string;
  servico_id: number;
  paciente_id: string;
  pacientes: { nome: string; telefone: string | null } | null;
  servicos: { nome: string; modalidade_id: number; preco: number };
  profissionais: { nome: string; cor_agenda: string } | null;
  salas: { nome: string } | null;
  pacotes: { total_sessoes: number; sessoes_usadas: number } | null;
};

type Pacote = { id: string; servico_id: number; total_sessoes: number; sessoes_usadas: number };

const isoSP = (d: Date) => `${formatInTimeZone(d, TZ, "yyyy-MM-dd'T'HH:mm:ss")}-03:00`;

function mensagemErro(msg: string) {
  if (msg.includes("conflito_profissional")) return "Esse profissional já tem atendimento nesse horário.";
  if (msg.includes("conflito_sala")) return "Essa sala já está ocupada nesse horário.";
  return "Não foi possível salvar. Tente novamente.";
}

export function NovoAgendamento({ inicio, modalidade, catalogo, profissionalPadrao, aoFechar, aoSalvar, pacienteInicial }: {
  inicio: Date;
  modalidade: string | null;
  catalogo: Catalogo;
  profissionalPadrao?: string;
  aoFechar: () => void;
  aoSalvar: () => void;
  pacienteInicial?: PacienteEscolhido | null;
}) {
  const modsPermitidas = catalogo.modalidades.filter((m) => m.slug !== "pilates" && (!modalidade || m.slug === modalidade));
  const [paciente, setPaciente] = useState<PacienteEscolhido | null>(pacienteInicial ?? null);
  const [modId, setModId] = useState(modsPermitidas[0]?.id ?? 0);
  const servicos = catalogo.servicos.filter((s) => s.modalidade_id === modId);
  const [servicoId, setServicoId] = useState(servicos[0]?.id ?? 0);
  const servico = catalogo.servicos.find((s) => s.id === servicoId);
  const slug = catalogo.modalidades.find((m) => m.id === modId)?.slug ?? "fisioterapia";
  const tipoSala = SALA_POR_MODALIDADE[slug];
  const salas = catalogo.salas.filter((s) => s.tipo === tipoSala);
  const [salaId, setSalaId] = useState<number | "">(salas[0]?.id ?? "");
  const profissionais = profissionaisDa(catalogo.profissionais, slug);
  const [profId, setProfId] = useState(profissionalPadrao || profissionais[0]?.id || "");
  const [dia, setDia] = useState(formatInTimeZone(inicio, TZ, "yyyy-MM-dd"));
  const [horaIni, setHoraIni] = useState(formatInTimeZone(inicio, TZ, "HH:mm"));
  const [duracao, setDuracao] = useState(servico?.duracao_min ?? 50);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [pacoteId, setPacoteId] = useState("");
  const [novoPacote, setNovoPacote] = useState(false);
  const [endereco, setEndereco] = useState("");
  const [repetir, setRepetir] = useState(1);
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const s = catalogo.servicos.filter((x) => x.modalidade_id === modId);
    setServicoId(s[0]?.id ?? 0);
    const sl = catalogo.salas.filter((x) => x.tipo === SALA_POR_MODALIDADE[catalogo.modalidades.find((m) => m.id === modId)?.slug ?? ""]);
    setSalaId(sl[0]?.id ?? "");
    const ps = profissionaisDa(catalogo.profissionais, catalogo.modalidades.find((m) => m.id === modId)?.slug ?? null);
    setProfId((atual) => (ps.some((p) => p.id === atual) ? atual : ps[0]?.id ?? ""));
  }, [modId, catalogo]);

  useEffect(() => setDuracao(servico?.duracao_min ?? 50), [servico]);

  useEffect(() => {
    setPacoteId("");
    setPacotes([]);
    if (!paciente) return;
    setEndereco([paciente.endereco, paciente.bairro, paciente.cidade].filter(Boolean).join(" · "));
    createClient()
      .from("pacotes")
      .select("id, servico_id, total_sessoes, sessoes_usadas")
      .eq("paciente_id", paciente.id)
      .then(({ data }) => setPacotes((data ?? []).filter((p) => p.sessoes_usadas < p.total_sessoes)));
  }, [paciente]);

  const pacotesDoServico = useMemo(() => pacotes.filter((p) => p.servico_id === servicoId), [pacotes, servicoId]);
  useEffect(() => setPacoteId(pacotesDoServico[0]?.id ?? ""), [pacotesDoServico]);

  async function salvar() {
    if (!paciente || !servico || !profId) return setErro("Escolha paciente, serviço e profissional.");
    setSalvando(true);
    setErro("");
    const supabase = createClient();

    let pacote = pacoteId || null;
    if (novoPacote && !pacote) {
      const valor = Math.round(servico.preco * 10 * 0.9);
      const { data: pc, error } = await supabase
        .from("pacotes")
        .insert({ paciente_id: paciente.id, servico_id: servico.id, total_sessoes: 10, valor_total: valor })
        .select("id")
        .single();
      if (error) { setSalvando(false); return setErro("Não foi possível criar o pacote."); }
      pacote = pc.id;
      const mod = catalogo.modalidades.find((m) => m.id === servico.modalidade_id);
      await supabase.from("recebimentos").insert({
        paciente_id: paciente.id, pacote_id: pacote, profissional_id: profId, modalidade_id: mod?.id,
        descricao: `Pacote 10 sessões · ${servico.nome}`, valor, vencimento: dia, status: "aberto",
      });
    }

    const conflitos: string[] = [];
    let criados = 0;
    for (let i = 0; i < repetir; i++) {
      const ini = new Date(`${dia}T${horaIni}:00-03:00`);
      ini.setDate(ini.getDate() + 7 * i);
      const fim = new Date(ini.getTime() + duracao * 60000);
      const { error } = await supabase.from("agendamentos").insert({
        paciente_id: paciente.id,
        profissional_id: profId,
        servico_id: servico.id,
        sala_id: tipoSala ? (salaId === "" ? null : salaId) : null,
        pacote_id: pacote,
        inicio: isoSP(ini),
        fim: isoSP(fim),
        endereco_domiciliar: slug === "domiciliar" ? endereco || null : null,
        obs: obs || null,
      });
      if (error) conflitos.push(`${data(ini, "dd/MM")}: ${mensagemErro(error.message)}`);
      else criados++;
    }
    setSalvando(false);
    if (conflitos.length && !criados) return setErro(conflitos.join(" "));
    if (conflitos.length) alert(`${criados} horários agendados. Não foi possível agendar:\n${conflitos.join("\n")}`);
    aoSalvar();
  }

  return (
    <Modal aberto aoFechar={aoFechar} titulo="Novo agendamento" largura="max-w-xl">
      <div className="space-y-4">
        <Campo rotulo="Paciente" grupo>
          <BuscaPaciente valor={paciente} aoEscolher={setPaciente} />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          {modsPermitidas.length > 1 && (
            <Campo rotulo="Modalidade">
              <Selecao value={modId} onChange={(e) => setModId(Number(e.target.value))}>
                {modsPermitidas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </Selecao>
            </Campo>
          )}
          <Campo rotulo="Serviço" className={modsPermitidas.length > 1 ? "" : "sm:col-span-2"}>
            <Selecao value={servicoId} onChange={(e) => setServicoId(Number(e.target.value))}>
              {servicos.map((s) => <option key={s.id} value={s.id}>{s.nome} · {moeda(s.preco)}</option>)}
            </Selecao>
          </Campo>
          <Campo rotulo="Profissional">
            <Selecao value={profId} onChange={(e) => setProfId(e.target.value)}>
              {profissionais.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </Selecao>
          </Campo>
          {tipoSala && (
            <Campo rotulo="Sala">
              <Selecao value={salaId} onChange={(e) => setSalaId(e.target.value ? Number(e.target.value) : "")}>
                {salas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </Selecao>
            </Campo>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Campo rotulo="Data"><Entrada type="date" value={dia} onChange={(e) => setDia(e.target.value)} /></Campo>
          <Campo rotulo="Início"><Entrada type="time" step={900} value={horaIni} onChange={(e) => setHoraIni(e.target.value)} /></Campo>
          <Campo rotulo="Duração (min)"><Entrada type="number" min={10} step={5} value={duracao} onChange={(e) => setDuracao(Number(e.target.value))} /></Campo>
        </div>

        {slug === "domiciliar" && (
          <Campo rotulo="Endereço do atendimento"><Entrada value={endereco} onChange={(e) => setEndereco(e.target.value)} /></Campo>
        )}

        {paciente && slug !== "domiciliar" && (
          <div className="rounded-lg bg-creme/70 p-3 text-sm">
            {pacotesDoServico.length > 0 ? (
              <label className="flex items-center gap-2">
                <Package size={16} className="text-verde-marca" />
                <span className="flex-1">Usar pacote</span>
                <Selecao value={pacoteId} onChange={(e) => setPacoteId(e.target.value)} className="w-auto">
                  <option value="">Não usar (avulso)</option>
                  {pacotesDoServico.map((p) => <option key={p.id} value={p.id}>{p.total_sessoes - p.sessoes_usadas} de {p.total_sessoes} sessões restantes</option>)}
                </Selecao>
              </label>
            ) : (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={novoPacote} onChange={(e) => setNovoPacote(e.target.checked)} className="accent-verde-marca" />
                <span>Vender pacote de 10 sessões ({servico ? moeda(Math.round(servico.preco * 10 * 0.9)) : ""}, 10% de desconto)</span>
              </label>
            )}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
          <Campo rotulo="Repetir toda semana">
            <Selecao value={repetir} onChange={(e) => setRepetir(Number(e.target.value))} className="w-40">
              <option value={1}>Não repetir</option>
              {[2, 4, 5, 8, 10, 12].map((n) => <option key={n} value={n}>{n} semanas</option>)}
            </Selecao>
          </Campo>
          <Campo rotulo="Observação"><Entrada value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" /></Campo>
        </div>

        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Botao variante="secundario" onClick={aoFechar}>Cancelar</Botao>
          <Botao onClick={salvar} disabled={salvando || !paciente}>{salvando ? "Salvando..." : "Agendar"}</Botao>
        </div>
      </div>
    </Modal>
  );
}

export function DetalheAgendamento({ ag, catalogo, usuario, aoFechar, aoAlterar }: {
  ag: AgendamentoCompleto;
  catalogo: Catalogo;
  usuario: Usuario;
  aoFechar: () => void;
  aoAlterar: () => void;
}) {
  const equipe = usuario.papel !== "fisio";
  const [erro, setErro] = useState("");
  const [modo, setModo] = useState<"ver" | "reagendar" | "pagar">("ver");
  const [dia, setDia] = useState(formatInTimeZone(new Date(ag.inicio), TZ, "yyyy-MM-dd"));
  const [horaIni, setHoraIni] = useState(formatInTimeZone(new Date(ag.inicio), TZ, "HH:mm"));
  const [valor, setValor] = useState(String(ag.servicos.preco));
  const [forma, setForma] = useState("pix");
  const [pago, setPago] = useState<null | boolean>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!equipe) return;
    createClient().from("recebimentos").select("id").eq("agendamento_id", ag.id).limit(1)
      .then(({ data }) => setPago((data ?? []).length > 0));
  }, [ag.id, equipe]);

  const st = STATUS_AGENDAMENTO[ag.status];
  const msg = `Olá, ${primeiroNome(ag.pacientes?.nome ?? "")}! Aqui é da Fisiocenter 🌿 Passando para confirmar seu horário de ${ag.servicos.nome} ${data(ag.inicio, "EEEE (dd/MM)")} às ${hora(ag.inicio)} com ${ag.profissionais?.nome}. Podemos confirmar?`;
  const zap = linkWhatsApp(ag.pacientes?.telefone, msg);

  async function mudarStatus(status: string) {
    setSalvando(true);
    const { error } = await createClient().from("agendamentos").update({ status }).eq("id", ag.id);
    setSalvando(false);
    if (error) return setErro(mensagemErro(error.message));
    aoAlterar();
  }

  async function reagendar() {
    const dur = new Date(ag.fim).getTime() - new Date(ag.inicio).getTime();
    const ini = new Date(`${dia}T${horaIni}:00-03:00`);
    setSalvando(true);
    const { error } = await createClient().from("agendamentos")
      .update({ inicio: isoSP(ini), fim: isoSP(new Date(ini.getTime() + dur)), status: "agendado" })
      .eq("id", ag.id);
    setSalvando(false);
    if (error) return setErro(mensagemErro(error.message));
    aoAlterar();
  }

  async function registrarPagamento() {
    setSalvando(true);
    const hoje = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
    const { error } = await createClient().from("recebimentos").insert({
      paciente_id: ag.paciente_id, agendamento_id: ag.id, profissional_id: ag.profissional_id,
      modalidade_id: ag.servicos.modalidade_id, descricao: ag.servicos.nome, valor: Number(valor.replace(",", ".")),
      vencimento: hoje, pago_em: hoje, forma_pagamento: forma, status: "pago",
    });
    setSalvando(false);
    if (error) return setErro("Não foi possível registrar o pagamento.");
    setPago(true);
    setModo("ver");
  }

  async function excluir() {
    if (!confirm("Excluir este agendamento? Prefira marcar como cancelado para manter o histórico.")) return;
    const { error } = await createClient().from("agendamentos").delete().eq("id", ag.id);
    if (error) return setErro("Não foi possível excluir.");
    aoAlterar();
  }

  const mod = catalogo.modalidades.find((m) => m.id === ag.servicos.modalidade_id);

  return (
    <Modal aberto aoFechar={aoFechar} titulo={ag.pacientes?.nome ?? "Agendamento"}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Selo className={st?.classe}>{st?.rotulo}</Selo>
          {mod && <Selo style={{ background: `${mod.cor}22`, color: mod.cor }}>{mod.nome}</Selo>}
          <Link href={`/pacientes/${ag.paciente_id}`} className="ml-auto text-xs font-semibold text-verde-marca hover:underline">Abrir ficha do paciente →</Link>
        </div>

        <dl className="grid grid-cols-[110px_1fr] gap-y-1.5">
          <dt className="text-suave">Serviço</dt><dd className="font-semibold">{ag.servicos.nome}</dd>
          <dt className="text-suave">Quando</dt><dd className="font-semibold first-letter:uppercase">{data(ag.inicio, "EEEE, dd/MM/yyyy")} · {hora(ag.inicio)} às {hora(ag.fim)}</dd>
          <dt className="text-suave">Profissional</dt><dd>{ag.profissionais?.nome}</dd>
          {ag.salas && (<><dt className="text-suave">Sala</dt><dd>{ag.salas.nome}</dd></>)}
          {ag.endereco_domiciliar && (<><dt className="text-suave">Endereço</dt><dd>{ag.endereco_domiciliar}</dd></>)}
          <dt className="text-suave">Telefone</dt><dd>{ag.pacientes?.telefone ?? "não informado"}</dd>
          {ag.pacotes && (<><dt className="text-suave">Pacote</dt><dd>{ag.pacotes.sessoes_usadas} de {ag.pacotes.total_sessoes} sessões usadas</dd></>)}
          {ag.obs && (<><dt className="text-suave">Obs.</dt><dd>{ag.obs}</dd></>)}
        </dl>

        {modo === "ver" && (
          <>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-suave">Marcar como</p>
              <div className="flex flex-wrap gap-2">
                {(["confirmado", "realizado", "faltou", "cancelado"] as const).map((s) => (
                  <button
                    key={s}
                    disabled={salvando || ag.status === s}
                    onClick={() => mudarStatus(s)}
                    className={cx(
                      "rounded-lg border px-3 py-1.5 text-sm font-semibold transition",
                      ag.status === s ? "border-verde-marca bg-verde-marca text-white" : "border-borda bg-white hover:border-verde-marca",
                    )}
                  >
                    {ag.status === s && <Check size={14} className="-mt-0.5 mr-1 inline" />}
                    {STATUS_AGENDAMENTO[s].rotulo}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-borda pt-4">
              {zap && (
                <a href={zap} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-3.5 py-2 text-sm font-semibold text-white hover:brightness-95">
                  <MessageCircle size={16} /> Confirmar pelo WhatsApp
                </a>
              )}
              {equipe && (
                <>
                  <Botao variante="secundario" onClick={() => setModo("reagendar")}><CalendarClock size={16} /> Reagendar</Botao>
                  {ag.pacote_id ? (
                    <span className="inline-flex items-center gap-1 px-2 text-xs text-suave"><Package size={14} /> Coberto pelo pacote</span>
                  ) : pago ? (
                    <span className="inline-flex items-center gap-1 px-2 text-xs font-semibold text-verde-marca"><Check size={14} /> Pagamento registrado</span>
                  ) : (
                    <Botao variante="secundario" onClick={() => setModo("pagar")}><Wallet size={16} /> Registrar pagamento</Botao>
                  )}
                  <Botao variante="fantasma" onClick={excluir} className="ml-auto text-red-700" title="Excluir"><Trash2 size={16} /></Botao>
                </>
              )}
            </div>
          </>
        )}

        {modo === "reagendar" && (
          <div className="space-y-3 rounded-lg bg-creme/70 p-3">
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Nova data"><Entrada type="date" value={dia} onChange={(e) => setDia(e.target.value)} /></Campo>
              <Campo rotulo="Horário"><Entrada type="time" step={900} value={horaIni} onChange={(e) => setHoraIni(e.target.value)} /></Campo>
            </div>
            <div className="flex justify-end gap-2">
              <Botao variante="secundario" onClick={() => setModo("ver")}>Voltar</Botao>
              <Botao onClick={reagendar} disabled={salvando}>Salvar novo horário</Botao>
            </div>
          </div>
        )}

        {modo === "pagar" && (
          <div className="space-y-3 rounded-lg bg-creme/70 p-3">
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Valor (R$)"><Entrada inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></Campo>
              <Campo rotulo="Forma de pagamento">
                <Selecao value={forma} onChange={(e) => setForma(e.target.value)}>
                  {Object.entries(FORMAS_PAGAMENTO).filter(([k]) => k !== "boleto").map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Selecao>
              </Campo>
            </div>
            <div className="flex justify-end gap-2">
              <Botao variante="secundario" onClick={() => setModo("ver")}>Voltar</Botao>
              <Botao onClick={registrarPagamento} disabled={salvando}>Registrar recebimento</Botao>
            </div>
          </div>
        )}

        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{erro}</p>}
      </div>
    </Modal>
  );
}

