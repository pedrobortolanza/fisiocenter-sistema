
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "agendamentos": {
                  Row: {
                    "criado_em": string,"endereco_domiciliar": string | null,"fim": string,"id": string,"inicio": string,"obs": string | null,"paciente_id": string,"pacote_id": string | null,"profissional_id": string,"sala_id": number | null,"servico_id": number,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"endereco_domiciliar"?: string | null,"fim": string,"id"?: string,"inicio": string,"obs"?: string | null,"paciente_id": string,"pacote_id"?: string | null,"profissional_id": string,"sala_id"?: number | null,"servico_id": number,"status"?: string
                  }
                  Update: {
                    "criado_em"?: string,"endereco_domiciliar"?: string | null,"fim"?: string,"id"?: string,"inicio"?: string,"obs"?: string | null,"paciente_id"?: string,"pacote_id"?: string | null,"profissional_id"?: string,"sala_id"?: number | null,"servico_id"?: number,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "agendamentos_paciente_id_fkey"
      columns: ["paciente_id"]
isOneToOne: false
      referencedRelation: "pacientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agendamentos_pacote_id_fkey"
      columns: ["pacote_id"]
isOneToOne: false
      referencedRelation: "pacotes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agendamentos_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissionais"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agendamentos_sala_id_fkey"
      columns: ["sala_id"]
isOneToOne: false
      referencedRelation: "salas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "agendamentos_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servicos"
      referencedColumns: ["id"]
    }
                  ]
                },"aulas": {
                  Row: {
                    "data": string,"id": string,"status": string,"turma_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "data": string,"id"?: string,"status"?: string,"turma_id": number
                  }
                  Update: {
                    "data"?: string,"id"?: string,"status"?: string,"turma_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "aulas_turma_id_fkey"
      columns: ["turma_id"]
isOneToOne: false
      referencedRelation: "turmas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "aulas_turma_id_fkey"
      columns: ["turma_id"]
isOneToOne: false
      referencedRelation: "vw_ocupacao_turmas"
      referencedColumns: ["id"]
    }
                  ]
                },"categorias_desp": {
                  Row: {
                    "id": number,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"nome": string
                  }
                  Update: {
                    "id"?: never,"nome"?: string
                  }
                  Relationships: [
                    
                  ]
                },"despesas": {
                  Row: {
                    "categoria_id": number | null,"criado_em": string,"descricao": string,"forma_pagamento": string | null,"id": string,"pago_em": string | null,"valor": number,"vencimento": string
                  }
                  ComputedFields: never
                  Insert: {
                    "categoria_id"?: number | null,"criado_em"?: string,"descricao": string,"forma_pagamento"?: string | null,"id"?: string,"pago_em"?: string | null,"valor": number,"vencimento"?: string
                  }
                  Update: {
                    "categoria_id"?: number | null,"criado_em"?: string,"descricao"?: string,"forma_pagamento"?: string | null,"id"?: string,"pago_em"?: string | null,"valor"?: number,"vencimento"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "despesas_categoria_id_fkey"
      columns: ["categoria_id"]
isOneToOne: false
      referencedRelation: "categorias_desp"
      referencedColumns: ["id"]
    }
                  ]
                },"matricula_turmas": {
                  Row: {
                    "matricula_id": string,"turma_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "matricula_id": string,"turma_id": number
                  }
                  Update: {
                    "matricula_id"?: string,"turma_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "matricula_turmas_matricula_id_fkey"
      columns: ["matricula_id"]
isOneToOne: false
      referencedRelation: "matriculas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matricula_turmas_turma_id_fkey"
      columns: ["turma_id"]
isOneToOne: false
      referencedRelation: "turmas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matricula_turmas_turma_id_fkey"
      columns: ["turma_id"]
isOneToOne: false
      referencedRelation: "vw_ocupacao_turmas"
      referencedColumns: ["id"]
    }
                  ]
                },"matriculas": {
                  Row: {
                    "cancelado_em": string | null,"criado_em": string,"dia_vencimento": number,"id": string,"inicio": string,"obs": string | null,"paciente_id": string,"plano_id": number,"reposicoes_disp": number,"status": string,"vencimento": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancelado_em"?: string | null,"criado_em"?: string,"dia_vencimento"?: number,"id"?: string,"inicio"?: string,"obs"?: string | null,"paciente_id": string,"plano_id": number,"reposicoes_disp"?: number,"status"?: string,"vencimento": string
                  }
                  Update: {
                    "cancelado_em"?: string | null,"criado_em"?: string,"dia_vencimento"?: number,"id"?: string,"inicio"?: string,"obs"?: string | null,"paciente_id"?: string,"plano_id"?: number,"reposicoes_disp"?: number,"status"?: string,"vencimento"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "matriculas_paciente_id_fkey"
      columns: ["paciente_id"]
isOneToOne: false
      referencedRelation: "pacientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "matriculas_plano_id_fkey"
      columns: ["plano_id"]
isOneToOne: false
      referencedRelation: "planos"
      referencedColumns: ["id"]
    }
                  ]
                },"modalidades": {
                  Row: {
                    "cor": string,"id": number,"nome": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cor"?: string,"id"?: never,"nome": string,"slug": string
                  }
                  Update: {
                    "cor"?: string,"id"?: never,"nome"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"pacientes": {
                  Row: {
                    "ativo": boolean,"bairro": string | null,"cidade": string | null,"convenio": string | null,"cpf": string | null,"criado_em": string,"email": string | null,"endereco": string | null,"id": string,"nascimento": string | null,"nome": string,"obs": string | null,"origem": string | null,"profissao": string | null,"sexo": string | null,"telefone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"bairro"?: string | null,"cidade"?: string | null,"convenio"?: string | null,"cpf"?: string | null,"criado_em"?: string,"email"?: string | null,"endereco"?: string | null,"id"?: string,"nascimento"?: string | null,"nome": string,"obs"?: string | null,"origem"?: string | null,"profissao"?: string | null,"sexo"?: string | null,"telefone"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"bairro"?: string | null,"cidade"?: string | null,"convenio"?: string | null,"cpf"?: string | null,"criado_em"?: string,"email"?: string | null,"endereco"?: string | null,"id"?: string,"nascimento"?: string | null,"nome"?: string,"obs"?: string | null,"origem"?: string | null,"profissao"?: string | null,"sexo"?: string | null,"telefone"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"pacotes": {
                  Row: {
                    "criado_em": string,"id": string,"paciente_id": string,"servico_id": number,"sessoes_usadas": number,"total_sessoes": number,"validade": string | null,"valor_total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"id"?: string,"paciente_id": string,"servico_id": number,"sessoes_usadas"?: number,"total_sessoes": number,"validade"?: string | null,"valor_total"?: number
                  }
                  Update: {
                    "criado_em"?: string,"id"?: string,"paciente_id"?: string,"servico_id"?: number,"sessoes_usadas"?: number,"total_sessoes"?: number,"validade"?: string | null,"valor_total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "pacotes_paciente_id_fkey"
      columns: ["paciente_id"]
isOneToOne: false
      referencedRelation: "pacientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "pacotes_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servicos"
      referencedColumns: ["id"]
    }
                  ]
                },"perfis": {
                  Row: {
                    "criado_em": string,"email": string | null,"id": string,"nome": string,"papel": string,"profissional_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"email"?: string | null,"id": string,"nome": string,"papel"?: string,"profissional_id"?: string | null
                  }
                  Update: {
                    "criado_em"?: string,"email"?: string | null,"id"?: string,"nome"?: string,"papel"?: string,"profissional_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "perfis_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: true
      referencedRelation: "profissionais"
      referencedColumns: ["id"]
    }
                  ]
                },"planos": {
                  Row: {
                    "ativo": boolean,"aulas_semana": number,"desconto_pct": number,"id": number,"modalidade_id": number,"nome": string,"periodicidade": string,"preco_mensal": number,"servico_id": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"aulas_semana"?: number,"desconto_pct"?: number,"id"?: never,"modalidade_id": number,"nome": string,"periodicidade"?: string,"preco_mensal": number,"servico_id"?: number | null
                  }
                  Update: {
                    "ativo"?: boolean,"aulas_semana"?: number,"desconto_pct"?: number,"id"?: never,"modalidade_id"?: number,"nome"?: string,"periodicidade"?: string,"preco_mensal"?: number,"servico_id"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "planos_modalidade_id_fkey"
      columns: ["modalidade_id"]
isOneToOne: false
      referencedRelation: "modalidades"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "planos_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servicos"
      referencedColumns: ["id"]
    }
                  ]
                },"presencas": {
                  Row: {
                    "aula_id": string,"matricula_id": string | null,"paciente_id": string,"status": string,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aula_id": string,"matricula_id"?: string | null,"paciente_id": string,"status"?: string,"tipo"?: string
                  }
                  Update: {
                    "aula_id"?: string,"matricula_id"?: string | null,"paciente_id"?: string,"status"?: string,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "presencas_aula_id_fkey"
      columns: ["aula_id"]
isOneToOne: false
      referencedRelation: "aulas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "presencas_matricula_id_fkey"
      columns: ["matricula_id"]
isOneToOne: false
      referencedRelation: "matriculas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "presencas_paciente_id_fkey"
      columns: ["paciente_id"]
isOneToOne: false
      referencedRelation: "pacientes"
      referencedColumns: ["id"]
    }
                  ]
                },"profissionais": {
                  Row: {
                    "ativo": boolean,"comissao_pct": number,"cor_agenda": string,"crefito": string | null,"criado_em": string,"especialidade": string | null,"id": string,"nome": string,"telefone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"comissao_pct"?: number,"cor_agenda"?: string,"crefito"?: string | null,"criado_em"?: string,"especialidade"?: string | null,"id"?: string,"nome": string,"telefone"?: string | null
                  }
                  Update: {
                    "ativo"?: boolean,"comissao_pct"?: number,"cor_agenda"?: string,"crefito"?: string | null,"criado_em"?: string,"especialidade"?: string | null,"id"?: string,"nome"?: string,"telefone"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"recebimentos": {
                  Row: {
                    "agendamento_id": string | null,"criado_em": string,"descricao": string,"forma_pagamento": string | null,"id": string,"matricula_id": string | null,"modalidade_id": number | null,"paciente_id": string | null,"pacote_id": string | null,"pago_em": string | null,"profissional_id": string | null,"status": string,"valor": number,"vencimento": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agendamento_id"?: string | null,"criado_em"?: string,"descricao": string,"forma_pagamento"?: string | null,"id"?: string,"matricula_id"?: string | null,"modalidade_id"?: number | null,"paciente_id"?: string | null,"pacote_id"?: string | null,"pago_em"?: string | null,"profissional_id"?: string | null,"status"?: string,"valor": number,"vencimento"?: string
                  }
                  Update: {
                    "agendamento_id"?: string | null,"criado_em"?: string,"descricao"?: string,"forma_pagamento"?: string | null,"id"?: string,"matricula_id"?: string | null,"modalidade_id"?: number | null,"paciente_id"?: string | null,"pacote_id"?: string | null,"pago_em"?: string | null,"profissional_id"?: string | null,"status"?: string,"valor"?: number,"vencimento"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "recebimentos_agendamento_id_fkey"
      columns: ["agendamento_id"]
isOneToOne: false
      referencedRelation: "agendamentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recebimentos_matricula_id_fkey"
      columns: ["matricula_id"]
isOneToOne: false
      referencedRelation: "matriculas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recebimentos_modalidade_id_fkey"
      columns: ["modalidade_id"]
isOneToOne: false
      referencedRelation: "modalidades"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recebimentos_paciente_id_fkey"
      columns: ["paciente_id"]
isOneToOne: false
      referencedRelation: "pacientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recebimentos_pacote_id_fkey"
      columns: ["pacote_id"]
isOneToOne: false
      referencedRelation: "pacotes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recebimentos_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissionais"
      referencedColumns: ["id"]
    }
                  ]
                },"renovacoes": {
                  Row: {
                    "data": string,"id": string,"matricula_id": string,"novo_vencimento": string,"vencimento_anterior": string
                  }
                  ComputedFields: never
                  Insert: {
                    "data"?: string,"id"?: string,"matricula_id": string,"novo_vencimento": string,"vencimento_anterior": string
                  }
                  Update: {
                    "data"?: string,"id"?: string,"matricula_id"?: string,"novo_vencimento"?: string,"vencimento_anterior"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "renovacoes_matricula_id_fkey"
      columns: ["matricula_id"]
isOneToOne: false
      referencedRelation: "matriculas"
      referencedColumns: ["id"]
    }
                  ]
                },"salas": {
                  Row: {
                    "ativo": boolean,"capacidade": number,"id": number,"nome": string,"tipo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"capacidade"?: number,"id"?: never,"nome": string,"tipo": string
                  }
                  Update: {
                    "ativo"?: boolean,"capacidade"?: number,"id"?: never,"nome"?: string,"tipo"?: string
                  }
                  Relationships: [
                    
                  ]
                },"servicos": {
                  Row: {
                    "ativo": boolean,"duracao_min": number,"id": number,"modalidade_id": number,"nome": string,"preco": number
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"duracao_min"?: number,"id"?: never,"modalidade_id": number,"nome": string,"preco"?: number
                  }
                  Update: {
                    "ativo"?: boolean,"duracao_min"?: number,"id"?: never,"modalidade_id"?: number,"nome"?: string,"preco"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "servicos_modalidade_id_fkey"
      columns: ["modalidade_id"]
isOneToOne: false
      referencedRelation: "modalidades"
      referencedColumns: ["id"]
    }
                  ]
                },"turmas": {
                  Row: {
                    "ativo": boolean,"dia_semana": number,"duracao_min": number,"hora": string,"id": number,"profissional_id": string,"sala_id": number,"servico_id": number,"vagas": number
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"dia_semana": number,"duracao_min"?: number,"hora": string,"id"?: never,"profissional_id": string,"sala_id": number,"servico_id": number,"vagas"?: number
                  }
                  Update: {
                    "ativo"?: boolean,"dia_semana"?: number,"duracao_min"?: number,"hora"?: string,"id"?: never,"profissional_id"?: string,"sala_id"?: number,"servico_id"?: number,"vagas"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "turmas_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissionais"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "turmas_sala_id_fkey"
      columns: ["sala_id"]
isOneToOne: false
      referencedRelation: "salas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "turmas_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servicos"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "vw_ocupacao_turmas": {
                  Row: {
                    "alunos_fixos": number | null,"cor_agenda": string | null,"dia_semana": number | null,"duracao_min": number | null,"hora": string | null,"id": number | null,"profissional_id": string | null,"profissional_nome": string | null,"sala_id": number | null,"sala_nome": string | null,"servico_id": number | null,"servico_nome": string | null,"vagas": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "turmas_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissionais"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "turmas_sala_id_fkey"
      columns: ["sala_id"]
isOneToOne: false
      referencedRelation: "salas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "turmas_servico_id_fkey"
      columns: ["servico_id"]
isOneToOne: false
      referencedRelation: "servicos"
      referencedColumns: ["id"]
    }
                  ]
                },"vw_recebimentos": {
                  Row: {
                    "agendamento_id": string | null,"criado_em": string | null,"descricao": string | null,"forma_pagamento": string | null,"id": string | null,"matricula_id": string | null,"modalidade_id": number | null,"modalidade_nome": string | null,"modalidade_slug": string | null,"paciente_id": string | null,"paciente_nome": string | null,"pacote_id": string | null,"pago_em": string | null,"profissional_id": string | null,"profissional_nome": string | null,"situacao": string | null,"status": string | null,"valor": number | null,"vencimento": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "recebimentos_agendamento_id_fkey"
      columns: ["agendamento_id"]
isOneToOne: false
      referencedRelation: "agendamentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recebimentos_matricula_id_fkey"
      columns: ["matricula_id"]
isOneToOne: false
      referencedRelation: "matriculas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recebimentos_modalidade_id_fkey"
      columns: ["modalidade_id"]
isOneToOne: false
      referencedRelation: "modalidades"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recebimentos_paciente_id_fkey"
      columns: ["paciente_id"]
isOneToOne: false
      referencedRelation: "pacientes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recebimentos_pacote_id_fkey"
      columns: ["pacote_id"]
isOneToOne: false
      referencedRelation: "pacotes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recebimentos_profissional_id_fkey"
      columns: ["profissional_id"]
isOneToOne: false
      referencedRelation: "profissionais"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "_cpf":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"_forma":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"_pick":
{ Args: { "arr": (string)[] }; Returns: string
                           },
"_r":
{ Args: { "a": number,"b": number }; Returns: number
                           },
"_seed_ag":
{ Args: { "p_dia": string,"p_end"?: string,"p_hora": number,"p_pac": string,"p_pacote": string,"p_prof": string,"p_sala": number,"p_serv": number }; Returns: string
                           },
"atualizar_vencimentos":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"fn_estatisticas":
{ Args: { "p_fim": string,"p_ini": string,"p_modalidade"?: string }; Returns: Json
                           },
"fn_painel":
{ Args: { "p_mes"?: string }; Returns: Json
                           },
"gerar_aulas":
{ Args: { "p_fim": string,"p_ini": string }; Returns: number
                           },
"gerar_cobrancas":
{ Args: { "p_mes"?: string }; Returns: number
                           },
"meses_periodicidade":
{ Args: { "p": string }; Returns: number
                           },
"meu_papel":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"meu_profissional":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"renovar_matricula":
{ Args: { "p_matricula": string }; Returns: string
                           },
"seed_demo":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"tem_papel":
{ Args: { "papeis": (string)[] }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
