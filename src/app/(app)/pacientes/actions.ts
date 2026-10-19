"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const vazioParaNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : typeof v === "string" ? v.trim() : v);

const schema = z.object({
  nome: z.string().trim().min(3, "Informe o nome completo"),
  cpf: z.preprocess(vazioParaNull, z.string().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, "CPF inválido").nullable()),
  telefone: z.preprocess(vazioParaNull, z.string().nullable()),
  email: z.preprocess(vazioParaNull, z.string().email("E-mail inválido").nullable()),
  nascimento: z.preprocess(vazioParaNull, z.string().nullable()),
  sexo: z.preprocess(vazioParaNull, z.enum(["F", "M", "O"]).nullable()),
  cidade: z.preprocess(vazioParaNull, z.string().nullable()),
  bairro: z.preprocess(vazioParaNull, z.string().nullable()),
  endereco: z.preprocess(vazioParaNull, z.string().nullable()),
  profissao: z.preprocess(vazioParaNull, z.string().nullable()),
  origem: z.preprocess(vazioParaNull, z.string().nullable()),
  convenio: z.preprocess(vazioParaNull, z.string().nullable()),
  obs: z.preprocess(vazioParaNull, z.string().nullable()),
});

export type EstadoForm = { erro?: string } | undefined;

function formatarCpf(cpf: string | null) {
  if (!cpf) return null;
  const d = cpf.replace(/\D/g, "");
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export async function salvarPaciente(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigirPapel("admin", "recepcao");
  const id = String(formData.get("id") ?? "");
  const r = schema.safeParse(Object.fromEntries(formData));
  if (!r.success) return { erro: r.error.issues[0]?.message ?? "Confira os dados" };
  const dados = { ...r.data, cpf: formatarCpf(r.data.cpf) };

  const supabase = await createClient();
  const q = id
    ? supabase.from("pacientes").update(dados).eq("id", id).select("id").single()
    : supabase.from("pacientes").insert(dados).select("id").single();
  const { data, error } = await q;
  if (error) return { erro: error.code === "23505" ? "Já existe um paciente com esse CPF." : "Não foi possível salvar." };

  revalidatePath("/pacientes");
  redirect(`/pacientes/${data.id}`);
}

export async function alternarAtivo(id: string, ativo: boolean) {
  await exigirPapel("admin", "recepcao");
  const supabase = await createClient();
  await supabase.from("pacientes").update({ ativo }).eq("id", id);
  revalidatePath(`/pacientes/${id}`);
}
