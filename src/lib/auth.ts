import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Papel = "admin" | "recepcao" | "fisio";

export type Sessao = {
  userId: string;
  email: string;
  nome: string;
  papel: Papel;
  profissionalId: string | null;
};

export const getSessao = cache(async (): Promise<Sessao | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, papel, profissional_id")
    .eq("id", user.id)
    .maybeSingle();
  return {
    userId: user.id,
    email: user.email ?? "",
    nome: perfil?.nome ?? user.email ?? "",
    papel: (perfil?.papel as Papel) ?? "recepcao",
    profissionalId: perfil?.profissional_id ?? null,
  };
});

/** Garante login e, se informado, um dos papéis. Fisioterapeuta sem permissão volta para a agenda. */
export async function exigirPapel(...papeis: Papel[]) {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");
  if (papeis.length && !papeis.includes(sessao.papel)) redirect(sessao.papel === "fisio" ? "/agenda" : "/");
  return sessao;
}
