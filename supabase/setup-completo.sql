-- FisioCenter Lapa · instalação completa do banco (gerado por scripts/gerar-setup-sql.mjs)
-- Cole tudo no SQL Editor do Supabase e clique em Run. Rode uma única vez em um projeto novo.
-- Para renovar os dados fictícios depois: select public.seed_demo();

-- >>> 20261019000001_schema.sql
-- FisioCenter Lapa · Schema principal
-- Agendamento (fisioterapia, Pilates, estética, domiciliar), planos, pacientes e financeiro.

create extension if not exists btree_gist with schema extensions;

-- =====================================================================
-- Cadastros básicos
-- =====================================================================

create table public.modalidades (
  id smallint generated always as identity primary key,
  slug text not null unique check (slug in ('fisioterapia','pilates','estetica','domiciliar')),
  nome text not null,
  cor text not null default '#607E36'
);

create table public.profissionais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  crefito text,
  especialidade text,
  cor_agenda text not null default '#607E36',
  comissao_pct numeric(5,2) not null default 40 check (comissao_pct between 0 and 100),
  telefone text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text,
  papel text not null default 'recepcao' check (papel in ('admin','recepcao','fisio')),
  profissional_id uuid unique references public.profissionais(id) on delete set null,
  criado_em timestamptz not null default now()
);

create table public.salas (
  id smallint generated always as identity primary key,
  nome text not null,
  tipo text not null check (tipo in ('consultorio','pilates','estetica')),
  capacidade smallint not null default 1 check (capacidade > 0),
  ativo boolean not null default true
);

create table public.servicos (
  id integer generated always as identity primary key,
  modalidade_id smallint not null references public.modalidades(id),
  nome text not null,
  duracao_min smallint not null default 50 check (duracao_min > 0),
  preco numeric(10,2) not null default 0 check (preco >= 0),
  ativo boolean not null default true
);

create table public.pacientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text unique,
  telefone text,
  email text,
  nascimento date,
  sexo text check (sexo in ('F','M','O')),
  cidade text default 'Lapa',
  bairro text,
  endereco text,
  profissao text,
  origem text,
  convenio text,              -- null = particular
  obs text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index pacientes_nome_idx on public.pacientes (lower(nome));

-- =====================================================================
-- Fisioterapia, estética e domiciliar: agendamentos individuais
-- =====================================================================

create table public.pacotes (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  servico_id integer not null references public.servicos(id),
  total_sessoes smallint not null check (total_sessoes > 0),
  sessoes_usadas smallint not null default 0 check (sessoes_usadas >= 0),
  valor_total numeric(10,2) not null default 0,
  validade date,
  criado_em timestamptz not null default now()
);
create index pacotes_paciente_idx on public.pacotes (paciente_id);

create table public.agendamentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  profissional_id uuid not null references public.profissionais(id),
  sala_id smallint references public.salas(id),
  servico_id integer not null references public.servicos(id),
  pacote_id uuid references public.pacotes(id) on delete set null,
  inicio timestamptz not null,
  fim timestamptz not null,
  status text not null default 'agendado'
    check (status in ('agendado','confirmado','realizado','faltou','cancelado')),
  endereco_domiciliar text,
  obs text,
  criado_em timestamptz not null default now(),
  check (fim > inicio),
  -- Bloqueio de conflito: mesmo profissional no mesmo horário
  constraint agendamentos_conflito_profissional exclude using gist (
    profissional_id with =, tstzrange(inicio, fim) with &&
  ) where (status <> 'cancelado'),
  -- Bloqueio de conflito: mesma sala no mesmo horário
  constraint agendamentos_conflito_sala exclude using gist (
    sala_id with =, tstzrange(inicio, fim) with &&
  ) where (status <> 'cancelado' and sala_id is not null)
);
create index agendamentos_inicio_idx on public.agendamentos (inicio);
create index agendamentos_paciente_idx on public.agendamentos (paciente_id);

-- =====================================================================
-- Pilates: turmas, planos, matrículas, aulas e presenças
-- =====================================================================

create table public.turmas (
  id integer generated always as identity primary key,
  servico_id integer not null references public.servicos(id),
  profissional_id uuid not null references public.profissionais(id),
  sala_id smallint not null references public.salas(id),
  dia_semana smallint not null check (dia_semana between 0 and 6), -- 0 = domingo, 1 = segunda ...
  hora time not null,
  duracao_min smallint not null default 50,
  vagas smallint not null default 4 check (vagas > 0),
  ativo boolean not null default true,
  unique (sala_id, dia_semana, hora)
);

create table public.planos (
  id integer generated always as identity primary key,
  modalidade_id smallint not null references public.modalidades(id),
  servico_id integer references public.servicos(id),   -- tipo de aula (aparelhos, solo, Suspensus)
  nome text not null,
  aulas_semana smallint not null default 2 check (aulas_semana between 1 and 7),
  periodicidade text not null default 'mensal'
    check (periodicidade in ('mensal','trimestral','semestral','anual')),
  preco_mensal numeric(10,2) not null check (preco_mensal >= 0), -- valor já com desconto
  desconto_pct numeric(5,2) not null default 0,
  ativo boolean not null default true
);

create table public.matriculas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  plano_id integer not null references public.planos(id),
  inicio date not null default current_date,
  vencimento date not null,
  dia_vencimento smallint not null default 10 check (dia_vencimento between 1 and 28),
  status text not null default 'ativo' check (status in ('ativo','pausado','cancelado','vencido')),
  reposicoes_disp smallint not null default 0 check (reposicoes_disp >= 0),
  cancelado_em date,
  obs text,
  criado_em timestamptz not null default now()
);
create index matriculas_paciente_idx on public.matriculas (paciente_id);

create table public.renovacoes (
  id uuid primary key default gen_random_uuid(),
  matricula_id uuid not null references public.matriculas(id) on delete cascade,
  data date not null default current_date,
  vencimento_anterior date not null,
  novo_vencimento date not null
);
create index renovacoes_data_idx on public.renovacoes (data);

create table public.matricula_turmas (
  matricula_id uuid not null references public.matriculas(id) on delete cascade,
  turma_id integer not null references public.turmas(id) on delete cascade,
  primary key (matricula_id, turma_id)
);

create table public.aulas (
  id uuid primary key default gen_random_uuid(),
  turma_id integer not null references public.turmas(id) on delete cascade,
  data date not null,
  status text not null default 'prevista' check (status in ('prevista','realizada','cancelada')),
  unique (turma_id, data)
);
create index aulas_data_idx on public.aulas (data);

create table public.presencas (
  aula_id uuid not null references public.aulas(id) on delete cascade,
  paciente_id uuid not null references public.pacientes(id) on delete cascade,
  matricula_id uuid references public.matriculas(id) on delete set null,
  tipo text not null default 'fixo' check (tipo in ('fixo','reposicao','experimental')),
  status text not null default 'previsto' check (status in ('previsto','presente','falta','justificada')),
  primary key (aula_id, paciente_id)
);

-- =====================================================================
-- Financeiro
-- =====================================================================

create table public.recebimentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid references public.pacientes(id) on delete set null,
  agendamento_id uuid references public.agendamentos(id) on delete set null,
  pacote_id uuid references public.pacotes(id) on delete set null,
  matricula_id uuid references public.matriculas(id) on delete set null,
  profissional_id uuid references public.profissionais(id) on delete set null, -- para repasse
  modalidade_id smallint references public.modalidades(id),
  descricao text not null,
  valor numeric(10,2) not null check (valor >= 0),
  vencimento date not null default current_date,
  pago_em date,
  forma_pagamento text check (forma_pagamento in ('pix','dinheiro','cartao_credito','cartao_debito','convenio')),
  status text not null default 'aberto' check (status in ('aberto','pago','cancelado')),
  criado_em timestamptz not null default now()
);
create index recebimentos_venc_idx on public.recebimentos (vencimento);
create index recebimentos_pago_idx on public.recebimentos (pago_em);
create unique index recebimentos_matricula_mes_uidx
  on public.recebimentos (matricula_id, vencimento) where matricula_id is not null;

create table public.categorias_desp (
  id smallint generated always as identity primary key,
  nome text not null unique
);

create table public.despesas (
  id uuid primary key default gen_random_uuid(),
  categoria_id smallint references public.categorias_desp(id),
  descricao text not null,
  valor numeric(10,2) not null check (valor >= 0),
  vencimento date not null default current_date,
  pago_em date,
  forma_pagamento text,
  criado_em timestamptz not null default now()
);
create index despesas_venc_idx on public.despesas (vencimento);

-- =====================================================================
-- Regras de negócio
-- =====================================================================

-- Ao marcar sessão como realizada com pacote, incrementa sessoes_usadas (e desfaz ao voltar).
create or replace function public.tg_agendamento_pacote()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('UPDATE','DELETE') and old.pacote_id is not null and old.status = 'realizado' then
    update public.pacotes set sessoes_usadas = greatest(sessoes_usadas - 1, 0) where id = old.pacote_id;
  end if;
  if tg_op in ('INSERT','UPDATE') and new.pacote_id is not null and new.status = 'realizado' then
    update public.pacotes set sessoes_usadas = sessoes_usadas + 1 where id = new.pacote_id;
  end if;
  return coalesce(new, old);
end $$;

