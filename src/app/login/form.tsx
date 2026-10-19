"use client";

import { useActionState, useRef } from "react";
import { Botao, Campo, Entrada } from "@/components/ui";
import { entrar } from "./actions";

const DEMO = [
  { email: "admin@fisiocenter.demo", rotulo: "Administração", desc: "tudo, inclusive financeiro" },
  { email: "recepcao@fisiocenter.demo", rotulo: "Recepção", desc: "agenda, pacientes, recebimentos" },
  { email: "fisio@fisiocenter.demo", rotulo: "Fisioterapeuta", desc: "Camila: só a própria agenda" },
];

export function FormLogin() {
  const [estado, acao, enviando] = useActionState(entrar, undefined);
  const form = useRef<HTMLFormElement>(null);

  function usarDemo(email: string) {
    const f = form.current;
    if (!f) return;
    (f.elements.namedItem("email") as HTMLInputElement).value = email;
    (f.elements.namedItem("senha") as HTMLInputElement).value = "fisio1995";
    f.requestSubmit();
  }

  return (
    <div>
      <form ref={form} action={acao} className="space-y-4">
        <Campo rotulo="E-mail">
          <Entrada name="email" type="email" required autoComplete="email" placeholder="voce@fisiocenter.com.br" />
        </Campo>
        <Campo rotulo="Senha">
          <Entrada name="senha" type="password" required autoComplete="current-password" />
        </Campo>
        {estado?.erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{estado.erro}</p>}
        <Botao type="submit" className="w-full py-2.5" disabled={enviando}>
          {enviando ? "Entrando..." : "Entrar"}
        </Botao>
      </form>

      <div className="mt-8 rounded-xl border border-dashed border-oliva-claro bg-creme/60 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-suave">Demonstração · entrar como</p>
        <div className="mt-3 grid gap-2">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              disabled={enviando}
              onClick={() => usarDemo(d.email)}
              className="flex items-center justify-between rounded-lg border border-borda bg-white px-3 py-2 text-left text-sm hover:border-verde-marca"
            >
              <span className="font-semibold text-verde-escuro">{d.rotulo}</span>
              <span className="text-xs text-suave">{d.desc}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-suave">Senha de todos os usuários de teste: fisio1995</p>
      </div>
    </div>
  );
}
