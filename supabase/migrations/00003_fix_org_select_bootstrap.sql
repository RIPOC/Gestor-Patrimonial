-- =============================================================================
-- Fix: arranque da 1.ª organização
-- A política org_select exigia ser membro da organização, mas o criador só se
-- torna membro no trigger handle_new_organization (um instante depois do INSERT).
-- Como a app faz INSERT ... RETURNING (.select() após inserir), a leitura da linha
-- recém-criada falhava com "new row violates row-level security policy".
-- Solução: permitir que o criador leia a própria organização via created_by.
-- =============================================================================

drop policy if exists org_select on organizations;

create policy org_select on organizations for select
  using (is_org_member(id) or created_by = auth.uid());
