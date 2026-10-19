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