create trigger agendamento_pacote
after insert or update of status, pacote_id or delete on public.agendamentos
for each row execute function public.tg_agendamento_pacote();

-- Falta em aula fixa do Pilates gera uma reposição disponível na matrícula.
create or replace function public.tg_presenca_reposicao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.tipo = 'fixo' and new.matricula_id is not null then
    if new.status in ('falta','justificada') and (tg_op = 'INSERT' or old.status not in ('falta','justificada')) then
      update public.matriculas set reposicoes_disp = reposicoes_disp + 1 where id = new.matricula_id;
    elsif tg_op = 'UPDATE' and old.status in ('falta','justificada') and new.status not in ('falta','justificada') then
      update public.matriculas set reposicoes_disp = greatest(reposicoes_disp - 1, 0) where id = new.matricula_id;
    end if;
  end if;
  if tg_op = 'INSERT' and new.tipo = 'reposicao' and new.matricula_id is not null then
    update public.matriculas set reposicoes_disp = greatest(reposicoes_disp - 1, 0) where id = new.matricula_id;
  end if;
  return new;
end $$;

create trigger presenca_reposicao
after insert or update of status on public.presencas
for each row execute function public.tg_presenca_reposicao();

-- Cria o perfil quando um usuário é criado no Supabase Auth.
create or replace function public.tg_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome, email, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'papel', 'recepcao')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.tg_novo_usuario();


-- >>> 20261019000002_seguranca.sql
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


-- >>> 20261019000003_funcoes.sql
-- FisioCenter Lapa · Funções de negócio e painéis
-- Todas rodam com as permissões de quem chama (RLS continua valendo).

-- ---------------------------------------------------------------------
-- Pilates: gera as aulas da grade e as presenças dos alunos fixos
-- ---------------------------------------------------------------------
create or replace function public.gerar_aulas(p_ini date, p_fim date)
returns integer language plpgsql as $$
declare n integer;
begin
  insert into public.aulas (turma_id, data, status)
  select t.id, d::date, case when d::date < current_date then 'realizada' else 'prevista' end
  from public.turmas t
  cross join generate_series(p_ini, p_fim, interval '1 day') d
  where t.ativo and extract(dow from d) = t.dia_semana
  on conflict (turma_id, data) do nothing;
  get diagnostics n = row_count;

  insert into public.presencas (aula_id, paciente_id, matricula_id, tipo, status)
  select a.id, m.paciente_id, m.id, 'fixo', 'previsto'
  from public.aulas a
  join public.matricula_turmas mt on mt.turma_id = a.turma_id
  join public.matriculas m on m.id = mt.matricula_id
  where a.data between p_ini and p_fim
    and a.data >= current_date
    and m.status = 'ativo'
    and a.data between m.inicio and m.vencimento
  on conflict (aula_id, paciente_id) do nothing;

  return n;
end $$;

-- ---------------------------------------------------------------------
-- Planos: cobranças recorrentes do mês, renovação e vencimentos
-- ---------------------------------------------------------------------
create or replace function public.gerar_cobrancas(p_mes date default current_date)
returns integer language plpgsql as $$
declare n integer;
begin
  insert into public.recebimentos (paciente_id, matricula_id, profissional_id, modalidade_id,
                                   descricao, valor, vencimento, status)
  select m.paciente_id, m.id,
         (select t.profissional_id from public.matricula_turmas mt join public.turmas t on t.id = mt.turma_id
           where mt.matricula_id = m.id limit 1),
         p.modalidade_id,
         'Mensalidade ' || p.nome || ' · ' || to_char(p_mes, 'MM/YYYY'),
         p.preco_mensal,
         make_date(extract(year from p_mes)::int, extract(month from p_mes)::int, m.dia_vencimento),
         'aberto'
  from public.matriculas m
  join public.planos p on p.id = m.plano_id
  where m.status = 'ativo'
    and date_trunc('month', p_mes) between date_trunc('month', m.inicio) and date_trunc('month', m.vencimento)
  on conflict (matricula_id, vencimento) where matricula_id is not null do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.meses_periodicidade(p text)
returns integer language sql immutable as $$
  select case p when 'mensal' then 1 when 'trimestral' then 3 when 'semestral' then 6 when 'anual' then 12 else 1 end
$$;

create or replace function public.renovar_matricula(p_matricula uuid)
returns date language plpgsql as $$
declare
  v_venc date;
  v_novo date;
  v_meses integer;
begin
  select m.vencimento, public.meses_periodicidade(p.periodicidade)
    into v_venc, v_meses
  from public.matriculas m join public.planos p on p.id = m.plano_id
  where m.id = p_matricula;

  if v_venc is null then
    raise exception 'Matrícula não encontrada';
  end if;

  v_novo := (greatest(v_venc, current_date) + make_interval(months => v_meses))::date;

  update public.matriculas set vencimento = v_novo, status = 'ativo', cancelado_em = null
  where id = p_matricula;

  insert into public.renovacoes (matricula_id, data, vencimento_anterior, novo_vencimento)
  values (p_matricula, current_date, v_venc, v_novo);

  perform public.gerar_cobrancas(current_date);
  return v_novo;
end $$;

create or replace function public.atualizar_vencimentos()
returns integer language plpgsql as $$
declare n integer;
begin
  update public.matriculas set status = 'vencido'
  where status = 'ativo' and vencimento < current_date;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------
-- Vistas usadas pelas telas
-- ---------------------------------------------------------------------
create or replace view public.vw_recebimentos with (security_invoker = true) as
select r.*,
       case when r.status = 'aberto' and r.vencimento < current_date then 'atrasado' else r.status end as situacao,
       pa.nome as paciente_nome,
       pr.nome as profissional_nome,
       mo.slug as modalidade_slug,
       mo.nome as modalidade_nome
from public.recebimentos r
left join public.pacientes pa on pa.id = r.paciente_id
left join public.profissionais pr on pr.id = r.profissional_id
left join public.modalidades mo on mo.id = r.modalidade_id;

create or replace view public.vw_ocupacao_turmas with (security_invoker = true) as
select t.id, t.dia_semana, t.hora, t.duracao_min, t.vagas, t.sala_id, t.servico_id, t.profissional_id,
       s.nome as servico_nome, sa.nome as sala_nome, pr.nome as profissional_nome, pr.cor_agenda,
       count(m.id) filter (where m.status = 'ativo') as alunos_fixos
from public.turmas t
join public.servicos s on s.id = t.servico_id
join public.salas sa on sa.id = t.sala_id
join public.profissionais pr on pr.id = t.profissional_id
left join public.matricula_turmas mt on mt.turma_id = t.id
left join public.matriculas m on m.id = mt.matricula_id
where t.ativo
group by t.id, s.nome, sa.nome, pr.nome, pr.cor_agenda;

-- ---------------------------------------------------------------------
-- Painel do mês
-- ---------------------------------------------------------------------
create or replace function public.fn_painel(p_mes date default current_date)
returns jsonb language plpgsql stable as $$
declare
  v_ini date := date_trunc('month', p_mes)::date;
  v_fim date := (date_trunc('month', p_mes) + interval '1 month - 1 day')::date;
  r jsonb;
begin
  with
  rec as (select * from public.recebimentos where status <> 'cancelado'),
  ag as (
    select a.status from public.agendamentos a
    where (a.inicio at time zone 'America/Sao_Paulo')::date between v_ini and least(v_fim, current_date)
      and a.status in ('realizado','faltou')
    union all
    select case when p.status = 'presente' then 'realizado' else 'faltou' end
    from public.presencas p join public.aulas au on au.id = p.aula_id
    where au.data between v_ini and least(v_fim, current_date) and p.status in ('presente','falta','justificada')
  ),
  dias as (select d::date dia from generate_series(v_ini, v_fim, interval '1 day') d)
  select jsonb_build_object(
    'faturamento', coalesce((select sum(valor) from rec where pago_em between v_ini and v_fim), 0),
    'a_receber',   coalesce((select sum(valor) from rec where status = 'aberto' and vencimento between v_ini and v_fim), 0),
    'atrasado',    coalesce((select sum(valor) from rec where status = 'aberto' and vencimento < current_date), 0),
    'despesas',    coalesce((select sum(valor) from public.despesas where vencimento between v_ini and v_fim), 0),
    'despesas_pagas', coalesce((select sum(valor) from public.despesas where pago_em between v_ini and v_fim), 0),
    'sessoes_realizadas', (select count(*) from ag where status = 'realizado'),
    'faltas', (select count(*) from ag where status = 'faltou'),
    'por_dia', (
      select jsonb_agg(jsonb_build_object(
        'dia', to_char(dia, 'DD'),
        'receitas', coalesce((select sum(valor) from rec where pago_em = dia), 0),
        'despesas', coalesce((select sum(valor) from public.despesas where pago_em = dia), 0)
      ) order by dia) from dias
    ),
    'por_modalidade', (
      select coalesce(jsonb_agg(jsonb_build_object('modalidade', m.nome, 'slug', m.slug, 'cor', m.cor, 'valor', x.total) order by x.total desc), '[]'::jsonb)
      from (select modalidade_id, sum(valor) total from rec where pago_em between v_ini and v_fim group by 1) x
      join public.modalidades m on m.id = x.modalidade_id
    ),
    'por_forma', (
      select coalesce(jsonb_agg(jsonb_build_object('forma', forma_pagamento, 'valor', total) order by total desc), '[]'::jsonb)
      from (select forma_pagamento, sum(valor) total from rec where pago_em between v_ini and v_fim group by 1) x
    )
  ) into r;
  return r;
