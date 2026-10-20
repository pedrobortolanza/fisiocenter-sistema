import Link from "next/link";
import { GraficoBarras, GraficoRosca } from "@/components/graficos";
import { Abas, Botao, Cabecalho, Campo, Cartao, CartaoTitulo, Entrada, EntradaIcone, EscolhaPagamento, Indicador, Selecao, Selo, Tabela, Vazio } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { CONVENIOS, FORMAS_PAGAMENTO, SITUACAO_RECEBIMENTO, data, fimDoMes, hojeISO, moeda, nomeMes, somaDias, somaMeses } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cancelarRecebimento, excluirDespesa, novaDespesa, novoRecebimento, pagarDespesa } from "./actions";
import { ReceberBotao } from "./receber-botao";

export const metadata = { title: "Financeiro" };

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<{ aba?: string; mes?: string }> }) {
  const sessao = await exigirPapel("admin", "recepcao");
  const admin = sessao.papel === "admin";
  const sp = await searchParams;
  const hoje = hojeISO();
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? `${sp.mes}-01` : `${hoje.slice(0, 7)}-01`;
  const fim = fimDoMes(mes);
  const abas = [
    { id: "receber", rotulo: "Contas a receber" },
    { id: "recebimentos", rotulo: "Recebimentos" },
    ...(admin ? [{ id: "despesas", rotulo: "Despesas" }, { id: "fluxo", rotulo: "Fluxo de caixa" }, { id: "repasses", rotulo: "Repasses" }] : []),
  ];
  const aba = abas.some((a) => a.id === sp.aba) ? sp.aba! : "receber";
  const link = (m: string) => `/financeiro?aba=${aba}&mes=${m.slice(0, 7)}`;
  const supabase = await createClient();

  return (
    <>
      <Cabecalho
        titulo="Financeiro"
        sub="Recebimentos, cobranças, despesas e repasses da equipe."
        acoes={aba !== "receber" && aba !== "fluxo" && (
          <div className="flex items-center gap-1 rounded-lg border border-borda bg-white p-1 text-sm">
            <Link href={link(somaMeses(mes, -1))} className="rounded-md px-2 py-1 hover:bg-creme">‹</Link>
            <span className="px-2 font-semibold text-verde-escuro">{nomeMes(mes)}</span>
            <Link href={link(somaMeses(mes, 1))} className="rounded-md px-2 py-1 hover:bg-creme">›</Link>
          </div>
        )}
      />
      <Abas ativa={aba} abas={abas.map((a) => ({ ...a, href: `/financeiro?aba=${a.id}&mes=${mes.slice(0, 7)}` }))} />
      {aba === "receber" && <AReceber supabase={supabase} hoje={hoje} />}
      {aba === "recebimentos" && <Recebimentos supabase={supabase} mes={mes} fim={fim} hoje={hoje} />}
      {aba === "despesas" && <Despesas supabase={supabase} mes={mes} fim={fim} hoje={hoje} />}
      {aba === "fluxo" && <Fluxo supabase={supabase} hoje={hoje} />}
      {aba === "repasses" && <Repasses supabase={supabase} mes={mes} fim={fim} />}
    </>
  );
}

type SB = Awaited<ReturnType<typeof createClient>>;

