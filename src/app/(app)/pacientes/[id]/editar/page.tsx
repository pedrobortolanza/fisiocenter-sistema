import { notFound } from "next/navigation";
import { Cabecalho } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FormPaciente } from "../../form";

export const metadata = { title: "Editar paciente" };

export default async function EditarPacientePage({ params }: { params: Promise<{ id: string }> }) {
  await exigirPapel("admin", "recepcao");
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("pacientes").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return (
    <div className="mx-auto max-w-4xl">
      <Cabecalho titulo="Editar paciente" sub={data.nome} />
      <FormPaciente paciente={data} />
    </div>
  );
}
