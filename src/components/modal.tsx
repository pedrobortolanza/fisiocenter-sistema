"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export function Modal({ aberto, aoFechar, titulo, children, largura = "max-w-lg" }: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: ReactNode;
  children: ReactNode;
  largura?: string;
}) {
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [aberto, aoFechar]);

  if (!aberto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-texto/40 p-4 pt-[6vh] backdrop-blur-[2px]" onMouseDown={aoFechar}>
      <div className={`w-full ${largura} rounded-2xl border border-borda bg-white shadow-xl`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-borda px-5 py-4">
          <h2 className="text-xl">{titulo}</h2>
          <button onClick={aoFechar} className="rounded-lg p-1 text-suave hover:bg-creme" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
