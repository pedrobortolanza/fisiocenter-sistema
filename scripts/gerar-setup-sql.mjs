// Junta as migrations e o seed em um único arquivo para colar no SQL Editor do Supabase.
// Uso: npm run db:sql
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = "supabase/migrations";
const partes = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => `-- >>> ${f}\n${readFileSync(join(dir, f), "utf8")}`);
partes.push(`-- >>> seed.sql\n${readFileSync("supabase/seed.sql", "utf8")}`);

const cabecalho = `-- FisioCenter Lapa · instalação completa do banco (gerado por scripts/gerar-setup-sql.mjs)
-- Cole tudo no SQL Editor do Supabase e clique em Run. Rode uma única vez em um projeto novo.
-- Para renovar os dados fictícios depois: select public.seed_demo();\n\n`;
writeFileSync("supabase/setup-completo.sql", cabecalho + partes.join("\n\n"));
console.log("supabase/setup-completo.sql gerado");
