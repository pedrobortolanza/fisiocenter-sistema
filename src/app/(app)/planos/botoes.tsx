"use client";

import { useTransition } from "react";
import { Botao } from "@/components/ui";
import { gerarCobrancas, mudarStatus, renovar } from "./actions";

export function AcoesMatricula({ id, status }: { id: string; status: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <div className="flex justify-end gap-1 whitespace-nowrap">
      {(status === "ativo" || status === "vencido") && (
        <Botao variante="secundario" className="px-2.5 py-1 text-xs" disabled={pendente} onClick={() => iniciar(() => renovar(id))}>Renovar</Botao>
      )}
      {status === "ativo" && (
        <Botao variante="fantasma" className="px-2.5 py-1 text-xs" disabled={pendente} onClick={() => iniciar(() => mudarStatus(id, "pausado"))}>Pausar</Botao>
      )}
      {status === "pausado" && (
        <Botao variante="secundario" className="px-2.5 py-1 text-xs" disabled={pendente} onClick={() => iniciar(() => mudarStatus(id, "ativo"))}>Reativar</Botao>
      )}
      {status !== "cancelado" && (
        <Botao
          variante="fantasma"
          className="px-2.5 py-1 text-xs text-red-700"
          disabled={pendente}
          onClick={() => confirm("Cancelar esta matrícula? O aluno sai dos horários fixos.") && iniciar(() => mudarStatus(id, "cancelado"))}
        >
          Cancelar
        </Botao>
      )}
    </div>
  );
}

export function BotaoGerarCobrancas() {
  const [pendente, iniciar] = useTransition();
  return (
    <Botao
      variante="secundario"
      disabled={pendente}
      onClick={() => iniciar(async () => { const n = await gerarCobrancas(); alert(n ? `${n} mensalidades geradas no financeiro.` : "As mensalidades deste mês já estavam geradas."); })}
    >
      {pendente ? "Gerando..." : "Gerar mensalidades do mês"}
    </Botao>
  );
}
