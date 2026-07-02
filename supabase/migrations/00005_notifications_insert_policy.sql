-- =============================================================================
-- Fix: a tabela notifications tinha RLS ativo mas apenas políticas de
-- select/update — faltava a de insert, pelo que o motor de automatismos
-- (notifyOrgManagers) falhava silenciosamente ao tentar notificar os gestores.
-- Qualquer membro ativo da organização pode criar notificações para a própria
-- organização (o destinatário é sempre outro membro da mesma organização,
-- validado pela query em notification-service.ts).
-- =============================================================================

create policy notif_insert on notifications for insert
  with check (is_org_member(organization_id));
