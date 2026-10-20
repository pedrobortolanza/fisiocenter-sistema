"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Modal } from "@/components/modal";
import { Botao, Campo, EscolhaPagamento } from "@/components/ui";
import { moeda } from "@/lib/format";
import { receber } from "./actions";

/** Botão "Receber" da lista de cobranças: abre a escolha da forma de pagamento antes de dar baixa. */
export function ReceberBotao({ id, paciente, descricao, valor, formaPadrao }: {
  id: string;
  paciente: string | null;
  descricao: string | null;
  valor: number;
  formaPadrao: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [forma, setForma] = useState(formaPadrao);

  return (
    <>
      <Botao className="px-3 py-1 text-xs" onClick={() => setAberto(true)}>Receber</Botao>
      <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo="Receber cobrança">
        <form action={async (fd) => { await receber(fd); setAberto(false); }} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <div className="flex items-center justify-between gap-3 rounded-xl bg-creme/60 p-4">
            <div className="min-w-0 text-sm">
              <p className="truncate font-semibold text-verde-escuro">{paciente ?? "Sem paciente"}</p>
              <p className="truncate text-xs text-suave">{descricao}</p>
            </div>
            <p className="font-titulo text-2xl font-bold text-verde-escuro tabular">{moeda(valor)}</p>
          </div>
          <Campo rotulo="Como foi pago?" grupo>
            <EscolhaPagamento name="forma" valor={forma} aoMudar={setForma} />
          </Campo>
          <div className="flex justify-end gap-2">
            <Botao type="button" variante="secundario" onClick={() => setAberto(false)}>Cancelar</Botao>
            <Confirmar />
          </div>
        </form>
      </Modal>
    </>
  );
}

function Confirmar() {
  const { pending } = useFormStatus();
  return <Botao disabled={pending}><Check size={16} /> {pending ? "Registrando..." : "Confirmar recebimento"}</Botao>;
}
