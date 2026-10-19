import { Cabecalho } from "@/components/ui";
import { exigirPapel } from "@/lib/auth";
import { FormPaciente } from "../form";

export const metadata = { title: "Novo paciente" };

export default async function NovoPacientePage() {
  await exigirPapel("admin", "recepcao");
  return (
    <div className="mx-auto max-w-4xl">
      <Cabecalho titulo="Novo paciente" sub="Só o nome é obrigatório. Os outros dados alimentam as estatísticas." />
      <FormPaciente />
    </div>
  );
}