end $$;

-- ---------------------------------------------------------------------
-- Estatísticas de pacientes
-- ---------------------------------------------------------------------
create or replace function public.fn_estatisticas(p_ini date, p_fim date, p_modalidade text default null)
returns jsonb language plpgsql stable as $$
declare r jsonb;
begin
  with
  atend as (
    select a.paciente_id, m.slug, (a.inicio at time zone 'America/Sao_Paulo')::date as data,
           a.status, a.servico_id,
           extract(hour from a.inicio at time zone 'America/Sao_Paulo')::int as hora,
           extract(dow from a.inicio at time zone 'America/Sao_Paulo')::int as dow,
           null::integer as turma_id
    from public.agendamentos a
    join public.servicos s on s.id = a.servico_id
    join public.modalidades m on m.id = s.modalidade_id
    where (a.inicio at time zone 'America/Sao_Paulo')::date between p_ini and p_fim
      and a.status <> 'cancelado'
    union all
    select p.paciente_id, 'pilates', au.data,
           case p.status when 'presente' then 'realizado' when 'previsto' then 'agendado' else 'faltou' end,
           t.servico_id, extract(hour from t.hora)::int, t.dia_semana::int, t.id
    from public.presencas p
    join public.aulas au on au.id = p.aula_id
    join public.turmas t on t.id = au.turma_id
    where au.data between p_ini and p_fim
  ),
  f as (select * from atend where p_modalidade is null or slug = p_modalidade),
  pac as (
    select pa.*, date_part('year', age(p_fim, pa.nascimento))::int as idade
    from public.pacientes pa
    where pa.id in (select paciente_id from f)
  ),
  ultima as (
    select paciente_id, max(data) as ultima_data from (
      select a.paciente_id, (a.inicio at time zone 'America/Sao_Paulo')::date data
      from public.agendamentos a where a.status = 'realizado'
      union all
      select p.paciente_id, au.data from public.presencas p join public.aulas au on au.id = p.aula_id
      where p.status = 'presente'
    ) x group by 1
  ),
  hist as (
    select distinct a.paciente_id, m.slug
    from public.agendamentos a join public.servicos s on s.id = a.servico_id join public.modalidades m on m.id = s.modalidade_id
    union
    select distinct m.paciente_id, 'pilates' from public.matriculas m
  ),
  pagos as (
    select r.paciente_id, m.slug, r.valor
    from public.recebimentos r left join public.modalidades m on m.id = r.modalidade_id
    where r.status = 'pago' and r.pago_em between p_ini and p_fim
      and (p_modalidade is null or m.slug = p_modalidade)
  )
  select jsonb_build_object(
    'resumo', jsonb_build_object(
      'pacientes_atendidos', (select count(*) from pac),
      'novos', (select count(*) from pac where criado_em::date between p_ini and p_fim),
      'sessoes_realizadas', (select count(*) from f where status = 'realizado'),
      'faltas', (select count(*) from f where status = 'faltou'),
      'taxa_faltas', (select round(100.0 * count(*) filter (where status = 'faltou')
                              / nullif(count(*) filter (where status in ('realizado','faltou')), 0), 1) from f),
      'ticket_medio', (select round(sum(valor) / nullif(count(distinct paciente_id), 0), 2) from pagos),
      'receita', (select coalesce(sum(valor), 0) from pagos)
    ),
    'faixa_etaria', (
      select jsonb_agg(jsonb_build_object('faixa', faixa, 'total', total) order by ordem) from (
        select v.faixa, v.ordem, (select count(*) from pac where
          case v.ordem when 1 then idade <= 17 when 2 then idade between 18 and 29 when 3 then idade between 30 and 44
                       when 4 then idade between 45 and 59 else idade >= 60 end) total
        from (values ('Até 17',1),('18 a 29',2),('30 a 44',3),('45 a 59',4),('60+',5)) v(faixa, ordem)
      ) x
    ),
    'sexo', (select coalesce(jsonb_agg(jsonb_build_object('sexo', case sexo when 'F' then 'Feminino' when 'M' then 'Masculino' else 'Outro' end, 'total', total)), '[]'::jsonb)
             from (select sexo, count(*) total from pac group by 1 order by 2 desc) x),
    'bairros', (select coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'total', total)), '[]'::jsonb)
                from (select coalesce(bairro, 'Não informado') nome, count(*) total from pac where cidade = 'Lapa' group by 1 order by 2 desc limit 10) x),
    'cidades', (select coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'total', total)), '[]'::jsonb)
                from (select coalesce(cidade, 'Não informada') nome, count(*) total from pac group by 1 order by 2 desc limit 8) x),
    'profissoes', (select coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'total', total)), '[]'::jsonb)
                   from (select coalesce(profissao, 'Não informada') nome, count(*) total from pac group by 1 order by 2 desc limit 10) x),
    'origem', (select coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'total', total)), '[]'::jsonb)
               from (select coalesce(origem, 'Não informada') nome, count(*) total from pac group by 1 order by 2 desc) x),
    'novos_por_mes', (
      select jsonb_agg(jsonb_build_object('mes', to_char(mes, 'MM/YY'), 'total', total) order by mes) from (
        select mes, (select count(*) from public.pacientes pa
                     where date_trunc('month', pa.criado_em at time zone 'America/Sao_Paulo') = mes
                       and (p_modalidade is null or pa.id in (select paciente_id from hist where slug = p_modalidade))
                    ) total
        from generate_series(date_trunc('month', p_fim) - interval '11 months', date_trunc('month', p_fim), interval '1 month') mes
      ) x
    ),
    'ativos_por_modalidade', (
      select coalesce(jsonb_agg(jsonb_build_object('modalidade', m.nome, 'cor', m.cor, 'total', coalesce(x.total, 0)) order by m.id), '[]'::jsonb)
      from public.modalidades m
      left join (select slug, count(distinct paciente_id) total from atend where status = 'realizado' group by 1) x on x.slug = m.slug
    ),
    'servicos', (select coalesce(jsonb_agg(jsonb_build_object('nome', s.nome, 'total', x.total) order by x.total desc), '[]'::jsonb)
                 from (select servico_id, count(*) total from f where status in ('realizado','agendado') group by 1 order by 2 desc limit 8) x
                 join public.servicos s on s.id = x.servico_id),
    'horarios', (select coalesce(jsonb_agg(jsonb_build_object('hora', lpad(hora::text, 2, '0') || 'h', 'total', total) order by hora), '[]'::jsonb)
                 from (select hora, count(*) total from f where status <> 'faltou' group by 1) x),
    'dias_semana', (select coalesce(jsonb_agg(jsonb_build_object('dia', (array['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'])[dow + 1], 'total', total) order by dow), '[]'::jsonb)
                    from (select dow, count(*) total from f where status <> 'faltou' group by 1) x),
    'ocupacao_turmas', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'turma', (array['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'])[o.dia_semana + 1] || ' ' || to_char(o.hora, 'HH24:MI') || ' · ' || o.servico_nome,
        'vagas', o.vagas, 'alunos', o.alunos_fixos,
        'ocupacao', round(100.0 * o.alunos_fixos / o.vagas))
        order by o.dia_semana, o.hora, o.servico_nome), '[]'::jsonb)
      from public.vw_ocupacao_turmas o
    ),
    'retencao', jsonb_build_object(
      'renovacoes', (select count(*) from public.renovacoes where data between p_ini and p_fim),
      'cancelamentos', (select count(*) from public.matriculas where cancelado_em between p_ini and p_fim),
      'vencidas_sem_renovar', (select count(*) from public.matriculas where status = 'vencido' and vencimento between p_ini and p_fim),
      'ativas', (select count(*) from public.matriculas where status = 'ativo'),
      'pausadas', (select count(*) from public.matriculas where status = 'pausado')
    ),
    'inativos', (
      select coalesce(jsonb_agg(jsonb_build_object('id', pa.id, 'nome', pa.nome, 'telefone', pa.telefone,
                                                   'ultima', u.ultima_data, 'dias', current_date - u.ultima_data)
                                order by u.ultima_data desc), '[]'::jsonb)
      from ultima u join public.pacientes pa on pa.id = u.paciente_id
      where u.ultima_data < current_date - 60
        and not exists (select 1 from public.agendamentos a where a.paciente_id = pa.id and a.inicio >= now() and a.status in ('agendado','confirmado'))
        and not exists (select 1 from public.matriculas m where m.paciente_id = pa.id and m.status = 'ativo')
        and (p_modalidade is null or pa.id in (select paciente_id from atend where slug = p_modalidade))
    ),
    'faltas_turmas', (
      select coalesce(jsonb_agg(jsonb_build_object('turma', nome, 'taxa', taxa, 'faltas', faltas) order by taxa desc), '[]'::jsonb) from (
        select (array['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'])[t.dia_semana + 1] || ' ' || to_char(t.hora, 'HH24:MI') || ' · ' || s.nome as nome,
               count(*) filter (where f.status = 'faltou') faltas,
               round(100.0 * count(*) filter (where f.status = 'faltou') / nullif(count(*) filter (where f.status in ('realizado','faltou')), 0), 1) taxa
        from f join public.turmas t on t.id = f.turma_id join public.servicos s on s.id = t.servico_id
        group by t.id, t.dia_semana, t.hora, s.nome
        having count(*) filter (where f.status in ('realizado','faltou')) > 0
        order by taxa desc limit 10
      ) x
    ),
    'faltas_pacientes', (
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'faltas', faltas, 'taxa', taxa) order by faltas desc, taxa desc), '[]'::jsonb) from (
        select pa.id, pa.nome, count(*) filter (where f.status = 'faltou') faltas,
               round(100.0 * count(*) filter (where f.status = 'faltou') / nullif(count(*) filter (where f.status in ('realizado','faltou')), 0), 1) taxa
        from f join public.pacientes pa on pa.id = f.paciente_id
        group by pa.id, pa.nome
        having count(*) filter (where f.status = 'faltou') >= 2
        order by faltas desc limit 10
      ) x
    ),
    'ticket_modalidade', (
      select coalesce(jsonb_agg(jsonb_build_object('modalidade', m.nome, 'cor', m.cor, 'ticket', x.ticket, 'receita', x.receita) order by m.id), '[]'::jsonb)
      from (select slug, round(sum(valor) / nullif(count(distinct paciente_id), 0), 2) ticket, sum(valor) receita from pagos group by 1) x
      join public.modalidades m on m.slug = x.slug
    )
  ) into r;
  return r;
