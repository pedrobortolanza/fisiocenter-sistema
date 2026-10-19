"use client";

import { BarChart3, CalendarDays, ClipboardList, Home, LogOut, Menu, Settings, Users, Wallet, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { sair } from "@/app/login/actions";
import { Avatar, cx } from "@/components/ui";
import type { Papel } from "@/lib/auth";
import { PAPEIS } from "@/lib/format";

const ITENS: { href: string; rotulo: string; icone: typeof Home; papeis: Papel[] }[] = [
  { href: "/", rotulo: "Painel", icone: Home, papeis: ["admin", "recepcao"] },
  { href: "/agenda", rotulo: "Agendas", icone: CalendarDays, papeis: ["admin", "recepcao", "fisio"] },
  { href: "/pacientes", rotulo: "Pacientes", icone: Users, papeis: ["admin", "recepcao", "fisio"] },
  { href: "/planos", rotulo: "Planos", icone: ClipboardList, papeis: ["admin", "recepcao"] },
  { href: "/estatisticas", rotulo: "Estatísticas", icone: BarChart3, papeis: ["admin"] },
  { href: "/financeiro", rotulo: "Financeiro", icone: Wallet, papeis: ["admin", "recepcao"] },
  { href: "/configuracoes", rotulo: "Configurações", icone: Settings, papeis: ["admin"] },
];

export function MenuLateral({ nome, papel }: { nome: string; papel: Papel }) {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const itens = ITENS.filter((i) => i.papeis.includes(papel));
  const ativo = (href: string) => (href === "/" ? caminho === "/" : caminho.startsWith(href));

  return (
    <>
      <header className="no-print sticky top-0 z-40 flex items-center justify-between border-b border-borda bg-white px-4 py-3 lg:hidden">
        <Image src="/logo.png" alt="Fisiocenter" width={130} height={48} />
        <button onClick={() => setAberto(true)} className="rounded-lg p-2 text-verde-escuro hover:bg-creme" aria-label="Abrir menu">
          <Menu size={22} />
        </button>
      </header>

      {aberto && <div className="fixed inset-0 z-40 bg-texto/40 lg:hidden" onClick={() => setAberto(false)} />}

      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-borda bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          aberto ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-6">
          <Link href="/" onClick={() => setAberto(false)}>
            <Image src="/logo.png" alt="Fisiocenter · Fisioterapia & Stúdio Pilates" width={180} height={66} priority />
          </Link>
          <button onClick={() => setAberto(false)} className="rounded-lg p-1 text-suave lg:hidden" aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {itens.map(({ href, rotulo, icone: Icone }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setAberto(false)}
              className={cx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                ativo(href) ? "bg-verde-marca text-white" : "text-texto hover:bg-creme hover:text-verde-escuro",
              )}
            >
              <Icone size={18} strokeWidth={2} />
              {rotulo}
            </Link>
          ))}
        </nav>

        <div className="border-t border-borda p-4">
          <div className="flex items-center gap-3">
            <Avatar nome={nome} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-verde-escuro">{nome}</p>
              <p className="text-xs text-suave">{PAPEIS[papel]}</p>
            </div>
            <form action={sair}>
              <button className="rounded-lg p-2 text-suave hover:bg-creme hover:text-verde-escuro" title="Sair" aria-label="Sair">
                <LogOut size={17} />
              </button>
            </form>
          </div>
          <Link href="/sobre" className="mt-3 block text-xs text-suave hover:text-verde-escuro">
            Fisiocenter · desde 1995
          </Link>
        </div>
      </aside>
    </>
  );
}
