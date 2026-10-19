"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const PALETA = ["#607E36", "#96A27E", "#C49A6C", "#5E7C8A", "#AEC6A8", "#3E5228", "#B07A5B", "#8A6D3B", "#4F7C74", "#D9C3A0"];

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmt = (formato: "moeda" | "numero" | "pct") => (v: number) =>
  formato === "moeda" ? brl.format(v) : formato === "pct" ? `${v}%` : new Intl.NumberFormat("pt-BR").format(v);

type Serie = { chave: string; nome: string; cor?: string };
const eixo = { fontSize: 12, fill: "#6b7462" };
const dica = { contentStyle: { borderRadius: 10, border: "1px solid #dfe0d4", fontSize: 13 }, cursor: { fill: "rgba(174,198,168,0.18)" } };

export function GraficoBarras({ dados, x, series, formato = "numero", horizontal = false, altura = 260, empilhado = false, coresPorItem }: {
  dados: Record<string, unknown>[];
  x: string;
  series: Serie[];
  formato?: "moeda" | "numero" | "pct";
  horizontal?: boolean;
  altura?: number;
  empilhado?: boolean;
  coresPorItem?: string;
}) {
  const f = fmt(formato);
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 12, left: horizontal ? 8 : 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ecece3" vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={eixo} tickFormatter={f} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey={x} tick={eixo} width={150} axisLine={false} tickLine={false} />
          </>
        ) : (
          <>
            <XAxis dataKey={x} tick={eixo} axisLine={false} tickLine={false} />
            <YAxis tick={eixo} tickFormatter={f} axisLine={false} tickLine={false} width={formato === "moeda" ? 72 : 36} />
          </>
        )}
        <Tooltip formatter={(v) => f(Number(v))} {...dica} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s, i) => (
          <Bar key={s.chave} dataKey={s.chave} name={s.nome} fill={s.cor ?? PALETA[i]} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} stackId={empilhado ? "a" : undefined} maxBarSize={42}>
            {coresPorItem && dados.map((d, j) => <Cell key={j} fill={(d[coresPorItem] as string) ?? PALETA[j % PALETA.length]} />)}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GraficoArea({ dados, x, series, formato = "moeda", altura = 260 }: {
  dados: Record<string, unknown>[];
  x: string;
  series: Serie[];
  formato?: "moeda" | "numero";
  altura?: number;
}) {
  const f = fmt(formato);
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <AreaChart data={dados} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.chave} id={`g-${s.chave}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.cor ?? PALETA[i]} stopOpacity={0.35} />
              <stop offset="100%" stopColor={s.cor ?? PALETA[i]} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#ecece3" vertical={false} />
        <XAxis dataKey={x} tick={eixo} axisLine={false} tickLine={false} />
        <YAxis tick={eixo} tickFormatter={f} axisLine={false} tickLine={false} width={72} />
        <Tooltip formatter={(v) => f(Number(v))} {...dica} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => (
          <Area key={s.chave} type="monotone" dataKey={s.chave} name={s.nome} stroke={s.cor ?? PALETA[i]} strokeWidth={2} fill={`url(#g-${s.chave})`} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function GraficoRosca({ dados, nome, valor, formato = "numero", altura = 240, cores }: {
  dados: Record<string, unknown>[];
  nome: string;
  valor: string;
  formato?: "moeda" | "numero";
  altura?: number;
  cores?: string[];
}) {
  const f = fmt(formato);
  const total = dados.reduce((s, d) => s + Number(d[valor] ?? 0), 0);
  return (
    <div className="@container">
    <div className="flex flex-col items-center gap-4 @md:flex-row">
      <div style={{ width: altura, height: altura }} className="shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={dados} dataKey={valor} nameKey={nome} innerRadius="58%" outerRadius="92%" paddingAngle={2} stroke="none">
              {dados.map((d, i) => <Cell key={i} fill={(d.cor as string) ?? cores?.[i] ?? PALETA[i % PALETA.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => f(Number(v))} contentStyle={dica.contentStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-1.5 text-sm">
        {dados.map((d, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: (d.cor as string) ?? cores?.[i] ?? PALETA[i % PALETA.length] }} />
            <span className="flex-1 truncate">{String(d[nome])}</span>
            <span className="font-bold tabular">{f(Number(d[valor]))}</span>
            <span className="w-11 text-right text-xs text-suave tabular">{total ? Math.round((100 * Number(d[valor])) / total) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}