end $$;


-- >>> 20261019000004_dados_demo.sql
-- FisioCenter Lapa · Gerador de dados fictícios para a demonstração
--
-- select public.seed_demo();
--
-- Apaga os dados da clínica (não apaga usuários) e recria: catálogo de serviços e preços,
-- profissionais, salas, grade de Pilates, planos, ~120 pacientes, 3 meses de histórico
-- de agenda e caixa e as próximas 3 semanas de agenda. As datas são sempre relativas ao dia
-- em que a função roda, então dá para "renovar" a demo quando quiser.
-- Todos os nomes de pacientes e profissionais são fictícios.

create or replace function public._r(a integer, b integer)
returns integer language sql volatile as $$
  select a + floor(random() * (b - a + 1))::integer
$$;

create or replace function public._pick(arr text[])
returns text language sql volatile as $$
  select arr[1 + floor(random() * array_length(arr, 1))::integer]
$$;

create or replace function public._cpf()
returns text language plpgsql volatile as $$
declare
  d integer[] := array[]::integer[];
  s integer;
  i integer;
begin
  for i in 1..9 loop d := d || floor(random() * 10)::integer; end loop;
  s := 0; for i in 1..9 loop s := s + d[i] * (11 - i); end loop;
  d := d || case when s % 11 < 2 then 0 else 11 - s % 11 end;
  s := 0; for i in 1..10 loop s := s + d[i] * (12 - i); end loop;
  d := d || case when s % 11 < 2 then 0 else 11 - s % 11 end;
  return format('%s%s%s.%s%s%s.%s%s%s-%s%s', d[1], d[2], d[3], d[4], d[5], d[6], d[7], d[8], d[9], d[10], d[11]);
end $$;

create or replace function public._forma()
returns text language sql volatile as $$
  select public._pick(array['pix','pix','pix','pix','pix','cartao_debito','cartao_debito','cartao_credito','cartao_credito','dinheiro'])
$$;

-- Tenta criar um agendamento no horário pedido; se houver conflito, tenta horários vizinhos.
create or replace function public._seed_ag(
  p_pac uuid, p_prof uuid, p_sala smallint, p_serv integer, p_pacote uuid,
  p_dia date, p_hora integer, p_end text default null
) returns uuid language plpgsql as $$
declare
  v_id uuid;
  v_dur integer;
  v_ini timestamptz;
  v_status text;
  v_r double precision;
  h integer;
  o integer;
begin
  select duracao_min into v_dur from public.servicos where id = p_serv;
  foreach o in array array[0, 1, -1, 2, -2, 3] loop
    h := p_hora + o;
    continue when h < 7 or h > 18 or h = 12;
    v_ini := (p_dia + make_time(h, 0, 0)) at time zone 'America/Sao_Paulo';
    v_r := random();
    if v_ini + make_interval(mins => v_dur) < now() then
      v_status := case when v_r < 0.87 then 'realizado' when v_r < 0.94 then 'faltou' else 'cancelado' end;
    elsif v_ini < now() + interval '2 days' then
      v_status := case when v_r < 0.65 then 'confirmado' else 'agendado' end;
    else
      v_status := 'agendado';
    end if;
    begin
      insert into public.agendamentos (paciente_id, profissional_id, sala_id, servico_id, pacote_id,
                                       inicio, fim, status, endereco_domiciliar)
      values (p_pac, p_prof, p_sala, p_serv, p_pacote, v_ini, v_ini + make_interval(mins => v_dur), v_status, p_end)
      returning id into v_id;
      return v_id;
    exception when exclusion_violation then
      null;
    end;
  end loop;
  return null;
end $$;

create or replace function public.seed_demo()
returns text language plpgsql security definer set search_path = public, extensions as $$
declare
  -- nomes
  f_nomes text[] := array['Ana','Maria','Juliana','Fernanda','Patrícia','Aline','Camila','Larissa','Gabriela','Luciana',
    'Mariana','Beatriz','Carla','Daniela','Elaine','Franciele','Gisele','Heloísa','Isabela','Jéssica','Kátia','Letícia',
    'Marcia','Natália','Paula','Rosana','Sandra','Tatiane','Vanessa','Viviane','Adriana','Cristiane','Débora','Eliane',
    'Simone','Rita','Terezinha','Lurdes','Ivone','Sueli','Rafaela','Bruna','Amanda','Thaís','Lorena','Cecília'];
  m_nomes text[] := array['João','José','Carlos','Paulo','Pedro','Lucas','Marcos','Rafael','Rodrigo','Fernando',
    'André','Bruno','Diego','Eduardo','Felipe','Gustavo','Henrique','Leandro','Luiz','Mateus','Ricardo','Sérgio',
    'Thiago','Vinícius','Antônio','Valdir','Osmar','Jair','Alceu','Moacir','Gabriel','Daniel','Samuel'];
  sobrenomes text[] := array['Silva','Santos','Oliveira','Souza','Pereira','Costa','Ferreira','Rodrigues','Almeida',
    'Lima','Carvalho','Ribeiro','Martins','Rocha','Gomes','Nowak','Wisniewski','Kaminski','Szymanski','Lewandowski',
    'Mazur','Dziedzic','Bortolini','Zanella','Bueno','Maia','Machado','Cordeiro','Pires','Camargo','Bittencourt',
    'Mendes','Teixeira','Moraes','Schmidt','Müller','Vieira','Prestes','Taborda','Padilha','Kuss','Andreatta','Chaves'];
  bairros text[] := array['Centro','Centro','Centro','Vila do Príncipe','Vila do Príncipe','Jardim Cidade Nova',
    'Vila São José','Jardim Mônica','Vila Nova','Bela Vista','Parque Industrial','São Vicente','Jardim Planalto',
    'Vila Esperança','Água Azul'];
  cidades text[] := array['Lapa','Lapa','Lapa','Lapa','Lapa','Lapa','Lapa','Lapa','Lapa','Lapa','Lapa','Lapa',
    'Balsa Nova','Contenda','Porto Amazonas','Campo do Tenente','Antônio Olinto','Quitandinha'];
  ruas text[] := array['Rua Barão do Rio Branco','Rua XV de Novembro','Rua Mal. Floriano Peixoto','Av. Manoel Pedro',
    'Rua Cel. Joaquim Lacerda','Rua Dr. Manoel Pedro','Rua Pe. Antônio Loss','Rua Antônio Lacerda Braga',
    'Rua Visconde do Rio Branco','Rua Francisco Cunha','Rua Henrique Dias','Rua Luiz Tadeu'];
  profissoes text[] := array['Professor(a)','Professor(a)','Aposentado(a)','Aposentado(a)','Aposentado(a)','Comerciante',
    'Agricultor(a)','Agricultor(a)','Servidor(a) público(a)','Servidor(a) público(a)','Estudante','Estudante',
    'Enfermeiro(a)','Motorista','Do lar','Administrador(a)','Vendedor(a)','Costureira','Pedreiro','Engenheiro(a)',
    'Advogado(a)','Contador(a)','Técnico(a) de enfermagem','Cabeleireira','Bancário(a)','Policial'];
  origens text[] := array['Instagram','Instagram','Instagram','Indicação de amigo','Indicação de amigo','Indicação de amigo',
    'Indicação médica','Indicação médica','Google','Google','Facebook','Passou em frente','Convênio'];
  convenios text[] := array['Unimed','Unimed','Clinipam','SulAmérica','Paraná Clínicas'];

  -- ids
  pr_camila uuid; pr_rafael uuid; pr_juliana uuid; pr_bianca uuid;
  s_consult1 smallint; s_consult2 smallint; s_rpg smallint; s_apar smallint; s_solo smallint; s_susp smallint; s_estet smallint;
  m_fisio smallint; m_pilates smallint; m_estet smallint; m_dom smallint;

  v_pac uuid[] := array[]::uuid[];
  v_id uuid; v_pacote uuid; v_ag uuid; v_mat uuid; v_turma integer; v_plano record; v_a record; v_f record;
  i integer; j integer; k integer; n integer; h integer;
  v_sexo text; v_nome text; v_idade integer; v_cidade text; v_conv text; v_criado timestamptz;
  v_dia date; v_ini date; v_venc date; v_dias integer[]; v_prof uuid; v_sala smallint; v_serv integer; v_preco numeric;
  v_status text; v_inicio timestamptz; v_r double precision; v_horas integer[]; v_end text;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_hist date := (now() at time zone 'America/Sao_Paulo')::date - 92;
  v_futuro date := (now() at time zone 'America/Sao_Paulo')::date + 21;
  v_mes date;
  v_cat record;
