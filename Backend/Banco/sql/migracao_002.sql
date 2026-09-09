-- Migração 002 — suporte à tela "Cargas" (montagem) da equipe
-- ---------------------------------------------------------------
-- A tela de montagem de cargas cria a carga (dia + caminhão +
-- solicitações) ANTES de escolher o motorista — o motorista só é
-- definido no passo "Gerar rota". Isso exige:
--
-- 1) cargas.motorista_id passa a ser opcional (NULL = motorista
--    ainda não definido, carga em montagem).
-- 2) cargas.status ganha o valor 'montagem' (carga sendo montada,
--    ainda não é uma rota). Os valores antigos (pendente/andamento/
--    concluida) continuam representando o ciclo de vida da rota,
--    já em uso pela tela de Rotas.

ALTER TABLE cargas ALTER COLUMN motorista_id DROP NOT NULL;

ALTER TABLE cargas DROP CONSTRAINT cargas_status_check;
ALTER TABLE cargas ADD CONSTRAINT cargas_status_check
    CHECK (status IN ('montagem', 'pendente', 'andamento', 'concluida'));

-- Toda carga nova nasce em montagem (sem motorista ainda).
ALTER TABLE cargas ALTER COLUMN status SET DEFAULT 'montagem';

-- Garante que uma carga só pode estar sem motorista enquanto ainda
-- está em montagem — qualquer status de rota exige motorista definido.
ALTER TABLE cargas ADD CONSTRAINT cargas_motorista_exigido_apos_montagem
    CHECK (status = 'montagem' OR motorista_id IS NOT NULL);

-- Evita escalar o mesmo caminhão ou motorista duas vezes no mesmo dia.
-- Se isto falhar com "duplicate key", já existem cargas duplicadas
-- nessa combinação — resolva os registros antes de rodar de novo.
ALTER TABLE cargas ADD CONSTRAINT cargas_caminhao_placa_data_key UNIQUE (caminhao_placa, data);
ALTER TABLE cargas ADD CONSTRAINT cargas_motorista_id_data_key UNIQUE (motorista_id, data);

CREATE INDEX IF NOT EXISTS idx_cargas_status ON cargas(status);
