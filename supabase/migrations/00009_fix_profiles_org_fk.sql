-- profiles.default_organization_id apontava para organizations sem ON DELETE,
-- o que bloqueava a eliminação de qualquer organização referenciada por um
-- perfil (ex.: a última organização em que o utilizador esteve ativo).
alter table profiles
  drop constraint profiles_default_organization_id_fkey,
  add constraint profiles_default_organization_id_fkey
    foreign key (default_organization_id) references organizations (id) on delete set null;
