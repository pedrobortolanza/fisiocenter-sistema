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
