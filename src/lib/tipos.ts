import type { Papel } from "@/lib/auth";

export type Profissional = { id: string; nome: string; cor_agenda: string; especialidade: string | null; crefito: string | null };
export type Sala = { id: number; nome: string; tipo: string };
export type Modalidade = { id: number; slug: string; nome: string; cor: string };
export type Servico = { id: number; nome: string; duracao_min: number; preco: number; modalidade_id: number };

export type Catalogo = {
  profissionais: Profissional[];
  salas: Sala[];
  modalidades: Modalidade[];
  servicos: Servico[];
};

export type Usuario = { papel: Papel; profissionalId: string | null };

export const ABAS_AGENDA = [
  { id: "fisioterapia", rotulo: "Fisioterapia" },
  { id: "pilates", rotulo: "Pilates" },
  { id: "estetica", rotulo: "Estética" },
  { id: "domiciliar", rotulo: "Domiciliar" },
  { id: "geral", rotulo: "Visão geral" },
] as const;

/** Estética é com quem não tem CREFITO; fisioterapia e domiciliar, com fisioterapeutas. */
export function profissionaisDa<P extends Profissional>(lista: P[], slug: string | null) {
  if (!slug || slug === "pilates") return lista;
  const filtrados = lista.filter((p) => (slug === "estetica" ? !p.crefito : !!p.crefito));
  return filtrados.length ? filtrados : lista;
}

/** Que tipo de sala cada modalidade usa */
export const SALA_POR_MODALIDADE: Record<string, string | null> = {
  fisioterapia: "consultorio",
  estetica: "estetica",
  domiciliar: null,
  pilates: "pilates",
};
