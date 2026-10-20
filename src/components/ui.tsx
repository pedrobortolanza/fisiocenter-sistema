import clsx from "clsx";
import { Banknote, CreditCard, QrCode, ShieldCheck, WalletCards } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { FORMAS_PAGAMENTO } from "@/lib/format";

export const cx = clsx;

type Variante = "primario" | "secundario" | "fantasma" | "perigo";
const VARIANTES: Record<Variante, string> = {
  primario: "bg-verde-marca text-white hover:bg-verde-escuro",
  secundario: "bg-white text-verde-escuro border border-borda hover:bg-creme",
  fantasma: "text-verde-escuro hover:bg-creme",
  perigo: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
};
const BOTAO = "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";

export function Botao({ variante = "primario", className, ...props }: ComponentProps<"button"> & { variante?: Variante }) {
  return <button className={cx(BOTAO, VARIANTES[variante], className)} {...props} />;
}

export function BotaoLink({ variante = "primario", className, ...props }: ComponentProps<typeof Link> & { variante?: Variante }) {
  return <Link className={cx(BOTAO, VARIANTES[variante], className)} {...props} />;
}

export function Cartao({ className, ...props }: ComponentProps<"div">) {
  return <div className={cx("rounded-xl border border-borda bg-white shadow-[0_1px_2px_rgba(43,51,38,0.04)]", className)} {...props} />;
}

export function CartaoTitulo({ titulo, acao, sub }: { titulo: ReactNode; acao?: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-borda px-5 py-3.5">
      <div>
        <h3 className="text-lg leading-tight">{titulo}</h3>
        {sub && <p className="mt-0.5 text-xs text-suave">{sub}</p>}
      </div>
      {acao}
    </div>
  );
}

export function Selo({ className, ...props }: ComponentProps<"span">) {
  return <span className={cx("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold", className)} {...props} />;
}

const CAMPO = "campo h-10 rounded-xl border border-borda bg-white px-3 text-sm text-texto shadow-[inset_0_1px_2px_rgba(43,51,38,0.05)] outline-none transition placeholder:text-suave/70 hover:border-oliva-claro focus:border-verde-marca focus:ring-4 focus:ring-salvia/40";

const largura = (className?: string) => !/(^|\s)w-/.test(className ?? "") && "w-full";

export function Entrada({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(CAMPO, largura(className), className)} {...props} />;
}
export function Selecao({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(CAMPO, largura(className), "cursor-pointer", className)} {...props} />;
}
export function AreaTexto({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(CAMPO, largura(className), "h-auto py-2", className)} rows={3} {...props} />;
}

/** Rótulo + campo. Use `grupo` quando o conteúdo tiver botões (um <label> repassaria o clique para eles). */
export function Campo({ rotulo, children, className, dica, grupo }: { rotulo: string; children: ReactNode; className?: string; dica?: string; grupo?: boolean }) {
  const Tag = grupo ? "div" : "label";
  return (
    <Tag className={cx("block", className)}>
      <span className="mb-1.5 block text-[13px] font-semibold text-texto/80">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-xs text-suave">{dica}</span>}
    </Tag>
  );
}

