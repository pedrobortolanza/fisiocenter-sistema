import Image from "next/image";
import Link from "next/link";
import { FormLogin } from "./form";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-verde-escuro p-12 text-creme lg:flex lg:flex-col lg:justify-between">
        <Folhas />
        <Image src="/logo-claro.png" alt="Fisiocenter · Fisioterapia & Stúdio Pilates" width={276} height={102} priority />
        <div className="relative max-w-md">
          <p className="font-serif text-5xl leading-tight text-creme">Cuidando da sua saúde desde 1995.</p>
          <p className="mt-5 text-lg text-salvia">Pilates, reabilitação e qualidade de vida, agora com a agenda e o caixa no mesmo lugar.</p>
        </div>
        <p className="relative text-sm text-salvia">
          Fundada pela Dra. Patrícia Ribas, pioneira da fisioterapia na Lapa ·{" "}
          <Link href="/sobre" className="underline underline-offset-4 hover:text-creme">
            nossa história
          </Link>
        </p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <Image src="/logo.png" alt="Fisiocenter" width={220} height={81} className="mb-8 lg:hidden" priority />
          <h1 className="text-4xl">Acesse o sistema</h1>
          <p className="mb-8 mt-2 text-sm text-suave">Entre com seu e-mail e senha da clínica.</p>
          <FormLogin />
        </div>
      </section>
    </main>
  );
}

function Folhas() {
  return (
    <svg className="pointer-events-none absolute -right-24 -bottom-24 h-[560px] w-[560px] opacity-20" viewBox="0 0 200 200" aria-hidden>
      <path d="M150 10C95 40 60 85 52 140c-3 22 0 42 8 58" fill="none" stroke="#AEC6A8" strokeWidth="3" />
      <path d="M170 30c-40 12-70 38-88 72" fill="none" stroke="#AEC6A8" strokeWidth="2" />
      <path d="M120 60c-25 10-45 30-55 60" fill="none" stroke="#96A27E" strokeWidth="2" />
      <ellipse cx="135" cy="70" rx="30" ry="12" transform="rotate(-40 135 70)" fill="#96A27E" />
      <ellipse cx="95" cy="110" rx="26" ry="10" transform="rotate(-55 95 110)" fill="#AEC6A8" />
      <ellipse cx="160" cy="40" rx="22" ry="8" transform="rotate(-25 160 40)" fill="#AEC6A8" />
    </svg>
  );
}
