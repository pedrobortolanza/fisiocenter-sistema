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
