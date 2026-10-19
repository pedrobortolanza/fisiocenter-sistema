# FisioCenter Lapa · Sistema de agenda e financeiro

Sistema de demonstração para a **Fisiocenter · Clínica de Fisioterapia & Stúdio Pilates** (Lapa/PR):
agendas separadas por modalidade, planos de Pilates, ficha e estatísticas de pacientes, financeiro e repasses.
Todos os pacientes, profissionais e valores são fictícios.

Feito com **Next.js 15 + TypeScript + Tailwind**, banco e login no **Supabase**, hospedagem na **Vercel**.

## O que tem

| Tela | O que faz |
|---|---|
| **Painel** | Faturamento, a receber, despesas, saldo, sessões, faltas, gráfico do mês, agenda e aulas de hoje |
| **Agendas** | Abas Fisioterapia · Pilates · Estética · Domiciliar · Visão geral. Agendar clicando no horário, repetir toda semana, pacotes de 10 sessões, bloqueio de conflito de profissional e de sala, status (agendado, confirmado, realizado, faltou, cancelado), reagendar, registrar pagamento e **confirmar pelo WhatsApp** |
| **Grade do Pilates** | Turmas por dia e horário com vagas ocupadas, presença/falta, reposições geradas por falta, aula experimental e cancelamento de aula |
| **Pacientes** | Busca, cadastro completo (origem, convênio, profissão, bairro...) e ficha com planos, pacotes, sessões e pagamentos |
| **Planos** | Matrículas com horários fixos, vencimentos e renovações (com mensagem pronta no WhatsApp), catálogo de planos e mensalidades recorrentes |
| **Estatísticas** | Perfil (idade, sexo, bairro, cidade, profissão), aquisição (novos por mês, origem), uso (modalidades, serviços, horários de pico, ocupação das turmas), retenção (renovação, cancelamentos, inativos há 60+ dias), frequência (faltas por turma e por paciente) e ticket médio |
| **Financeiro** | Contas a receber (atrasadas primeiro), recebimentos, despesas por categoria, fluxo de caixa de 6 meses e repasse por profissional |
| **Configurações** | Profissionais (cor na agenda e % de repasse), serviços e preços, salas e usuários |

### Perfis de acesso

| Perfil | Acesso |
|---|---|
| Administração | Tudo |
| Recepção | Agenda, pacientes, planos e recebimentos (sem despesas, estatísticas e repasses) |
| Fisioterapeuta | Só a própria agenda, as próprias turmas e a lista de pacientes |

As permissões são garantidas no banco (Row Level Security), não só nas telas.

### Usuários de demonstração

Senha de todos: **fisio1995**. Na tela de login há botões para entrar com cada um.

| E-mail | Perfil |
|---|---|
| admin@fisiocenter.demo | Administração (Marina Taborda) |
| recepcao@fisiocenter.demo | Recepção (Luana Prestes) |
| fisio@fisiocenter.demo | Fisioterapeuta (Camila Andrade) |
| pilates@fisiocenter.demo | Fisioterapeuta e instrutora de Pilates (Juliana Kowalski) |

## Como colocar no ar (passo a passo)

### 1. Criar o banco no Supabase

1. Em [supabase.com/dashboard](https://supabase.com/dashboard), clique em **New project**. Sugestão de nome: `fisiocenter`, região **South America (São Paulo)**. Guarde a senha do banco.
2. Quando o projeto terminar de subir, abra **SQL Editor → New query**.
3. Copie todo o conteúdo de [`supabase/setup-completo.sql`](supabase/setup-completo.sql), cole e clique em **Run**.
   Ele cria as tabelas, as permissões, os 4 usuários de demonstração e os dados fictícios
   (120 pacientes, 3 meses de histórico e as próximas 3 semanas de agenda). No fim aparece
   `Demo pronta: 120 pacientes, ...`.
4. Em **Project Settings → API** (ou no botão **Connect**), copie:
   - **Project URL**
   - **anon / publishable key**
   - (opcional) **service_role / secret key**, só se quiser criar usuários pela tela de Configurações

> Alternativa pela linha de comando: `npx supabase link --project-ref SEU_REF`, `npx supabase db push` e depois rode `supabase/seed.sql` no SQL Editor.

### 2. Publicar na Vercel

1. Em [vercel.com/new](https://vercel.com/new), importe o repositório `fisiocenter-sistema` (o framework Next.js é detectado sozinho).
2. Em **Environment Variables**, cadastre:

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do passo 1.4 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | (opcional) service_role key |

3. Clique em **Deploy**. A cada push na branch `main` a Vercel publica de novo sozinha.
4. De volta ao Supabase, em **Authentication → URL Configuration**, coloque o endereço da Vercel em **Site URL**.

Pronto: abra o endereço da Vercel e entre com um dos usuários de demonstração.

### Renovar os dados da demonstração

As datas da demo são relativas ao dia em que o gerador roda. Antes de apresentar, se quiser a agenda
"de hoje" cheia de novo, rode no SQL Editor:

```sql
select public.seed_demo();
```

Isso apaga e recria pacientes, agenda, planos e financeiro (os usuários continuam).

## Rodando no computador

Precisa de Node 20+ e Docker (para o Supabase local).

```bash
npm install
npx supabase start          # sobe banco, login e API locais e aplica migrations + seed
cp .env.example .env.local  # cole a URL e a anon key que o comando acima mostrou
npm run dev                 # http://localhost:3000
```

Comandos úteis:

- `npx supabase db reset` recria o banco local do zero com os dados fictícios
- `npm run db:sql` regenera `supabase/setup-completo.sql` depois de mudar migrations ou seed
- `npm run db:tipos` regenera os tipos TypeScript do banco

## Estrutura

```
supabase/
  migrations/   schema, segurança (RLS), regras de negócio e painéis, gerador de dados, permissões da API
  seed.sql      usuários de demonstração + select seed_demo()
  setup-completo.sql  tudo junto para colar no SQL Editor
src/
  app/login, app/sobre          telas públicas
  app/(app)/...                 telas internas (painel, agenda, pacientes, planos, estatísticas, financeiro, configurações)
  components/                   componentes visuais (botões, cartões, gráficos, modal, busca de paciente)
  lib/                          Supabase, sessão/perfil, formatação em pt-BR, tipos do banco
```

Regras importantes ficam no banco:

- dois agendamentos do mesmo profissional ou da mesma sala no mesmo horário são recusados (`EXCLUDE USING gist`)
- sessão marcada como realizada com pacote desconta do pacote automaticamente
- falta em aula fixa do Pilates gera uma reposição para o aluno; usar a reposição desconta
- `gerar_cobrancas()` cria as mensalidades do mês das matrículas ativas; `renovar_matricula()` estende o plano e registra a renovação

## Identidade visual

Cores medidas no logo e nos posts da clínica: verde-oliva `#607E36`, verde escuro `#3E5228`, sálvia `#AEC6A8`,
oliva claro `#96A27E`, creme `#F0F0EA`, areia `#EAD8C0`. Títulos em **DM Serif Display**, interface em **Nunito Sans**.

## Fora desta versão

Prontuário e evolução clínica, nota fiscal, faturamento TISS de convênios, lembretes automáticos por WhatsApp/SMS,
agendamento online pelo paciente e app de celular.
