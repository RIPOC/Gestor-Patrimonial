-- Novo tipo de documento para o PDF original da caderneta predial importada,
-- guardado no arquivo digital do imóvel para rastreabilidade fiscal.
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'caderneta_predial';
