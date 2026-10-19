import { Abas, Botao, Cabecalho, Cartao, CartaoTitulo, Entrada, Selecao, Tabela } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { PAPEIS } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { salvarPerfil, salvarProfissional, salvarSala, salvarServico } from "./actions";
import { NovoUsuario } from "./novo-usuario";

export const metadata = { title: "Configurações" };

const ABAS = [
  { id: "profissionais", rotulo: "Profissionais" },
  { id: "servicos", rotulo: "Serviços e preços" },
  { id: "salas", rotulo: "Salas" },
  { id: "usuarios", rotulo: "Usuários" },
];
const TIPOS_SALA: Record<string, string> = { consultorio: "Consultório", pilates: "Pilates", estetica: "Estética" };
const mini = "px-2 py-1 text-sm";

export default async function ConfiguracoesPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  await exigirPapel("admin");
  const { aba = "profissionais" } = await searchParams;
  const supabase = await createClient();
  const [profs, servs, salas, mods, perfis] = await Promise.all([
    supabase.from("profissionais").select("*").order("nome"),
    supabase.from("servicos").select("*").order("modalidade_id").order("id"),
    supabase.from("salas").select("*").order("id"),
    supabase.from("modalidades").select("*").order("id"),
    supabase.from("perfis").select("*").order("nome"),
  ]);

  return (
    <>
      <Cabecalho titulo="Configurações" sub="Equipe, catálogo de serviços, salas e acessos." />
      <Abas ativa={aba} abas={ABAS.map((a) => ({ ...a, href: `/configuracoes?aba=${a.id}` }))} />

      {aba === "profissionais" && (
        <Cartao>
          <CartaoTitulo titulo="Profissionais" sub="A cor aparece na agenda; o percentual define o repasse." />
          <Tabela>
            <thead><tr><th>Nome</th><th>CREFITO</th><th>Especialidade</th><th>Cor</th><th>Repasse %</th><th>Ativo</th><th /></tr></thead>
            <tbody>
              {[...(profs.data ?? []), null].map((p, i) => (
                <tr key={p?.id ?? `novo-${i}`}>
                  <td colSpan={7} className="!p-0">
                    <form action={salvarProfissional} className="grid grid-cols-[1.3fr_1fr_1.6fr_60px_90px_50px_90px] items-center gap-2 px-4 py-2">
                      {p && <input type="hidden" name="id" value={p.id} />}
                      <Entrada name="nome" defaultValue={p?.nome} placeholder="Novo profissional" className={mini} />
                      <Entrada name="crefito" defaultValue={p?.crefito ?? ""} className={mini} />
                      <Entrada name="especialidade" defaultValue={p?.especialidade ?? ""} className={mini} />
                      <input type="color" name="cor_agenda" defaultValue={p?.cor_agenda ?? "#607E36"} className="h-8 w-12 cursor-pointer rounded border border-borda" />
                      <Entrada name="comissao_pct" defaultValue={p ? Number(p.comissao_pct) : 40} inputMode="decimal" className={mini} />
                      <input type="checkbox" name="ativo" defaultChecked={p?.ativo ?? true} className="size-4 accent-verde-marca" />
                      <Botao variante={p ? "secundario" : "primario"} className="px-2.5 py-1 text-xs">{p ? "Salvar" : "Adicionar"}</Botao>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        </Cartao>
      )}

      {aba === "servicos" && (
        <div className="space-y-6">
          {(mods.data ?? []).map((m) => (
            <Cartao key={m.id}>
              <CartaoTitulo titulo={<span className="flex items-center gap-2"><span className="size-3 rounded-full" style={{ background: m.cor }} />{m.nome}</span>} />
              <div className="divide-y divide-borda">
                {[...(servs.data ?? []).filter((s) => s.modalidade_id === m.id), null].map((s, i) => (
                  <form key={s?.id ?? `novo-${i}`} action={salvarServico} className="grid grid-cols-[1fr_110px_120px_50px_90px] items-center gap-2 px-5 py-2">
                    {s && <input type="hidden" name="id" value={s.id} />}
                    <input type="hidden" name="modalidade_id" value={m.id} />
                    <Entrada name="nome" defaultValue={s?.nome} placeholder={`Novo serviço de ${m.nome.toLowerCase()}`} className={mini} />
                    <label className="flex items-center gap-1 text-xs text-suave"><Entrada name="duracao_min" defaultValue={s?.duracao_min ?? 50} className={mini} /> min</label>
                    <label className="flex items-center gap-1 text-xs text-suave">R$ <Entrada name="preco" defaultValue={s ? Number(s.preco) : ""} inputMode="decimal" className={mini} /></label>
                    <input type="checkbox" name="ativo" defaultChecked={s?.ativo ?? true} className="size-4 accent-verde-marca" title="Ativo" />
                    <Botao variante={s ? "secundario" : "primario"} className="px-2.5 py-1 text-xs">{s ? "Salvar" : "Adicionar"}</Botao>
                  </form>
                ))}
              </div>
            </Cartao>
          ))}
          <p className="text-xs text-suave">Os planos mensais do Pilates ficam em Planos → Catálogo de planos.</p>
        </div>
      )}

      {aba === "salas" && (
        <Cartao>
          <CartaoTitulo titulo="Salas e aparelhos" sub="A agenda impede dois atendimentos na mesma sala no mesmo horário." />
          <div className="divide-y divide-borda">
            {[...(salas.data ?? []), null].map((s, i) => (
              <form key={s?.id ?? `novo-${i}`} action={salvarSala} className="grid grid-cols-[1fr_160px_110px_50px_90px] items-center gap-2 px-5 py-2">
                {s && <input type="hidden" name="id" value={s.id} />}
                <Entrada name="nome" defaultValue={s?.nome} placeholder="Nova sala" className={mini} />
                <Selecao name="tipo" defaultValue={s?.tipo ?? "consultorio"} className={mini}>{Object.entries(TIPOS_SALA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Selecao>
                <label className="flex items-center gap-1 text-xs text-suave"><Entrada name="capacidade" defaultValue={s?.capacidade ?? 1} className={mini} /> lugares</label>
                <input type="checkbox" name="ativo" defaultChecked={s?.ativo ?? true} className="size-4 accent-verde-marca" title="Ativa" />
                <Botao variante={s ? "secundario" : "primario"} className="px-2.5 py-1 text-xs">{s ? "Salvar" : "Adicionar"}</Botao>
              </form>
            ))}
          </div>
        </Cartao>
      )}

      {aba === "usuarios" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Cartao>
            <CartaoTitulo titulo="Quem acessa o sistema" sub="Administração: tudo · Recepção: agenda, pacientes, planos e recebimentos · Fisioterapeuta: a própria agenda" />
            <div className="divide-y divide-borda">
              {(perfis.data ?? []).map((u) => (
                <form key={u.id} action={salvarPerfil} className="grid grid-cols-[1fr_1fr_150px_170px_80px] items-center gap-2 px-5 py-2">
                  <input type="hidden" name="id" value={u.id} />
                  <Entrada name="nome" defaultValue={u.nome} className={mini} />
                  <span className="truncate text-sm text-suave">{u.email}</span>
                  <Selecao name="papel" defaultValue={u.papel} className={mini}>{Object.entries(PAPEIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Selecao>
                  <Selecao name="profissional_id" defaultValue={u.profissional_id ?? ""} className={mini}>
                    <option value="">Sem vínculo</option>
                    {(profs.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </Selecao>
                  <Botao variante="secundario" className="px-2.5 py-1 text-xs">Salvar</Botao>
                </form>
              ))}
            </div>
          </Cartao>
          <Cartao>
            <CartaoTitulo titulo="Novo usuário" />
            <NovoUsuario profissionais={(profs.data ?? []).map((p) => ({ id: p.id, nome: p.nome }))} habilitado={Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)} />
          </Cartao>
        </div>
      )}
    </>
  );
}
