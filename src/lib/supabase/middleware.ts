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

  // getClaims valida o token localmente (chaves assimétricas) e só vai ao servidor de Auth quando precisa
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims.sub ? data.claims : null;

  if (!user && !publica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return response;
}
