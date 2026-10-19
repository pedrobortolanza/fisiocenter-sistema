import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const cx = clsx;

type Variante = "primario" | "secundario" | "fantasma" | "perigo";
const VARIANTES: Record<Variante, string> = {
  primario: "bg-verde-marca text-white hover:bg-verde-escuro",
  secundario: "bg-white text-verde-escuro border border-borda hover:bg-creme",
  fantasma: "text-verde-escuro hover:bg-creme",
  perigo: "bg-white text-red-700 border border-red-200 hover:bg-red-50",
};
const BOTAO = "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none";

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

const CAMPO = "rounded-lg border border-borda bg-white px-3 py-2 text-sm outline-none transition focus:border-verde-marca focus:ring-2 focus:ring-salvia/60";

const largura = (className?: string) => !/(^|\s)w-/.test(className ?? "") && "w-full";

export function Entrada({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(CAMPO, largura(className), className)} {...props} />;
}
export function Selecao({ className, ...props }: ComponentProps<"select">) {
  return <select className={cx(CAMPO, largura(className), "pr-8", className)} {...props} />;
}
export function AreaTexto({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cx(CAMPO, largura(className), className)} rows={3} {...props} />;
}

/** Rótulo + campo. Use `grupo` quando o conteúdo tiver botões (um <label> repassaria o clique para eles). */
export function Campo({ rotulo, children, className, dica, grupo }: { rotulo: string; children: ReactNode; className?: string; dica?: string; grupo?: boolean }) {
  const Tag = grupo ? "div" : "label";
  return (
    <Tag className={cx("block", className)}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-suave">{rotulo}</span>
      {children}
      {dica && <span className="mt-1 block text-xs text-suave">{dica}</span>}
    </Tag>
  );
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
