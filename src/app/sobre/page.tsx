import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";

export const metadata = { title: "Sobre a clínica" };

const SERVICOS = [
  "Fisioterapia", "RPG", "Atendimento domiciliar", "Acupuntura", "Bandagem neuromuscular",
  "Pilates solo, aparelhos e Suspensus", "Microfisioterapia", "Ventosaterapia", "Aromaterapia",
  "Tratamentos estéticos", "Depilação a laser",
];

export default function SobrePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/" className="text-sm font-semibold text-verde-marca hover:underline">← Voltar ao sistema</Link>
      <Image src="/logo.png" alt="Fisiocenter · Fisioterapia & Stúdio Pilates" width={300} height={110} className="mt-8" />
      <h1 className="mt-8 text-4xl">Cuidando da sua saúde desde 1995</h1>
      <p className="mt-4 text-lg leading-relaxed">
        A Fisiocenter nasceu em 25 de agosto de 1995, fundada pela Dra. Patrícia Ribas, pioneira da fisioterapia na Lapa.
        Hoje é clínica de fisioterapia e stúdio de Pilates, com atendimento acolhedor para quem quer se reabilitar,
        prevenir dores e ganhar qualidade de vida.
      </p>
      <div className="mt-8 grid gap-6 rounded-2xl border border-borda bg-white p-6 sm:grid-cols-2">
        <div>
          <h2 className="text-2xl">Serviços</h2>
          <ul className="mt-3 space-y-1.5">
            {SERVICOS.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm"><Check size={16} className="text-verde-marca" /> {s}</li>
            ))}
          </ul>
        </div>
        <div className="space-y-4 text-sm">
          <div>
            <h2 className="text-2xl">Onde estamos</h2>
            <p className="mt-2">R. Mal. Floriano Peixoto, 394 · Centro<br />Lapa/PR · 83750-000</p>
          </div>
          <p>(41) 3622-6872<br />fisiocenterlapa@gmail.com<br />@fisiocenter_lapa</p>
        </div>
      </div>
      <p className="mt-8 text-xs text-suave">Sistema de demonstração. Pacientes, profissionais e valores exibidos são fictícios.</p>
    </main>
  );
}