begin
  perform setseed(0.1995);

  -- Limpa os dados da clínica (usuários e perfis ficam)
  update public.perfis set profissional_id = null;
  truncate public.presencas, public.aulas, public.matricula_turmas, public.renovacoes, public.recebimentos,
           public.agendamentos, public.pacotes, public.matriculas, public.turmas, public.planos,
           public.despesas, public.categorias_desp, public.pacientes, public.servicos, public.salas,
           public.modalidades restart identity cascade;
  delete from public.profissionais;

  -- -------------------------------------------------------------------
  -- Catálogo
  -- -------------------------------------------------------------------
  insert into public.modalidades (slug, nome, cor) values ('fisioterapia', 'Fisioterapia', '#607E36') returning id into m_fisio;
  insert into public.modalidades (slug, nome, cor) values ('pilates', 'Pilates', '#96A27E') returning id into m_pilates;
  insert into public.modalidades (slug, nome, cor) values ('estetica', 'Estética', '#C49A6C') returning id into m_estet;
  insert into public.modalidades (slug, nome, cor) values ('domiciliar', 'Domiciliar', '#5E7C8A') returning id into m_dom;

  insert into public.profissionais (nome, crefito, especialidade, cor_agenda, comissao_pct, telefone)
    values ('Camila Andrade', 'CREFITO-8 128.430-F', 'Ortopedia, RPG e Pilates', '#607E36', 40, '(41) 99812-4471') returning id into pr_camila;
  insert into public.profissionais (nome, crefito, especialidade, cor_agenda, comissao_pct, telefone)
    values ('Rafael Moreira', 'CREFITO-8 141.902-F', 'Acupuntura, ventosaterapia e atendimento domiciliar', '#8A6D3B', 50, '(41) 99733-1208') returning id into pr_rafael;
  insert into public.profissionais (nome, crefito, especialidade, cor_agenda, comissao_pct, telefone)
    values ('Juliana Kowalski', 'CREFITO-8 156.377-F', 'Pilates e reabilitação', '#4F7C74', 40, '(41) 99651-9034') returning id into pr_juliana;
  insert into public.profissionais (nome, crefito, especialidade, cor_agenda, comissao_pct, telefone)
    values ('Bianca Wolff', null, 'Estética e depilação a laser', '#B07A5B', 35, '(41) 99920-5512') returning id into pr_bianca;

  insert into public.salas (nome, tipo, capacidade) values ('Consultório 1', 'consultorio', 1) returning id into s_consult1;
  insert into public.salas (nome, tipo, capacidade) values ('Consultório 2', 'consultorio', 1) returning id into s_consult2;
  insert into public.salas (nome, tipo, capacidade) values ('Sala de RPG', 'consultorio', 1) returning id into s_rpg;
  insert into public.salas (nome, tipo, capacidade) values ('Studio Pilates · Aparelhos', 'pilates', 4) returning id into s_apar;
  insert into public.salas (nome, tipo, capacidade) values ('Studio Pilates · Solo', 'pilates', 6) returning id into s_solo;
  insert into public.salas (nome, tipo, capacidade) values ('Sala Suspensus', 'pilates', 3) returning id into s_susp;
  insert into public.salas (nome, tipo, capacidade) values ('Sala de Estética', 'estetica', 1) returning id into s_estet;

  -- ids fixos (restart identity): 1..8 fisio, 9..12 pilates, 13..18 estética, 19..20 domiciliar
  insert into public.servicos (modalidade_id, nome, duracao_min, preco) values
    (m_fisio, 'Avaliação fisioterapêutica', 60, 120),
    (m_fisio, 'Sessão de fisioterapia', 50, 90),
    (m_fisio, 'RPG', 60, 120),
    (m_fisio, 'Acupuntura', 50, 110),
    (m_fisio, 'Ventosaterapia', 40, 80),
    (m_fisio, 'Bandagem neuromuscular', 30, 60),
    (m_fisio, 'Microfisioterapia', 60, 180),
    (m_fisio, 'Aromaterapia', 40, 80),
    (m_pilates, 'Pilates Aparelhos', 50, 70),
    (m_pilates, 'Pilates Solo', 50, 50),
    (m_pilates, 'Pilates Suspensus', 50, 60),
    (m_pilates, 'Aula experimental de Pilates', 50, 0),
    (m_estet, 'Depilação a laser · Axilas', 20, 120),
    (m_estet, 'Depilação a laser · Buço', 15, 80),
    (m_estet, 'Depilação a laser · Pernas completas', 60, 380),
    (m_estet, 'Depilação a laser · Virilha', 30, 180),
    (m_estet, 'Limpeza de pele', 60, 150),
    (m_estet, 'Drenagem linfática', 60, 130),
    (m_dom, 'Fisioterapia domiciliar', 60, 150),
    (m_dom, 'Avaliação domiciliar', 60, 180);

  -- Planos de Pilates (valores típicos da região de Curitiba/Lapa em 2026)
  insert into public.planos (modalidade_id, servico_id, nome, aulas_semana, periodicidade, preco_mensal, desconto_pct)
  select m_pilates, x.serv, x.tipo || ' ' || x.aulas || 'x/semana · ' || initcap(p.per), x.aulas, p.per,
         round(x.base * (1 - p.dsc / 100.0)), p.dsc
  from (values (9, 'Aparelhos', 1, 200), (9, 'Aparelhos', 2, 300), (9, 'Aparelhos', 3, 390),
               (10, 'Solo', 1, 150), (10, 'Solo', 2, 220),
               (11, 'Suspensus', 1, 170), (11, 'Suspensus', 2, 260)) x(serv, tipo, aulas, base)
  cross join (values ('mensal', 0, 1), ('trimestral', 5, 2), ('semestral', 10, 3), ('anual', 15, 4)) p(per, dsc, ordem)
  where x.tipo = 'Aparelhos' or (x.tipo = 'Solo' and p.ordem <= 3) or (x.tipo = 'Suspensus' and p.ordem <= 2)
  order by x.serv, x.aulas, p.ordem;

  -- Grade de turmas
  insert into public.turmas (servico_id, profissional_id, sala_id, dia_semana, hora, duracao_min, vagas)
  select 9, pr_juliana, s_apar, d, make_time(hh, 0, 0), 50, 4
  from generate_series(1, 5) d, unnest(array[7, 8, 9, 16, 17, 18, 19]) hh;
  insert into public.turmas (servico_id, profissional_id, sala_id, dia_semana, hora, duracao_min, vagas)
  select 9, pr_juliana, s_apar, 6, make_time(hh, 0, 0), 50, 4 from unnest(array[8, 9, 10]) hh;
  insert into public.turmas (servico_id, profissional_id, sala_id, dia_semana, hora, duracao_min, vagas) values
    (10, pr_camila, s_solo, 2, '12:00', 50, 6), (10, pr_camila, s_solo, 4, '12:00', 50, 6),
    (10, pr_camila, s_solo, 6, '09:00', 50, 6), (10, pr_camila, s_solo, 6, '10:00', 50, 6),
    (11, pr_camila, s_susp, 1, '19:00', 50, 3), (11, pr_camila, s_susp, 3, '19:00', 50, 3),
    (11, pr_camila, s_susp, 2, '07:00', 50, 3), (11, pr_camila, s_susp, 4, '07:00', 50, 3);

  insert into public.categorias_desp (nome) values
    ('Aluguel'), ('Salários e encargos'), ('Energia elétrica'), ('Água'), ('Internet e telefone'),
    ('Materiais e descartáveis'), ('Manutenção de equipamentos'), ('Marketing'), ('Contabilidade'),
    ('Limpeza'), ('Impostos'), ('Outros');

  -- -------------------------------------------------------------------
  -- Pacientes
  --   1..68   alunos de Pilates (1..14 e 50..68 também fizeram fisioterapia)
  --   50..104 fisioterapia
  --   97..120 estética
  --   105..109 atendimento domiciliar
  -- -------------------------------------------------------------------
  for i in 1..120 loop
    if i between 97 and 120 and i not between 105 and 109 then
      v_sexo := case when random() < 0.9 then 'F' else 'M' end;
      v_idade := _r(19, 52);
    elsif i between 105 and 109 then
      v_sexo := case when random() < 0.6 then 'F' else 'M' end;
      v_idade := _r(68, 91);
    elsif i <= 68 then
      v_sexo := case when random() < 0.8 then 'F' else 'M' end;
      v_idade := case when random() < 0.15 then _r(60, 74) else _r(22, 59) end;
    else
      v_sexo := case when random() < 0.56 then 'F' else 'M' end;
      v_idade := case when random() < 0.08 then _r(13, 17) when random() < 0.25 then _r(60, 82) else _r(18, 59) end;
    end if;

    v_nome := case when v_sexo = 'F' then _pick(f_nomes) else _pick(m_nomes) end
              || ' ' || _pick(sobrenomes) || ' ' || _pick(sobrenomes);
    v_cidade := _pick(cidades);
    v_conv := case when i > 68 and i < 105 and random() < 0.3 then _pick(convenios)
                   when random() < 0.08 then _pick(convenios) else null end;
    -- pacientes antigos (a clínica existe desde 1995) e novos dos últimos meses
    v_criado := case when random() < 0.45
                  then now() - make_interval(days => _r(1, 92))
                  else now() - make_interval(days => _r(93, 2200)) end;

    insert into public.pacientes (nome, cpf, telefone, email, nascimento, sexo, cidade, bairro, endereco,
                                  profissao, origem, convenio, obs, criado_em)
    values (
      v_nome, _cpf(),
      format('(41) 9%s-%s', lpad(_r(8100, 9999)::text, 4, '0'), lpad(_r(0, 9999)::text, 4, '0')),
      case when random() < 0.6 then lower(translate(split_part(v_nome, ' ', 1) || '.' || split_part(v_nome, ' ', 2),
             'áàâãéêíóôõúüçÁÉÍÓÚ', 'aaaaeeiooouucAEIOU')) || _r(1, 99) || '@gmail.com' end,
      (v_hoje - make_interval(years => v_idade, days => _r(0, 364)))::date,
      v_sexo, v_cidade,
      case when v_cidade = 'Lapa' then _pick(bairros) else 'Centro' end,
      _pick(ruas) || ', ' || _r(12, 1890),
      case when v_idade < 18 then 'Estudante' when v_idade >= 65 then 'Aposentado(a)' else _pick(profissoes) end,
      case when v_conv is not null and random() < 0.4 then 'Convênio' else _pick(origens) end,
      v_conv,
      case _r(1, 12) when 1 then 'Hipertensa(o), controlar PA antes da sessão.' when 2 then 'Hérnia de disco L4-L5.'
                     when 3 then 'Pós-operatório de LCA (joelho direito).' when 4 then 'Prefere horários no fim da tarde.'
                     when 5 then 'Gestante, liberada pelo obstetra.' else null end,
      v_criado
    ) returning id into v_id;
    v_pac := v_pac || v_id;
  end loop;

  -- -------------------------------------------------------------------
  -- Fisioterapia: avaliação + pacote de 10 sessões, 2x por semana
  -- -------------------------------------------------------------------
  for i in 1..104 loop
    continue when i > 14 and i < 50;

    v_r := random();
    if v_r < 0.55 then
      v_prof := pr_camila; v_horas := array[8, 9, 10, 11, 13, 14, 15, 16, 17];
      v_serv := case when random() < 0.3 then 3 else 2 end;
      v_sala := case when v_serv = 3 then s_rpg else s_consult1 end;
    elsif v_r < 0.85 then
      v_prof := pr_rafael; v_horas := array[9, 10, 11, 13, 14, 15, 16];
      v_serv := case when random() < 0.35 then 4 when random() < 0.3 then 5 else 2 end;
      v_sala := s_consult2;
    else
      v_prof := pr_juliana; v_horas := array[11, 13, 14];
      v_serv := 2; v_sala := s_rpg;
    end if;

    select convenio into v_conv from public.pacientes where id = v_pac[i];
    -- alguns tratamentos terminaram há mais de 2 meses (pacientes para reativar)
    v_ini := case when random() < 0.25 then v_hist - 35 + _r(0, 15) else v_hist - 10 + _r(0, 110) end;
    while extract(dow from v_ini) in (0, 6) loop v_ini := v_ini + 1; end loop;
    v_dias := case _r(1, 3) when 1 then array[1, 3] when 2 then array[2, 4] else array[3, 5] end;
    h := v_horas[_r(1, array_length(v_horas, 1))];

    -- quem chegou nos últimos meses foi cadastrado na avaliação
    update public.pacientes set criado_em = case when criado_em > now() - interval '92 days'
                                                 then (v_ini - _r(0, 3))::timestamp at time zone 'America/Sao_Paulo'
                                                 else least(criado_em, (v_ini - _r(0, 3))::timestamp at time zone 'America/Sao_Paulo') end
    where id = v_pac[i];

    -- avaliação
    v_ag := _seed_ag(v_pac[i], v_prof, v_sala, 1, null, v_ini, h);
    if v_ag is not null then
      select status, (inicio at time zone 'America/Sao_Paulo')::date as dia into v_a from public.agendamentos where id = v_ag;
      if v_a.status = 'realizado' then
        insert into public.recebimentos (paciente_id, agendamento_id, profissional_id, modalidade_id, descricao, valor,
                                         vencimento, pago_em, forma_pagamento, status)
        values (v_pac[i], v_ag, v_prof, m_fisio, 'Avaliação fisioterapêutica', 120, v_a.dia, v_a.dia, _forma(), 'pago');
      end if;
    end if;

    select preco into v_preco from public.servicos where id = v_serv;
    v_pacote := null;
    if v_conv is null then
      insert into public.pacotes (paciente_id, servico_id, total_sessoes, valor_total, validade, criado_em)
      values (v_pac[i], v_serv, 10, round(v_preco * 10 * 0.9), v_ini + 90, v_ini::timestamp at time zone 'America/Sao_Paulo')
      returning id into v_pacote;
      -- pacote em 2x: entrada no início e a outra parcela em 30 dias
      insert into public.recebimentos (paciente_id, pacote_id, profissional_id, modalidade_id, descricao, valor, vencimento, pago_em, forma_pagamento, status)
      values (v_pac[i], v_pacote, v_prof, m_fisio, 'Pacote 10 sessões · ' || (select nome from public.servicos where id = v_serv) || ' (1/2)',
              round(v_preco * 10 * 0.9 / 2), v_ini,
              case when v_ini <= v_hoje then v_ini end, case when v_ini <= v_hoje then _forma() end,
              case when v_ini <= v_hoje then 'pago' else 'aberto' end);
      v_venc := v_ini + 30;
      v_r := random();
      insert into public.recebimentos (paciente_id, pacote_id, profissional_id, modalidade_id, descricao, valor, vencimento, pago_em, forma_pagamento, status)
      values (v_pac[i], v_pacote, v_prof, m_fisio, 'Pacote 10 sessões · ' || (select nome from public.servicos where id = v_serv) || ' (2/2)',
              round(v_preco * 10 * 0.9 / 2), v_venc,
              case when v_venc < v_hoje and v_r < 0.88 then v_venc + _r(-2, 4) end,
              case when v_venc < v_hoje and v_r < 0.88 then _forma() end,
              case when v_venc < v_hoje and v_r < 0.88 then 'pago' else 'aberto' end);
    end if;

    v_dia := v_ini; n := 0;
    while n < 10 loop
      v_dia := v_dia + 1;
      exit when v_dia > v_futuro;
      continue when not (extract(dow from v_dia)::integer = any (v_dias));
      n := n + 1;
      v_ag := _seed_ag(v_pac[i], v_prof, v_sala, v_serv, v_pacote, v_dia, h);
      continue when v_ag is null or v_conv is null;
      select status, (inicio at time zone 'America/Sao_Paulo')::date as dia into v_a from public.agendamentos where id = v_ag;
      if v_a.status = 'realizado' then
        -- convênio paga em ~30 dias
        insert into public.recebimentos (paciente_id, agendamento_id, profissional_id, modalidade_id, descricao, valor, vencimento, pago_em, forma_pagamento, status)
        values (v_pac[i], v_ag, v_prof, m_fisio, (select nome from public.servicos where id = v_serv) || ' · ' || v_conv,
                v_preco * 0.8, v_a.dia + 30,
                case when v_a.dia + 30 < v_hoje then v_a.dia + 30 end, 'convenio',
                case when v_a.dia + 30 < v_hoje then 'pago' else 'aberto' end);
      end if;
    end loop;
  end loop;

  -- Atendimentos avulsos (bandagem, microfisioterapia, aromaterapia, ventosa)
  for k in 1..40 loop
    i := _r(50, 104);
    v_serv := (array[6, 6, 7, 8, 5])[_r(1, 5)];
    v_prof := case when v_serv in (5, 8) then pr_rafael else pr_camila end;
    v_dia := v_hist + _r(0, 105);
    continue when extract(dow from v_dia) in (0, 6);
    v_ag := _seed_ag(v_pac[i], v_prof, case when v_prof = pr_rafael then s_consult2 else s_consult1 end, v_serv, null,
                     v_dia, (array[8, 10, 14, 16])[_r(1, 4)]);
    continue when v_ag is null;
    select status, (inicio at time zone 'America/Sao_Paulo')::date as dia into v_a from public.agendamentos where id = v_ag;
    if v_a.status = 'realizado' then
      insert into public.recebimentos (paciente_id, agendamento_id, profissional_id, modalidade_id, descricao, valor, vencimento, pago_em, forma_pagamento, status)
      select v_pac[i], v_ag, v_prof, m_fisio, s.nome, s.preco, v_a.dia, v_a.dia, _forma(), 'pago' from public.servicos s where s.id = v_serv;
    end if;
  end loop;

  -- -------------------------------------------------------------------
  -- Domiciliar: Rafael, 1 ou 2 vezes por semana, cedo ou no fim da tarde
  -- -------------------------------------------------------------------
  for i in 105..109 loop
    select bairro, endereco, cidade into v_f from public.pacientes where id = v_pac[i];
    v_end := v_f.endereco || ' · ' || v_f.bairro || ', ' || v_f.cidade;
    v_ini := v_hist + _r(0, 60);
    while extract(dow from v_ini) in (0, 6) loop v_ini := v_ini + 1; end loop;
    h := case when i % 2 = 0 then 8 else 17 end;
    v_dias := case when random() < 0.5 then array[2, 4] else array[case when i % 2 = 0 then 1 else 5 end] end;
    v_ag := _seed_ag(v_pac[i], pr_rafael, null, 20, null, v_ini, h, v_end);
    v_dia := v_ini;
    while v_dia < v_futuro loop
      v_dia := v_dia + 1;
      continue when not (extract(dow from v_dia)::integer = any (v_dias));
      v_ag := _seed_ag(v_pac[i], pr_rafael, null, 19, null, v_dia, h, v_end);
    end loop;
    -- cobrança por sessão realizada
    insert into public.recebimentos (paciente_id, agendamento_id, profissional_id, modalidade_id, descricao, valor, vencimento, pago_em, forma_pagamento, status)
    select a.paciente_id, a.id, a.profissional_id, m_dom, s.nome, s.preco, (a.inicio at time zone 'America/Sao_Paulo')::date,
           (a.inicio at time zone 'America/Sao_Paulo')::date, 'pix', 'pago'
    from public.agendamentos a join public.servicos s on s.id = a.servico_id
    where a.paciente_id = v_pac[i] and a.status = 'realizado';
  end loop;

  -- -------------------------------------------------------------------
  -- Estética: Bianca, depilação a laser a cada ~30 dias e limpeza/drenagem
  -- -------------------------------------------------------------------
  for i in 97..120 loop
    continue when i between 105 and 109;
    v_serv := (array[13, 13, 14, 15, 16, 16])[_r(1, 6)];
    v_dia := v_hist + _r(0, 25);
    h := (array[9, 10, 11, 13, 14, 15, 16, 17])[_r(1, 8)];
    -- parte das clientes fez poucas sessões e parou
    v_venc := case when random() < 0.3 then v_hist + 25 else v_futuro end;
    while v_dia < v_venc loop
      while extract(dow from v_dia) = 0 loop v_dia := v_dia + 1; end loop;
      v_ag := _seed_ag(v_pac[i], pr_bianca, s_estet, v_serv, null, v_dia, case when extract(dow from v_dia) = 6 then 9 else h end);
      if random() < 0.25 then
        v_ag := _seed_ag(v_pac[i], pr_bianca, s_estet, (array[17, 18])[_r(1, 2)], null, v_dia + 7, h);
      end if;
      v_dia := v_dia + _r(28, 35);
    end loop;
    update public.pacientes set criado_em = least(criado_em, (v_hist + _r(-200, 20))::timestamp at time zone 'America/Sao_Paulo')
    where id = v_pac[i];
  end loop;
  insert into public.recebimentos (paciente_id, agendamento_id, profissional_id, modalidade_id, descricao, valor, vencimento, pago_em, forma_pagamento, status)
  select a.paciente_id, a.id, a.profissional_id, m_estet, s.nome, s.preco, (a.inicio at time zone 'America/Sao_Paulo')::date,
         (a.inicio at time zone 'America/Sao_Paulo')::date,
         public._pick(array['pix','pix','cartao_credito','cartao_credito','cartao_debito']), 'pago'
  from public.agendamentos a join public.servicos s on s.id = a.servico_id
  where s.modalidade_id = m_estet and a.status = 'realizado';

  -- -------------------------------------------------------------------
  -- Pilates: matrículas, horários fixos, renovações, aulas e presenças
  -- -------------------------------------------------------------------
  for i in 1..68 loop
    v_r := random();
    select * into v_plano from public.planos p
    where p.servico_id = case when v_r < 0.72 then 9 when v_r < 0.9 then 10 else 11 end
      and p.aulas_semana = case
            when v_r < 0.72 then (array[1, 2, 2, 2, 2, 3])[_r(1, 6)]
            when v_r < 0.9 then (array[1, 2, 2])[_r(1, 3)]
            else (array[1, 2, 2])[_r(1, 3)] end
      and p.periodicidade = (array['mensal','mensal','mensal','mensal','mensal','trimestral','trimestral','trimestral','semestral','semestral','anual'])[_r(1, 11)]
    limit 1;
    if v_plano.id is null then
      select * into v_plano from public.planos p where p.servico_id = 9 and p.aulas_semana = 2 and p.periodicidade = 'mensal';
    end if;

    -- início: alunos antigos e novos dos últimos 3 meses
    v_ini := case when random() < 0.45 then v_hist - _r(10, 400) else v_hist + _r(0, 88) end;
    v_venc := (v_ini + make_interval(months => public.meses_periodicidade(v_plano.periodicidade)))::date;
    insert into public.matriculas (paciente_id, plano_id, inicio, vencimento, dia_vencimento, status, criado_em)
    values (v_pac[i], v_plano.id, v_ini, v_venc, (array[5, 10, 10, 15, 20])[_r(1, 5)], 'ativo',
            v_ini::timestamp at time zone 'America/Sao_Paulo')
    returning id into v_mat;
    update public.pacientes set criado_em = least(criado_em, (v_ini - _r(0, 5))::timestamp at time zone 'America/Sao_Paulo'),
                                origem = case when random() < 0.4 then 'Instagram' else origem end
    where id = v_pac[i];

    -- desfechos: a maioria renova, alguns cancelam, vencem sem renovar ou pausam
    v_status := case when i % 15 = 3 then 'cancelado' when i % 20 = 7 then 'vencido' when i % 25 = 11 then 'pausado' else 'ativo' end;
    while v_venc < v_hoje + case when v_status = 'ativo' then 0 else -25 end loop
      insert into public.renovacoes (matricula_id, data, vencimento_anterior, novo_vencimento)
      values (v_mat, v_venc - _r(0, 4), v_venc, (v_venc + make_interval(months => public.meses_periodicidade(v_plano.periodicidade)))::date);
      v_venc := (v_venc + make_interval(months => public.meses_periodicidade(v_plano.periodicidade)))::date;
    end loop;
    if v_status = 'cancelado' then
      update public.matriculas set status = 'cancelado', cancelado_em = v_hoje - _r(5, 70),
                                   obs = _pick(array['Mudou de cidade.','Questões financeiras.','Horário não fecha com o trabalho.','Liberada pelo médico, vai seguir em academia.'])
      where id = v_mat;
      update public.matriculas set vencimento = greatest(cancelado_em, inicio + 1) where id = v_mat;
    elsif v_status = 'vencido' then
      update public.matriculas set status = 'vencido', vencimento = v_hoje - _r(3, 25) where id = v_mat;
    elsif v_status = 'pausado' then
      update public.matriculas set status = 'pausado', vencimento = v_venc, obs = 'Pausa por viagem / recuperação, volta no próximo mês.' where id = v_mat;
    else
      update public.matriculas set vencimento = v_venc where id = v_mat;
    end if;

    -- horários fixos
    v_dias := case v_plano.aulas_semana
                when 1 then array[_r(1, 5)]
                when 2 then (case _r(1, 4) when 1 then array[1, 3] when 2 then array[3, 5] else array[2, 4] end)
                else array[1, 3, 5] end;
    if v_plano.servico_id = 10 then
      v_dias := case when v_plano.aulas_semana = 1 then array[6] else array[2, 4] end;
    elsif v_plano.servico_id = 11 then
      v_dias := case when random() < 0.5 then array[1, 3] else array[2, 4] end;
      if v_plano.aulas_semana = 1 then v_dias := v_dias[1:1]; end if;
    end if;
    h := (array[7, 7, 8, 8, 9, 16, 17, 18, 18, 18, 19, 19])[_r(1, 12)];

    foreach j in array v_dias loop
      v_turma := null;
      -- procura uma turma com vaga no horário preferido; se lotada, tenta outros horários
      select t.id into v_turma
      from public.turmas t
      left join public.matricula_turmas mt on mt.turma_id = t.id
      left join public.matriculas m on m.id = mt.matricula_id and m.status in ('ativo','pausado')
      where t.servico_id = v_plano.servico_id and t.dia_semana = j
      group by t.id
      having count(m.id) < max(t.vagas)
      order by abs(extract(hour from max(t.hora)) - h), random()
      limit 1;
      if v_turma is not null then
        insert into public.matricula_turmas (matricula_id, turma_id) values (v_mat, v_turma) on conflict do nothing;
      end if;
    end loop;
  end loop;

  -- reposições disponíveis: começam zeradas e são calculadas pelas faltas
  update public.matriculas set reposicoes_disp = 0;

  -- aulas da grade (histórico + próximas 3 semanas) e presenças futuras dos fixos
  perform public.gerar_aulas(v_hist, v_futuro);

  -- presenças do histórico
  insert into public.presencas (aula_id, paciente_id, matricula_id, tipo, status)
  select a.id, m.paciente_id, m.id, 'fixo',
         case when random() < 0.88 then 'presente' when random() < 0.75 then 'falta' else 'justificada' end
  from public.aulas a
  join public.matricula_turmas mt on mt.turma_id = a.turma_id
  join public.matriculas m on m.id = mt.matricula_id
  where a.data < v_hoje
    and a.data >= m.inicio
    and a.data <= case when m.status = 'pausado' then v_hoje - 20 else coalesce(m.cancelado_em, m.vencimento) end
  on conflict do nothing;

  -- parte das faltas vira reposição em outra turma do mesmo tipo, com vaga, em até 14 dias
  for v_f in
    select p.paciente_id, p.matricula_id, a.data, t.servico_id
    from public.presencas p join public.aulas a on a.id = p.aula_id join public.turmas t on t.id = a.turma_id
    where p.status in ('falta','justificada') and a.data < v_hoje - 1
  loop
    continue when random() > 0.6;
    select a2.id into v_id
    from public.aulas a2 join public.turmas t2 on t2.id = a2.turma_id
    where t2.servico_id = v_f.servico_id and a2.data between v_f.data + 1 and least(v_f.data + 14, v_hoje - 1)
      and (select count(*) from public.presencas px where px.aula_id = a2.id) < t2.vagas
      and not exists (select 1 from public.presencas px where px.aula_id = a2.id and px.paciente_id = v_f.paciente_id)
    order by random() limit 1;
    if v_id is not null then
      insert into public.presencas (aula_id, paciente_id, matricula_id, tipo, status)
      values (v_id, v_f.paciente_id, v_f.matricula_id, 'reposicao', 'presente');
    end if;
  end loop;
  update public.matriculas set reposicoes_disp = least(reposicoes_disp, 2);

  -- mensalidades: dos últimos 3 meses até o mês atual
  for v_mes in select generate_series(date_trunc('month', v_hist), date_trunc('month', v_hoje), interval '1 month')::date loop
    insert into public.recebimentos (paciente_id, matricula_id, profissional_id, modalidade_id, descricao, valor, vencimento, pago_em, forma_pagamento, status)
    select m.paciente_id, m.id,
           (select t.profissional_id from public.matricula_turmas mt join public.turmas t on t.id = mt.turma_id where mt.matricula_id = m.id limit 1),
           m_pilates, 'Mensalidade ' || p.nome || ' · ' || to_char(v_mes, 'MM/YYYY'), p.preco_mensal,
           make_date(extract(year from v_mes)::integer, extract(month from v_mes)::integer, m.dia_vencimento),
           null, null, 'aberto'
    from public.matriculas m join public.planos p on p.id = m.plano_id
    where v_mes between date_trunc('month', m.inicio) and date_trunc('month', coalesce(m.cancelado_em, m.vencimento))
      and not (m.status = 'pausado' and v_mes = date_trunc('month', v_hoje))
    on conflict do nothing;
  end loop;
  -- quem paga em dia, quem atrasa
  update public.recebimentos r
  set pago_em = r.vencimento + _r(-5, 3), status = 'pago', forma_pagamento = public._pick(array['pix','pix','pix','pix','cartao_credito','cartao_credito','dinheiro','cartao_debito'])
  where r.matricula_id is not null
    and ((r.vencimento < v_hoje and random() < 0.93) or (r.vencimento >= v_hoje and random() < 0.3));
  update public.recebimentos set pago_em = v_hoje where pago_em > v_hoje;

  -- -------------------------------------------------------------------
  -- Despesas mensais
  -- -------------------------------------------------------------------
  for v_mes in select generate_series(date_trunc('month', v_hist), date_trunc('month', v_hoje), interval '1 month')::date loop
    insert into public.despesas (categoria_id, descricao, valor, vencimento)
    select c.id, x.descricao, x.valor, v_mes + x.dia - 1
    from (values
      ('Aluguel', 'Aluguel do imóvel', 3800.00, 5),
      ('Salários e encargos', 'Salário recepcionista', 2450.00, 5),
      ('Salários e encargos', 'INSS e FGTS', 690.00, 20),
      ('Energia elétrica', 'Copel', 360 + round((random() * 160)::numeric, 2), 15),
      ('Água', 'Sanepar', 92 + round((random() * 45)::numeric, 2), 18),
      ('Internet e telefone', 'Internet fibra + telefone fixo', 189.90, 10),
      ('Contabilidade', 'Honorários contábeis', 650.00, 10),
      ('Limpeza', 'Diarista (4x no mês)', 880.00, 28),
      ('Impostos', 'Simples Nacional', 1750 + round((random() * 450)::numeric, 2), 20),
      ('Marketing', 'Impulsionamento Instagram', 200.00, 1),
      ('Materiais e descartáveis', 'Lençol descartável, álcool e luvas', 180 + round((random() * 220)::numeric, 2), 12),
      ('Materiais e descartáveis', 'Gel condutor, óleos e agulhas de acupuntura', 140 + round((random() * 160)::numeric, 2), 22)
    ) x(cat, descricao, valor, dia)
    join public.categorias_desp c on c.nome = x.cat;
  end loop;
  insert into public.despesas (categoria_id, descricao, valor, vencimento)
  select c.id, x.descricao, x.valor, v_hoje + x.desloc
  from (values ('Manutenção de equipamentos', 'Revisão das molas do Reformer e Cadillac', 680.00, -58),
               ('Manutenção de equipamentos', 'Manutenção preventiva do laser', 950.00, -27),
               ('Outros', 'Coffee break palestra "Saúde da coluna"', 240.00, -40),
               ('Materiais e descartáveis', 'Bolas suíças e faixas elásticas', 420.00, -12)) x(cat, descricao, valor, desloc)
  join public.categorias_desp c on c.nome = x.cat;
  update public.despesas set pago_em = vencimento, forma_pagamento = case when random() < 0.7 then 'pix' else 'boleto' end
  where vencimento < v_hoje;

  -- vínculo dos usuários de demonstração com os profissionais
  update public.perfis set profissional_id = pr_camila where email = 'fisio@fisiocenter.demo';
  update public.perfis set profissional_id = pr_juliana where email = 'pilates@fisiocenter.demo';

  return format('Demo pronta: %s pacientes, %s agendamentos, %s matrículas, %s aulas, %s recebimentos, %s despesas',
    (select count(*) from public.pacientes), (select count(*) from public.agendamentos),
    (select count(*) from public.matriculas), (select count(*) from public.aulas),
    (select count(*) from public.recebimentos), (select count(*) from public.despesas));
