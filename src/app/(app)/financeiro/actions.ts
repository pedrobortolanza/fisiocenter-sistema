"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirPapel } from "@/lib/auth";
import { hojeISO } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

const valor = z.preprocess((v) => Number(String(v ?? "").replace(/\./g, "").replace(",", ".")), z.number().positive());
const opcional = (v: unknown) => (v === "" || v == null ? null : v);

export async function receber(formData: FormData) {
  await exigirPapel("admin", "recepcao");
  const supabase = await createClient();
  await supabase
    .from("recebimentos")
    .update({ status: "pago", pago_em: hojeISO(), forma_pagamento: String(formData.get("forma") || "pix") })
    .eq("id", String(formData.get("id")));
  revalidatePath("/financeiro");
}

export async function cancelarRecebimento(formData: FormData) {
  await exigirPapel("admin", "recepcao");
  const supabase = await createClient();
  await supabase.from("recebimentos").update({ status: "cancelado" }).eq("id", String(formData.get("id")));
  revalidatePath("/financeiro");
}

const schemaRec = z.object({
  descricao: z.string().trim().min(2),
  valor,
  forma_pagamento: z.string(),
  vencimento: z.string(),
  paciente_id: z.preprocess(opcional, z.string().uuid().nullable()),
  profissional_id: z.preprocess(opcional, z.string().uuid().nullable()),
  modalidade_id: z.preprocess((v) => (v ? Number(v) : null), z.number().nullable()),
  pago: z.preprocess((v) => v === "on", z.boolean()),
});

export async function novoRecebimento(formData: FormData) {
  await exigirPapel("admin", "recepcao");
  const r = schemaRec.safeParse(Object.fromEntries(formData));
  if (!r.success) return;
  const { pago, ...d } = r.data;
  const supabase = await createClient();
  await supabase.from("recebimentos").insert({
    ...d,
    status: pago ? "pago" : "aberto",
    pago_em: pago ? d.vencimento : null,
    forma_pagamento: pago ? d.forma_pagamento : null,
  });
  revalidatePath("/financeiro");
}

const schemaDesp = z.object({
  descricao: z.string().trim().min(2),
  valor,
  vencimento: z.string(),
  categoria_id: z.preprocess((v) => Number(v), z.number()),
  pago: z.preprocess((v) => v === "on", z.boolean()),
});

export async function novaDespesa(formData: FormData) {
  await exigirPapel("admin");
  const r = schemaDesp.safeParse(Object.fromEntries(formData));
  if (!r.success) return;
  const { pago, ...d } = r.data;
  const supabase = await createClient();
  await supabase.from("despesas").insert({ ...d, pago_em: pago ? d.vencimento : null, forma_pagamento: pago ? "pix" : null });
  revalidatePath("/financeiro");
}

export async function pagarDespesa(formData: FormData) {
  await exigirPapel("admin");
  const supabase = await createClient();
  await supabase.from("despesas").update({ pago_em: hojeISO(), forma_pagamento: "pix" }).eq("id", String(formData.get("id")));
  revalidatePath("/financeiro");
}

export async function excluirDespesa(formData: FormData) {
  await exigirPapel("admin");
  const supabase = await createClient();
  await supabase.from("despesas").delete().eq("id", String(formData.get("id")));
  revalidatePath("/financeiro");
}
