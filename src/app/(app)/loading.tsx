import { Cartao } from "@/components/ui";

/** Aparece na hora do clique enquanto o servidor monta a próxima tela. */
export default function Carregando() {
  return (
    <div className="animate-pulse" aria-busy="true" aria-label="Carregando">
      <div className="mb-6">
        <div className="h-9 w-56 rounded-lg bg-borda" />
        <div className="mt-2 h-4 w-40 rounded bg-borda/70" />
      </div>
      <div className="mb-4 h-10 rounded-lg bg-borda/60" />
      <Cartao className="divide-y divide-borda">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <div className="h-4 w-1/3 rounded bg-borda/80" />
            <div className="h-4 w-16 rounded bg-borda/60" />
            <div className="ml-auto h-4 w-24 rounded bg-borda/60" />
          </div>
        ))}
      </Cartao>
    </div>
  );
}
