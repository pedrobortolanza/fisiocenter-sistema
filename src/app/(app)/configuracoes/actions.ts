"use server";

import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { exigirPapel } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_URL } from "@/lib/supabase/config";

const num = (v: FormDataEntryValue | null) => Number(String(v ?? "").replace(",", "."));
const txt = (v: FormDataEntryValue | null) => (String(v ?? "").trim() || null);

export async function salvarProfissional(formData: FormData) {
  await exigirPapel("admin");
  const supabase = await createClient();
  const id = txt(formData.get("id"));
  const dados = {
    nome: String(formData.get("nome")).trim(),
    crefito: txt(formData.get("crefito")),
    especialidade: txt(formData.get("especialidade")),
    cor_agenda: String(formData.get("cor_agenda") || "#607E36"),
    comissao_pct: num(formData.get("comissao_pct")),
    ativo: formData.get("ativo") === "on",
  };
  if (!dados.nome) return;
  if (id) await supabase.from("profissionais").update(dados).eq("id", id);
  else await supabase.from("profissionais").insert(dados);
  revalidatePath("/configuracoes");
}

export async function salvarServico(formData: FormData) {
  await exigirPapel("admin");
  const supabase = await createClient();
  const id = num(formData.get("id"));
  const dados = {
    nome: String(formData.get("nome")).trim(),
    duracao_min: num(formData.get("duracao_min")),
    preco: num(formData.get("preco")),
    modalidade_id: num(formData.get("modalidade_id")),
    ativo: formData.get("ativo") === "on",
  };
  if (!dados.nome || !dados.modalidade_id) return;
  if (id) await supabase.from("servicos").update(dados).eq("id", id);
  else await supabase.from("servicos").insert(dados);
  revalidatePath("/configuracoes");
}

export async function salvarSala(formData: FormData) {
  await exigirPapel("admin");
  const supabase = await createClient();
  const id = num(formData.get("id"));
  const dados = {
    nome: String(formData.get("nome")).trim(),
    tipo: String(formData.get("tipo")),
    capacidade: num(formData.get("capacidade")) || 1,
    ativo: formData.get("ativo") === "on",
  };
  if (!dados.nome) return;
  if (id) await supabase.from("salas").update(dados).eq("id", id);
  else await supabase.from("salas").insert(dados);
  revalidatePath("/configuracoes");
}

export async function salvarPerfil(formData: FormData) {
  await exigirPapel("admin");
  const supabase = await createClient();
  await supabase
    .from("perfis")
    .update({ papel: String(formData.get("papel")), profissional_id: txt(formData.get("profissional_id")), nome: String(formData.get("nome")).trim() })
    .eq("id", String(formData.get("id")));
  revalidatePath("/configuracoes");
}

export async function criarUsuario(_: { msg?: string; erro?: string } | undefined, formData: FormData) {
  await exigirPapel("admin");
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chave) return { erro: "Configure SUPABASE_SERVICE_ROLE_KEY na Vercel para criar usuários por aqui." };
  const admin = createAdminClient(SUPABASE_URL, chave, { auth: { persistSession: false } });
  const email = String(formData.get("email")).trim();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: String(formData.get("senha")),
    email_confirm: true,
    user_metadata: { nome: String(formData.get("nome")).trim(), papel: String(formData.get("papel")) },
  });
  if (error) return { erro: error.message.includes("already") ? "Já existe um usuário com esse e-mail." : "Não foi possível criar o usuário." };
  const prof = txt(formData.get("profissional_id"));
  if (prof && data.user) await admin.from("perfis").update({ profissional_id: prof }).eq("id", data.user.id);
  revalidatePath("/configuracoes");
  return { msg: `Usuário ${email} criado.` };
}