end $$;

-- Só o dono do banco (SQL editor do Supabase) pode rodar o gerador.
revoke all on function public.seed_demo() from public, anon, authenticated;
revoke all on function public._seed_ag(uuid, uuid, smallint, integer, uuid, date, integer, text) from public, anon, authenticated;
revoke all on function public._r(integer, integer) from public, anon, authenticated;
revoke all on function public._pick(text[]) from public, anon, authenticated;
revoke all on function public._cpf() from public, anon, authenticated;
revoke all on function public._forma() from public, anon, authenticated;


-- >>> 20261019000005_permissoes_api.sql
-- FisioCenter Lapa · Acesso pela API do Supabase
-- Concede explicitamente o que o app usa, para funcionar mesmo em projetos que não expõem
-- tabelas novas automaticamente. O que cada perfil vê continua decidido pelo RLS.

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

revoke all on all tables in schema public from anon;

grant execute on function
  public.meu_papel(), public.meu_profissional(), public.tem_papel(text[]),
  public.gerar_aulas(date, date), public.gerar_cobrancas(date), public.meses_periodicidade(text),
  public.renovar_matricula(uuid), public.atualizar_vencimentos(),
  public.fn_painel(date), public.fn_estatisticas(date, date, text)
to authenticated, service_role;

revoke execute on function
  public.gerar_aulas(date, date), public.gerar_cobrancas(date), public.renovar_matricula(uuid),
  public.atualizar_vencimentos(), public.fn_painel(date), public.fn_estatisticas(date, date, text)