/** Campo com ícone à esquerda (e um sufixo opcional à direita, como "min"). */
export function EntradaIcone({ icone, sufixo, className, ...props }: ComponentProps<"input"> & { icone: ReactNode; sufixo?: string }) {
  return (
    <div className={cx("relative", largura(className), className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-oliva-claro">{icone}</span>
      <input className={cx(CAMPO, "w-full pl-9", sufixo && "pr-12")} {...props} />
      {sufixo && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-suave">{sufixo}</span>}
    </div>
  );
}

export type Opcao = { valor: string; rotulo: ReactNode; icone?: ReactNode; detalhe?: ReactNode; cor?: string };

/**
 * Grupo de opções em botões (radio por baixo). Funciona em formulários de servidor (`name` + `padrao`)
 * e controlado (`valor` + `aoMudar`).
 */
export function Opcoes({ name, opcoes, valor, padrao, aoMudar, tamanho = "md", className }: {
  name: string;
  opcoes: Opcao[];
  valor?: string;
  padrao?: string;
  aoMudar?: (v: string) => void;
  tamanho?: "sm" | "md" | "cartao";
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cx("flex flex-wrap gap-2", className)}>
      {opcoes.map((o) => (
        <label
          key={o.valor}
          className={cx(
            "group relative flex cursor-pointer select-none items-center gap-2 rounded-xl border border-borda bg-white font-semibold text-texto/80 transition",
            "hover:border-oliva-claro hover:bg-creme/40",
            "has-[:checked]:border-verde-marca has-[:checked]:bg-verde-marca/[0.07] has-[:checked]:text-verde-escuro has-[:checked]:shadow-[0_0_0_1px_var(--color-verde-marca)]",
            "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-salvia/50",
            tamanho === "sm" && "px-3 py-1.5 text-xs",
            tamanho === "md" && "px-3.5 py-2 text-sm",
            tamanho === "cartao" && "flex-col items-start justify-center gap-0.5 px-3 py-2 text-sm leading-snug",
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.valor}
            className="sr-only"
            {...(aoMudar ? { checked: valor === o.valor, onChange: () => aoMudar(o.valor) } : { defaultChecked: (valor ?? padrao) === o.valor })}
          />
          <span className="flex items-center gap-2">
            {o.cor && <span className="size-2.5 shrink-0 rounded-full" style={{ background: o.cor }} />}
            {o.icone && <span className="text-oliva-claro transition group-has-[:checked]:text-verde-marca">{o.icone}</span>}
            {o.rotulo}
          </span>
          {o.detalhe && <span className="text-xs font-normal text-suave">{o.detalhe}</span>}
        </label>
      ))}
    </div>
  );
}

const ICONE_FORMA: Record<string, ReactNode> = {
  pix: <QrCode size={16} />,
  dinheiro: <Banknote size={16} />,
  cartao_credito: <CreditCard size={16} />,
  cartao_debito: <WalletCards size={16} />,
  convenio: <ShieldCheck size={16} />,
};
const ROTULO_CURTO: Record<string, string> = { cartao_credito: "Crédito", cartao_debito: "Débito" };

/** Escolha da forma de pagamento em botões com ícone. */
export function EscolhaPagamento({ name = "forma_pagamento", valor, padrao = "pix", aoMudar, tamanho = "md", className }: {
  name?: string;
  valor?: string;
  padrao?: string;
  aoMudar?: (v: string) => void;
  tamanho?: "sm" | "md";
  className?: string;
}) {
  const opcoes = Object.entries(FORMAS_PAGAMENTO)
    .filter(([k]) => k !== "boleto")
    .map(([k, v]) => ({ valor: k, rotulo: ROTULO_CURTO[k] ?? v, icone: ICONE_FORMA[k] }));
  return <Opcoes name={name} opcoes={opcoes} valor={valor} padrao={padrao} aoMudar={aoMudar} tamanho={tamanho} className={className} />;
}

export function Cabecalho({ titulo, sub, acoes }: { titulo: string; sub?: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl leading-tight md:text-4xl">{titulo}</h1>
        {sub && <p className="mt-1 text-sm text-suave">{sub}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </div>
  );
}

export function Indicador({ rotulo, valor, detalhe, tom = "neutro", icone }: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  tom?: "neutro" | "positivo" | "alerta" | "negativo";
  icone?: ReactNode;
}) {
  const cor = { neutro: "text-verde-escuro", positivo: "text-verde-marca", alerta: "text-amber-700", negativo: "text-red-700" }[tom];
  return (
    <Cartao className="p-4">
      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-suave">
        {rotulo}
        {icone && <span className="text-oliva-claro">{icone}</span>}
      </div>
      <div className={cx("mt-2 text-2xl font-extrabold tabular", cor)}>{valor}</div>
      {detalhe && <div className="mt-1 text-xs text-suave">{detalhe}</div>}
    </Cartao>
  );
}

export function Abas({ abas, ativa }: { abas: { id: string; rotulo: string; href: string; cor?: string }[]; ativa: string }) {
  return (
    <div className="no-print mb-5 flex gap-1 overflow-x-auto border-b border-borda">
      {abas.map((a) => (
        <Link
          key={a.id}
          href={a.href}
          className={cx(
            "-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
            a.id === ativa ? "border-verde-marca text-verde-escuro" : "border-transparent text-suave hover:text-verde-escuro",
          )}
        >
          {a.cor && <span className="size-2.5 rounded-full" style={{ background: a.cor }} />}
          {a.rotulo}
        </Link>
      ))}
    </div>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="px-5 py-10 text-center text-sm text-suave">{children}</div>;
}

export function Tabela({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="w-full text-sm [&_td]:px-4 [&_td]:py-2.5 [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-suave [&_tbody_tr]:border-t [&_tbody_tr]:border-borda [&_tbody_tr:hover]:bg-creme/50">
        {children}
      </table>
    </div>
  );
}

export function Avatar({ nome, cor = "#607E36", tamanho = 32 }: { nome: string; cor?: string; tamanho?: number }) {
  const p = nome.split(" ").filter(Boolean);
  const ini = ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ background: cor, width: tamanho, height: tamanho, fontSize: tamanho * 0.38 }}
    >
      {ini}
    </span>
  );
}
