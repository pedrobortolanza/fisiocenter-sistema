import { redirect } from "next/navigation";
import { MenuLateral } from "@/components/menu-lateral";
import { getSessao } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessao = await getSessao();
  if (!sessao) redirect("/login");

  return (
    <div className="min-h-screen lg:flex">
      <MenuLateral nome={sessao.nome} papel={sessao.papel} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}