from anon, public;


-- >>> seed.sql
-- FisioCenter Lapa · Usuários de demonstração + dados fictícios
-- Rode depois das migrations. Pode rodar de novo quando quiser "renovar" a demo.
-- Senha de todos os usuários: fisio1995

do $$
declare
  u record;
  v_id uuid;
begin
  for u in
    select * from (values
      ('admin@fisiocenter.demo',    'Marina Taborda',    'admin'),
      ('recepcao@fisiocenter.demo', 'Luana Prestes',     'recepcao'),
      ('fisio@fisiocenter.demo',    'Camila Andrade',    'fisio'),
      ('pilates@fisiocenter.demo',  'Juliana Kowalski',  'fisio')
    ) x(email, nome, papel)
  loop
    select id into v_id from auth.users where email = u.email;
    if v_id is null then
      v_id := gen_random_uuid();
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                              raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                              confirmation_token, email_change, email_change_token_new, recovery_token)
      values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', u.email,
              extensions.crypt('fisio1995', extensions.gen_salt('bf')), now(),
              '{"provider":"email","providers":["email"]}'::jsonb,
              jsonb_build_object('nome', u.nome, 'papel', u.papel), now(), now(), '', '', '', '');
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (gen_random_uuid(), v_id, v_id::text,
              jsonb_build_object('sub', v_id::text, 'email', u.email, 'email_verified', true),
              'email', now(), now(), now());
    end if;
    insert into public.perfis (id, nome, email, papel) values (v_id, u.nome, u.email, u.papel)
    on conflict (id) do update set nome = excluded.nome, papel = excluded.papel, email = excluded.email;
  end loop;
end $$;

select public.seed_demo();