async function AReceber({ supabase, hoje }: { supabase: SB; hoje: string }) {
  const { data: itens } = await supabase
    .from("vw_recebimentos")
    .select("id, descricao, valor, vencimento, situacao, paciente_id, paciente_nome, modalidade_nome")
    .eq("status", "aberto")
    .lte("vencimento", fimDoMes(somaMeses(hoje, 1)))
    .order("vencimento");
  const lista = itens ?? [];
  const atrasados = lista.filter((r) => r.situacao === "atrasado");
  const soma = (l: typeof lista) => l.reduce((s, r) => s + Number(r.valor), 0);
  const semana = lista.filter((r) => r.situacao !== "atrasado" && r.vencimento! <= somaDias(hoje, 7));
  const deConvenio = (d: string | null) => CONVENIOS.some((c) => d?.includes(c));

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Em atraso" valor={moeda(soma(atrasados))} detalhe={`${atrasados.length} cobranças`} tom="negativo" />
        <Indicador rotulo="Vence em 7 dias" valor={moeda(soma(semana))} detalhe={`${semana.length} cobranças`} tom="alerta" />
        <Indicador rotulo="Total em aberto" valor={moeda(soma(lista))} detalhe="até o fim do próximo mês" />
        <Indicador rotulo="Convênios a receber" valor={moeda(soma(lista.filter((r) => deConvenio(r.descricao))))} detalhe="repasse das operadoras" />
      </div>
      <Cartao>
        <CartaoTitulo titulo="Cobranças em aberto" sub="Atrasadas primeiro. Ao receber, escolha a forma de pagamento." />
        {lista.length === 0 ? <Vazio>Nada em aberto. 🎉</Vazio> : (
          <Tabela>
            <thead><tr><th>Vencimento</th><th>Paciente</th><th>Descrição</th><th className="text-right">Valor</th><th>Situação</th><th /></tr></thead>
            <tbody>
              {lista.map((r) => (
                <tr key={r.id}>
                  <td className="tabular">{data(r.vencimento)}</td>
                  <td>{r.paciente_id ? <Link href={`/pacientes/${r.paciente_id}`} className="font-semibold text-verde-escuro hover:underline">{r.paciente_nome}</Link> : "–"}</td>
                  <td className="text-suave">{r.descricao}</td>
                  <td className="text-right font-semibold tabular">{moeda(r.valor)}</td>
                  <td><Selo className={SITUACAO_RECEBIMENTO[r.situacao ?? ""]?.classe}>{SITUACAO_RECEBIMENTO[r.situacao ?? ""]?.rotulo}</Selo></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <ReceberBotao id={r.id!} paciente={r.paciente_nome} descricao={r.descricao} valor={Number(r.valor)} formaPadrao={deConvenio(r.descricao) ? "convenio" : "pix"} />
                      <form action={cancelarRecebimento}>
                        <input type="hidden" name="id" value={r.id!} />
                        <Botao variante="fantasma" className="px-2 py-1 text-xs text-suave" title="Cancelar cobrança">✕</Botao>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
      </Cartao>
    </>
  );
}

async function Recebimentos({ supabase, mes, fim, hoje }: { supabase: SB; mes: string; fim: string; hoje: string }) {
  const [{ data: itens }, { data: pacientes }, { data: profs }, { data: mods }] = await Promise.all([
    supabase.from("vw_recebimentos").select("id, descricao, valor, pago_em, forma_pagamento, paciente_id, paciente_nome, profissional_nome, modalidade_nome")
      .eq("status", "pago").gte("pago_em", mes).lte("pago_em", fim).order("pago_em", { ascending: false }),
    supabase.from("pacientes").select("id, nome").eq("ativo", true).order("nome"),
    supabase.from("profissionais").select("id, nome").eq("ativo", true).order("nome"),
    supabase.from("modalidades").select("id, nome").order("id"),
  ]);
  const lista = itens ?? [];
  const total = lista.reduce((s, r) => s + Number(r.valor), 0);
  const porForma = Object.entries(lista.reduce<Record<string, number>>((acc, r) => {
    const f = r.forma_pagamento ?? "outro";
    acc[f] = (acc[f] ?? 0) + Number(r.valor);
    return acc;
  }, {})).map(([forma, valor]) => ({ forma: FORMAS_PAGAMENTO[forma] ?? forma, valor })).sort((a, b) => b.valor - a.valor);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <Cartao>
        <CartaoTitulo titulo={`${lista.length} recebimentos · ${moeda(total)}`} />
        {lista.length === 0 ? <Vazio>Nenhum recebimento no mês.</Vazio> : (
          <Tabela>
            <thead><tr><th>Data</th><th>Paciente</th><th>Descrição</th><th>Forma</th><th className="text-right">Valor</th></tr></thead>
            <tbody>
              {lista.map((r) => (
                <tr key={r.id}>
                  <td className="tabular">{data(r.pago_em)}</td>
                  <td>{r.paciente_id ? <Link href={`/pacientes/${r.paciente_id}`} className="hover:underline">{r.paciente_nome}</Link> : "–"}</td>
                  <td className="text-suave">{r.descricao}</td>
                  <td>{FORMAS_PAGAMENTO[r.forma_pagamento ?? ""] ?? "–"}</td>
                  <td className="text-right font-semibold tabular">{moeda(r.valor)}</td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}
      </Cartao>
      <div className="space-y-6">
        <Cartao>
          <CartaoTitulo titulo="Lançar recebimento" sub="Sessão avulsa, pacote, produto..." />
          <form action={novoRecebimento} className="space-y-3 p-5">
            <Campo rotulo="Paciente">
              <Selecao name="paciente_id" defaultValue="">
                <option value="">Sem paciente</option>
                {(pacientes ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </Selecao>
            </Campo>
            <Campo rotulo="Descrição"><Entrada name="descricao" required placeholder="Ex.: Sessão de RPG" /></Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo rotulo="Valor"><EntradaIcone icone={<span className="text-xs font-bold">R$</span>} name="valor" required inputMode="decimal" placeholder="90,00" /></Campo>
              <Campo rotulo="Data"><Entrada type="date" name="vencimento" defaultValue={hoje} /></Campo>
            </div>
            <Campo rotulo="Forma de pagamento" grupo><EscolhaPagamento tamanho="sm" /></Campo>
            <Campo rotulo="Modalidade"><Selecao name="modalidade_id">{(mods ?? []).map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</Selecao></Campo>
            <Campo rotulo="Profissional (repasse)">
              <Selecao name="profissional_id" defaultValue=""><option value="">Nenhum</option>{(profs ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</Selecao>
            </Campo>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pago" defaultChecked className="accent-verde-marca" /> Já foi pago</label>
            <Botao className="w-full">Lançar</Botao>
          </form>
        </Cartao>
        {porForma.length > 0 && (
          <Cartao><CartaoTitulo titulo="Por forma de pagamento" /><div className="p-5"><GraficoRosca dados={porForma} nome="forma" valor="valor" formato="moeda" altura={150} /></div></Cartao>
        )}
      </div>
    </div>
  );
}

async function Despesas({ supabase, mes, fim, hoje }: { supabase: SB; mes: string; fim: string; hoje: string }) {
  const [{ data: itens }, { data: cats }] = await Promise.all([
    supabase.from("despesas").select("id, descricao, valor, vencimento, pago_em, categorias_desp(nome)").gte("vencimento", mes).lte("vencimento", fim).order("vencimento"),
    supabase.from("categorias_desp").select("id, nome").order("nome"),
  ]);
  const lista = itens ?? [];
  const total = lista.reduce((s, d) => s + Number(d.valor), 0);
  const pagas = lista.filter((d) => d.pago_em).reduce((s, d) => s + Number(d.valor), 0);
  const porCat = Object.entries(lista.reduce<Record<string, number>>((acc, d) => {
    const c = d.categorias_desp?.nome ?? "Outros";
    acc[c] = (acc[c] ?? 0) + Number(d.valor);
    return acc;
  }, {})).map(([nome, valor]) => ({ nome, valor: Math.round(valor * 100) / 100 })).sort((a, b) => b.valor - a.valor);

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Indicador rotulo="Despesas do mês" valor={moeda(total)} tom="negativo" />
        <Indicador rotulo="Pagas" valor={moeda(pagas)} tom="positivo" />
        <Indicador rotulo="A pagar" valor={moeda(total - pagas)} tom="alerta" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Cartao>
          <CartaoTitulo titulo="Contas do mês" />
          {lista.length === 0 ? <Vazio>Nenhuma despesa no mês.</Vazio> : (
            <Tabela>
              <thead><tr><th>Vencimento</th><th>Descrição</th><th>Categoria</th><th className="text-right">Valor</th><th>Situação</th><th /></tr></thead>
              <tbody>
                {lista.map((d) => {
                  const atrasada = !d.pago_em && d.vencimento < hoje;
                  return (
                    <tr key={d.id}>
                      <td className="tabular">{data(d.vencimento)}</td>
                      <td>{d.descricao}</td>
                      <td className="text-suave">{d.categorias_desp?.nome}</td>
                      <td className="text-right font-semibold tabular">{moeda(d.valor)}</td>
                      <td><Selo className={d.pago_em ? "bg-salvia text-verde-escuro" : atrasada ? "bg-red-100 text-red-800" : "bg-areia text-texto"}>{d.pago_em ? `Paga ${data(d.pago_em, "dd/MM")}` : atrasada ? "Atrasada" : "A pagar"}</Selo></td>
                      <td>
                        <div className="flex justify-end gap-1">
                          {!d.pago_em && (
                            <form action={pagarDespesa}><input type="hidden" name="id" value={d.id} /><Botao variante="secundario" className="px-2.5 py-1 text-xs">Pagar</Botao></form>
                          )}
                          <form action={excluirDespesa}><input type="hidden" name="id" value={d.id} /><Botao variante="fantasma" className="px-2 py-1 text-xs text-suave" title="Excluir">✕</Botao></form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Tabela>
          )}
        </Cartao>
        <div className="space-y-6">
          <Cartao>
            <CartaoTitulo titulo="Nova despesa" />
            <form action={novaDespesa} className="space-y-3 p-5">
              <Campo rotulo="Descrição"><Entrada name="descricao" required placeholder="Ex.: Conta de luz" /></Campo>
              <Campo rotulo="Categoria"><Selecao name="categoria_id">{(cats ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Selecao></Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo rotulo="Valor"><EntradaIcone icone={<span className="text-xs font-bold">R$</span>} name="valor" required inputMode="decimal" placeholder="0,00" /></Campo>
                <Campo rotulo="Vencimento"><Entrada type="date" name="vencimento" defaultValue={hoje} /></Campo>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="pago" className="accent-verde-marca" /> Já foi paga</label>
              <Botao className="w-full">Adicionar despesa</Botao>
            </form>
          </Cartao>
          {porCat.length > 0 && <Cartao><CartaoTitulo titulo="Por categoria" /><div className="p-4"><GraficoBarras dados={porCat} x="nome" series={[{ chave: "valor", nome: "Valor", cor: "#C49A6C" }]} horizontal formato="moeda" altura={320} /></div></Cartao>}
        </div>
      </div>
    </>
  );
}

async function Fluxo({ supabase, hoje }: { supabase: SB; hoje: string }) {
  const meses = Array.from({ length: 6 }, (_, i) => somaMeses(`${hoje.slice(0, 7)}-01`, i - 5));
  const resultados = await Promise.all(meses.map((m) => supabase.rpc("fn_painel", { p_mes: m })));
  const linhas = meses.map((m, i) => {
    const p = (resultados[i].data ?? {}) as { faturamento?: number; despesas_pagas?: number; a_receber?: number; despesas?: number };
    const entradas = Number(p.faturamento ?? 0);
    const saidas = Number(p.despesas_pagas ?? 0);
    return { mes: nomeMes(m).replace(/ de \d{4}$/, "").slice(0, 3) + "/" + m.slice(2, 4), nomeCompleto: nomeMes(m), entradas, saidas, saldo: Math.round((entradas - saidas) * 100) / 100, previsto: Number(p.a_receber ?? 0), aPagar: Number(p.despesas ?? 0) - saidas };
  });
  let acumulado = 0;
  const comAcumulado = linhas.map((l) => ({ ...l, acumulado: (acumulado += l.saldo) }));
  const atual = linhas[linhas.length - 1];

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Entradas no mês" valor={moeda(atual.entradas)} tom="positivo" />
        <Indicador rotulo="Saídas no mês" valor={moeda(atual.saidas)} tom="negativo" />
        <Indicador rotulo="Ainda a receber" valor={moeda(atual.previsto)} detalhe="vencendo neste mês" tom="alerta" />
        <Indicador rotulo="Ainda a pagar" valor={moeda(atual.aPagar)} detalhe="despesas deste mês" />
      </div>
      <Cartao>
        <CartaoTitulo titulo="Entradas e saídas · últimos 6 meses" sub="Regime de caixa: o que de fato entrou e saiu" />
        <div className="p-4">
          <GraficoBarras dados={linhas} x="mes" series={[{ chave: "entradas", nome: "Entradas", cor: "#607E36" }, { chave: "saidas", nome: "Saídas", cor: "#C49A6C" }]} formato="moeda" altura={300} />
        </div>
        <Tabela>
          <thead><tr><th>Mês</th><th className="text-right">Entradas</th><th className="text-right">Saídas</th><th className="text-right">Saldo</th><th className="text-right">Acumulado</th></tr></thead>
          <tbody>
            {comAcumulado.map((l) => (
              <tr key={l.nomeCompleto}>
                <td>{l.nomeCompleto}</td>
                <td className="text-right tabular text-verde-marca">{moeda(l.entradas)}</td>
                <td className="text-right tabular text-[#9a6b3c]">{moeda(l.saidas)}</td>
                <td className={`text-right font-bold tabular ${l.saldo < 0 ? "text-red-700" : "text-verde-escuro"}`}>{moeda(l.saldo)}</td>
                <td className="text-right tabular text-suave">{moeda(l.acumulado)}</td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </Cartao>
      <p className="mt-3 text-xs text-suave">Os dados de demonstração começam há cerca de 3 meses; os meses anteriores aparecem zerados.</p>
    </>
  );
}

async function Repasses({ supabase, mes, fim }: { supabase: SB; mes: string; fim: string }) {
  const [{ data: profs }, { data: recs }] = await Promise.all([
    supabase.from("profissionais").select("id, nome, comissao_pct, cor_agenda, especialidade").eq("ativo", true).order("nome"),
    supabase.from("vw_recebimentos").select("profissional_id, valor, modalidade_nome").eq("status", "pago").gte("pago_em", mes).lte("pago_em", fim).not("profissional_id", "is", null),
  ]);
  const linhas = (profs ?? []).map((p) => {
    const meus = (recs ?? []).filter((r) => r.profissional_id === p.id);
    const bruto = meus.reduce((s, r) => s + Number(r.valor), 0);
    const porMod = Object.entries(meus.reduce<Record<string, number>>((a, r) => { a[r.modalidade_nome ?? "–"] = (a[r.modalidade_nome ?? "–"] ?? 0) + Number(r.valor); return a; }, {}));
    const repasse = Math.round(bruto * Number(p.comissao_pct)) / 100;
    return { ...p, bruto, repasse, clinica: bruto - repasse, porMod, qtd: meus.length };
  });
  const tot = (k: "bruto" | "repasse" | "clinica") => linhas.reduce((s, l) => s + l[k], 0);

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Indicador rotulo="Produção da equipe" valor={moeda(tot("bruto"))} detalhe="recebido no mês" />
        <Indicador rotulo="Repasses a pagar" valor={moeda(tot("repasse"))} tom="alerta" />
        <Indicador rotulo="Fica na clínica" valor={moeda(tot("clinica"))} tom="positivo" />
      </div>
      <Cartao>
        <CartaoTitulo titulo="Repasse por profissional" sub="Percentual configurável em Configurações → Profissionais" />
        <Tabela>
          <thead><tr><th>Profissional</th><th>Produção por modalidade</th><th className="text-right">Recebido</th><th className="text-right">%</th><th className="text-right">Repasse</th><th className="text-right">Clínica</th></tr></thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id}>
                <td><span className="mr-2 inline-block size-2.5 rounded-full" style={{ background: l.cor_agenda }} /><b>{l.nome}</b><span className="block pl-4.5 text-xs text-suave">{l.qtd} lançamentos</span></td>
                <td className="text-xs text-suave">{l.porMod.map(([m, v]) => `${m}: ${moeda(v)}`).join(" · ")}</td>
                <td className="text-right tabular">{moeda(l.bruto)}</td>
                <td className="text-right tabular">{Number(l.comissao_pct)}%</td>
                <td className="text-right font-bold tabular text-verde-escuro">{moeda(l.repasse)}</td>
                <td className="text-right tabular text-suave">{moeda(l.clinica)}</td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      </Cartao>
    </>
  );
}
