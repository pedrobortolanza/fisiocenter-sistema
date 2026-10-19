"use server";

import { revalidatePath } from "next/cache";
import { exigirPapel } from "@/lib/auth";
import { hojeISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export async function renovar(id: string) {
  await exigirPapel("admin", "recepcao");
  const supabase = await createClient();
  await supabase.rpc("renovar_matricula", { p_matricula: id });
  revalidatePath("/planos");
}

export async function mudarStatus(id: string, status: "ativo" | "pausado" | "cancelado") {
  await exigirPapel("admin", "recepcao");
  const supabase = await createClient();
  await supabase
    .from("matriculas")
    .update({ status, cancelado_em: status === "cancelado" ? hojeISO() : null })
    .eq("id", id);
  if (status === "cancelado") {
    // tira o aluno das próximas aulas
    const { data: pres } = await supabase.from("presencas").select("aula_id, aulas!inner(data)").eq("matricula_id", id).eq("tipo", "fixo").gte("aulas.data", hojeISO());
    const ids = (pres ?? []).map((p) => p.aula_id);
    if (ids.length) await supabase.from("presencas").delete().eq("matricula_id", id).in("aula_id", ids);
  }
  revalidatePath("/planos");
}

export async function gerarCobrancas() {
  await exigirPapel("admin", "recepcao");
  const supabase = await createClient();
  const { data } = await supabase.rpc("gerar_cobrancas", { p_mes: hojeISO() });
  revalidatePath("/planos");
  revalidatePath("/financeiro");
  return data ?? 0;
}

export async function salvarPrecoPlano(formData: FormData) {
  await exigirPapel("admin");
  const id = Number(formData.get("id"));
  const preco = Number(String(formData.get("preco")).replace(",", "."));
  if (!id || !(preco >= 0)) return;
  const supabase = await createClient();
  await supabase.from("planos").update({ preco_mensal: preco }).eq("id", id);
  revalidatePath("/planos");
}
