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
