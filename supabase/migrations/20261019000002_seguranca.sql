-- FisioCenter Lapa · Perfis de acesso (Row Level Security)
-- admin: tudo · recepcao: agenda, pacientes, planos e recebimentos · fisio: a própria agenda

create or replace function public.meu_papel()
returns text language sql stable security definer set search_path = public as $$
  select papel from public.perfis where id = auth.uid()
$$;

create or replace function public.meu_profissional()
returns uuid language sql stable security definer set search_path = public as $$
  select profissional_id from public.perfis where id = auth.uid()
$$;

create or replace function public.tem_papel(variadic papeis text[])
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select papel from public.perfis where id = auth.uid()) = any (papeis), false)
$$;

alter table public.modalidades      enable row level security;
alter table public.profissionais    enable row level security;
alter table public.perfis           enable row level security;
alter table public.salas            enable row level security;
alter table public.servicos         enable row level security;
alter table public.pacientes        enable row level security;
alter table public.pacotes          enable row level security;
alter table public.agendamentos     enable row level security;
alter table public.turmas           enable row level security;
alter table public.planos           enable row level security;
alter table public.matriculas       enable row level security;
alter table public.renovacoes       enable row level security;
alter table public.matricula_turmas enable row level security;
alter table public.aulas            enable row level security;
alter table public.presencas        enable row level security;
alter table public.recebimentos     enable row level security;
alter table public.categorias_desp  enable row level security;
alter table public.despesas         enable row level security;

-- Cadastros: todos os perfis leem, só admin altera
do $$
declare t text;
begin
  foreach t in array array['modalidades','profissionais','salas','servicos','turmas','planos','categorias_desp'] loop
    execute format('create policy "%1$s_leitura" on public.%1$I for select to authenticated using ((select public.meu_papel()) is not null)', t);
    execute format('create policy "%1$s_admin" on public.%1$I for all to authenticated using ((select public.tem_papel(''admin''))) with check ((select public.tem_papel(''admin'')))', t);
  end loop;
end $$;

-- Perfis: cada um vê o seu; admin vê e altera todos
create policy perfis_proprio on public.perfis for select to authenticated
  using (id = (select auth.uid()) or (select public.tem_papel('admin')));
create policy perfis_admin on public.perfis for all to authenticated
  using ((select public.tem_papel('admin'))) with check ((select public.tem_papel('admin')));

-- Pacientes, pacotes, matrículas: todos leem; admin e recepção alteram
do $$
declare t text;
begin
  foreach t in array array['pacientes','pacotes','matriculas','matricula_turmas','renovacoes'] loop
    execute format('create policy "%1$s_leitura" on public.%1$I for select to authenticated using ((select public.meu_papel()) is not null)', t);
    execute format('create policy "%1$s_escrita" on public.%1$I for all to authenticated using ((select public.tem_papel(''admin'',''recepcao''))) with check ((select public.tem_papel(''admin'',''recepcao'')))', t);
  end loop;
end $$;

-- Agendamentos: recepção e admin tudo; fisioterapeuta só os seus
create policy agendamentos_equipe on public.agendamentos for all to authenticated
  using ((select public.tem_papel('admin','recepcao')))
  with check ((select public.tem_papel('admin','recepcao')));
create policy agendamentos_fisio_leitura on public.agendamentos for select to authenticated
  using (profissional_id = (select public.meu_profissional()));
create policy agendamentos_fisio_status on public.agendamentos for update to authenticated
  using (profissional_id = (select public.meu_profissional()))
  with check (profissional_id = (select public.meu_profissional()));

-- Aulas e presenças do Pilates: todos leem; equipe altera; instrutor altera as próprias turmas
do $$
declare t text;
begin
  foreach t in array array['aulas','presencas'] loop
    execute format('create policy "%1$s_leitura" on public.%1$I for select to authenticated using ((select public.meu_papel()) is not null)', t);
    execute format('create policy "%1$s_equipe" on public.%1$I for all to authenticated using ((select public.tem_papel(''admin'',''recepcao''))) with check ((select public.tem_papel(''admin'',''recepcao'')))', t);
  end loop;
end $$;

create policy aulas_instrutor on public.aulas for update to authenticated
  using (exists (select 1 from public.turmas t where t.id = turma_id and t.profissional_id = (select public.meu_profissional())));
create policy presencas_instrutor on public.presencas for all to authenticated
  using (exists (select 1 from public.aulas a join public.turmas t on t.id = a.turma_id
                 where a.id = aula_id and t.profissional_id = (select public.meu_profissional())))
  with check (exists (select 1 from public.aulas a join public.turmas t on t.id = a.turma_id
                 where a.id = aula_id and t.profissional_id = (select public.meu_profissional())));

-- Financeiro: recebimentos para admin e recepção; despesas só admin
create policy recebimentos_equipe on public.recebimentos for all to authenticated
  using ((select public.tem_papel('admin','recepcao')))
  with check ((select public.tem_papel('admin','recepcao')));
create policy despesas_admin on public.despesas for all to authenticated
  using ((select public.tem_papel('admin'))) with check ((select public.tem_papel('admin')));
