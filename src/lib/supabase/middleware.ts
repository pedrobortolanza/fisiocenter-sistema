import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigurado } from "./config";

const ROTAS_PUBLICAS = ["/login", "/sobre", "/configurar"];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publica = ROTAS_PUBLICAS.some((r) => pathname.startsWith(r));

  if (!supabaseConfigurado) {
    if (publica) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/configurar";
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // O middleware roda na borda da Vercel, perto do usuário e longe do Supabase. Aqui só lemos a sessão
  // do cookie (renovando o token quando vence), sem ida ao servidor de Auth a cada clique. Isso decide
  // apenas o redirecionamento: quem garante o acesso é getSessao (no layout) e o RLS do banco.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const logado = Boolean(session);

  if (!logado && !publica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (logado && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return response;
}
