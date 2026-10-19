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
