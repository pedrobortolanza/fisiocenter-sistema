"use client";

import { LoaderCircle, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { cx } from "@/components/ui";

/** Lê e grava filtros na URL (a página do servidor refaz a consulta), sem precisar de botão "Filtrar". */
function useFiltroUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [carregando, iniciar] = useTransition();

  function definir(param: string, valor: string, padrao = "") {
    const novos = new URLSearchParams(params.toString());
    if (valor === padrao) novos.delete(param);
    else novos.set(param, valor);
    const qs = novos.toString();
    iniciar(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return { params, definir, carregando };
}

/** Busca que filtra enquanto a pessoa digita. */
export function BuscaUrl({ param = "q", placeholder, className }: { param?: string; placeholder: string; className?: string }) {
  const { params, definir, carregando } = useFiltroUrl();
  const naUrl = params.get(param) ?? "";
  const [termo, setTermo] = useState(naUrl);
  const enviado = useRef(naUrl);

  // Acompanha mudanças externas (ex.: "Limpar filtros"), sem atropelar o que está sendo digitado.
  useEffect(() => {
    if (naUrl !== enviado.current) {
      enviado.current = naUrl;
      setTermo(naUrl);
    }
  }, [naUrl]);

  useEffect(() => {
    if (termo === enviado.current) return;
    const t = setTimeout(() => {
      enviado.current = termo;
      definir(param, termo.trim() ? termo : "");
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termo]);

  return (
    <div className={cx("relative min-w-56 flex-1", className)}>
      <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-oliva-claro" />
      <input
        type="search"
        value={termo}
        onChange={(e) => setTermo(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-borda bg-white pl-10 pr-10 text-sm shadow-[inset_0_1px_2px_rgba(43,51,38,0.05)] outline-none transition placeholder:text-suave/70 hover:border-oliva-claro focus:border-verde-marca focus:ring-4 focus:ring-salvia/40 [&::-webkit-search-cancel-button]:hidden"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-suave">
        {carregando ? (
          <LoaderCircle size={16} className="animate-spin text-verde-marca" />
        ) : termo ? (
          <button type="button" onClick={() => setTermo("")} className="rounded-full p-0.5 hover:bg-creme" aria-label="Limpar busca"><X size={15} /></button>
        ) : null}
      </span>
    </div>
  );
}

/** Pílulas de escolha única gravadas na URL (situação, status, período...). */
export function PilulasUrl({ param, opcoes, padrao = "", rotulo }: {
  param: string;
  opcoes: { valor: string; rotulo: ReactNode }[];
  padrao?: string;
  rotulo?: string;
}) {
  const { params, definir, carregando } = useFiltroUrl();
  const atual = params.get(param) ?? padrao;
  const [otimista, setOtimista] = useState(atual);
  useEffect(() => setOtimista(atual), [atual]);

  return (
    <div className="flex items-center gap-2">
      {rotulo && <span className="text-xs font-semibold text-suave">{rotulo}</span>}
      <div className={cx("inline-flex flex-wrap gap-1 rounded-xl border border-borda bg-white p-1", carregando && "opacity-80")}>
        {opcoes.map((o) => (
          <button
            key={o.valor}
            type="button"
            aria-pressed={otimista === o.valor}
            onClick={() => { setOtimista(o.valor); definir(param, o.valor, padrao); }}
            className={cx(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition",
              otimista === o.valor ? "bg-verde-marca text-white shadow-sm" : "text-suave hover:bg-creme hover:text-verde-escuro",
            )}
          >
            {o.rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Lista suspensa gravada na URL, para filtros com muitas opções. */
export function SelecaoUrl({ param, opcoes, padrao = "", icone }: {
  param: string;
  opcoes: { valor: string; rotulo: string }[];
  padrao?: string;
  icone?: ReactNode;
}) {
  const { params, definir } = useFiltroUrl();
  const atual = params.get(param) ?? padrao;
  const ativo = atual !== padrao;
  return (
    <div className="relative">
      {icone && <span className={cx("pointer-events-none absolute left-3 top-1/2 -translate-y-1/2", ativo ? "text-verde-marca" : "text-oliva-claro")}>{icone}</span>}
      <select
        value={atual}
        onChange={(e) => definir(param, e.target.value, padrao)}
        className={cx(
          "campo h-11 cursor-pointer rounded-xl border bg-white text-sm font-semibold outline-none transition hover:border-oliva-claro focus:ring-4 focus:ring-salvia/40",
          icone ? "pl-9" : "pl-3",
          ativo ? "border-verde-marca bg-verde-marca/[0.06] text-verde-escuro" : "border-borda text-texto/80",
        )}
      >
        {opcoes.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
      </select>
    </div>
  );
}

/** Link "Limpar filtros", só aparece quando algum filtro está diferente do padrão. */
export function LimparFiltros({ manter = [] }: { manter?: string[] }) {
  const { params, carregando } = useFiltroUrl();
  const router = useRouter();
  const pathname = usePathname();
  const ativos = [...params.keys()].filter((k) => !manter.includes(k));
  if (!ativos.length) return null;
  const novos = new URLSearchParams();
  manter.forEach((k) => params.get(k) && novos.set(k, params.get(k)!));
  const qs = novos.toString();
  return (
    <button
      type="button"
      disabled={carregando}
      onClick={() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-suave hover:bg-white hover:text-verde-escuro"
    >
      <X size={14} /> Limpar filtros
    </button>
  );
}

/** Faixa que agrupa os filtros de uma lista. */
export function BarraFiltros({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("mb-4 flex flex-wrap items-center gap-2.5 rounded-2xl border border-borda bg-white/60 p-2.5", className)}>{children}</div>;
}
