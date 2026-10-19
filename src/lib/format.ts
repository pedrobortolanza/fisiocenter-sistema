import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

export const TZ = "America/Sao_Paulo";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const moeda = (v: number | string | null | undefined) => brl.format(Number(v ?? 0));

export const hojeISO = () => formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");

/** Data no formato dd/MM/yyyy. Aceita "yyyy-MM-dd" (data pura) ou timestamp. */
export function data(v: string | Date | null | undefined, padrao = "dd/MM/yyyy") {
  if (!v) return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return formatInTimeZone(new Date(`${v}T12:00:00Z`), "UTC", padrao, { locale: ptBR });
  }
  return formatInTimeZone(new Date(v), TZ, padrao, { locale: ptBR });
}

export const hora = (v: string | Date) => formatInTimeZone(new Date(v), TZ, "HH:mm");

export function idade(nascimento: string | null | undefined) {
  if (!nascimento) return null;
  const [a, m, d] = nascimento.split("-").map(Number);
  const [ha, hm, hd] = hojeISO().split("-").map(Number);
  let i = ha - a;
  if (hm < m || (hm === m && hd < d)) i--;
  return i;
}

/** Soma dias a uma data "yyyy-MM-dd". */
export function somaDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function inicioDoMes(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

export function fimDoMes(iso: string) {
  const [a, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(a, m, 0));
  return d.toISOString().slice(0, 10);
}

export function somaMeses(iso: string, meses: number) {
  const [a, m, d] = iso.split("-").map(Number);
  const r = new Date(Date.UTC(a, m - 1 + meses, d, 12));
  return r.toISOString().slice(0, 10);
}

export function nomeMes(iso: string) {
  const s = formatInTimeZone(new Date(`${iso.slice(0, 7)}-15T12:00:00Z`), "UTC", "MMMM 'de' yyyy", { locale: ptBR });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const primeiroNome = (nome: string) => nome.split(" ")[0];

export function iniciais(nome: string) {
  const p = nome.split(" ").filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

export function linkWhatsApp(telefone: string | null | undefined, mensagem: string) {
  const num = (telefone ?? "").replace(/\D/g, "");
  if (!num) return null;
  const comDdi = num.startsWith("55") ? num : `55${num}`;
  return `https://wa.me/${comDdi}?text=${encodeURIComponent(mensagem)}`;
}

export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
export const DIAS_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const FORMAS_PAGAMENTO: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  convenio: "Convênio",
  boleto: "Boleto",
};

export const STATUS_AGENDAMENTO: Record<string, { rotulo: string; classe: string }> = {
  agendado: { rotulo: "Agendado", classe: "bg-areia text-texto" },
  confirmado: { rotulo: "Confirmado", classe: "bg-salvia text-verde-escuro" },
  realizado: { rotulo: "Realizado", classe: "bg-verde-marca text-white" },
  faltou: { rotulo: "Faltou", classe: "bg-red-100 text-red-800" },
  cancelado: { rotulo: "Cancelado", classe: "bg-zinc-200 text-zinc-600 line-through" },
};

export const STATUS_MATRICULA: Record<string, { rotulo: string; classe: string }> = {
  ativo: { rotulo: "Ativo", classe: "bg-salvia text-verde-escuro" },
  pausado: { rotulo: "Pausado", classe: "bg-areia text-texto" },
  cancelado: { rotulo: "Cancelado", classe: "bg-zinc-200 text-zinc-600" },
  vencido: { rotulo: "Vencido", classe: "bg-red-100 text-red-800" },
};

export const SITUACAO_RECEBIMENTO: Record<string, { rotulo: string; classe: string }> = {
  pago: { rotulo: "Pago", classe: "bg-salvia text-verde-escuro" },
  aberto: { rotulo: "Em aberto", classe: "bg-areia text-texto" },
  atrasado: { rotulo: "Atrasado", classe: "bg-red-100 text-red-800" },
  cancelado: { rotulo: "Cancelado", classe: "bg-zinc-200 text-zinc-600" },
};

export const PERIODICIDADES: Record<string, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

export const MESES_PERIODICIDADE: Record<string, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };

export const PAPEIS: Record<string, string> = {
  admin: "Administração",
  recepcao: "Recepção",
  fisio: "Fisioterapeuta",
};

export const ORIGENS = [
  "Instagram",
  "Facebook",
  "Google",
  "Indicação de amigo",
  "Indicação médica",
  "Passou em frente",
  "Convênio",
  "Outro",
];

export const CONVENIOS = ["Unimed", "Clinipam", "SulAmérica", "Paraná Clínicas"];
