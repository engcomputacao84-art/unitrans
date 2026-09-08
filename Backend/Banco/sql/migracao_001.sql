

ALTER TABLE motoristas ADD COLUMN cpf VARCHAR(14) UNIQUE;
ALTER TABLE clientes    ADD COLUMN observacoes TEXT;

-- 3) motoristas.status — a tela de motoristas distingue "pendente"
--    (documentação em análise) de "inativo", mas o CHECK original só
--    aceitava disponivel/em_rota/folga/inativo.
ALTER TABLE motoristas DROP CONSTRAINT motoristas_status_check;
ALTER TABLE motoristas ADD CONSTRAINT motoristas_status_check
    CHECK (status IN ('disponivel', 'em_rota', 'pendente', 'folga', 'inativo'));
