import Image from "next/image";

export const metadata = { title: "Configurar" };

export default function ConfigurarPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <Image src="/logo.png" alt="Fisiocenter" width={220} height={81} />
      <h1 className="mt-8 text-3xl">Falta conectar o banco de dados</h1>
      <p className="mt-3 text-sm leading-relaxed">
        O sistema está no ar, mas ainda não conhece o projeto Supabase. Na Vercel, abra o projeto, vá em
        <b> Settings → Environment Variables</b> e cadastre:
      </p>
      <pre className="mt-4 rounded-xl border border-borda bg-white p-4 text-xs">{`NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY`}</pre>
      <p className="mt-3 text-sm">Depois faça um novo deploy. O passo a passo completo está no README do repositório.</p>
    </main>
  );
}
