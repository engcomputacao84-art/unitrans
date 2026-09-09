-- ============================================================
-- UNITRANS — SCHEMA DO BANCO (PostgreSQL / Supabase)
-- ============================================================
-- Ordem de criação respeita as dependências de FK.
-- Pensado para evitar redundância:
--   - 1 tabela de endereço reaproveitada por usuários e solicitações
--   - 1 tabela de usuários com "tipo" (M/C/A), e extensões só onde
--     há campo realmente diferente (motorista, cliente)
--   - "carga" = a viagem (caminhão + motorista), sem duplicar como
--     "rota" separada
--   - "parada" não guarda endereço próprio: deriva de solicitacoes
--   - status é sincronizado por trigger (parada -> carga -> solicitação),
--     em vez de cada tela ter que atualizar 3 tabelas manualmente
--   - "notificacoes" é uma fila única (outbox) reaproveitada por
--     qualquer canal (hoje Telegram, amanhã e-mail/SMS sem remodelar)
-- ============================================================

-- ------------------------------------------------------------
-- FUNÇÃO GENÉRICA: mantém "atualizado_em" sempre em dia
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_atualizado_em()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- ENDEREÇOS (reutilizado por usuarios e solicitacoes)
-- ------------------------------------------------------------
CREATE TABLE enderecos (
    id             BIGSERIAL PRIMARY KEY,
    cep            VARCHAR(9),
    logradouro     TEXT        NOT NULL,
    numero         VARCHAR(10),
    complemento    VARCHAR(60),
    bairro         VARCHAR(80),
    cidade         VARCHAR(80) NOT NULL,
    estado         CHAR(2)     NOT NULL,
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- USUÁRIOS (tabela central de quem acessa o sistema)
-- tipo: 'M' = motorista, 'C' = cliente, 'A' = analista/equipe
--
-- telegram_chat_id: identifica pra onde o bot manda mensagem.
-- Fica em usuarios (não só em clientes) porque motorista e
-- equipe também podem querer receber aviso do bot no futuro
-- (ex: motorista avisado de nova carga, equipe avisada de
-- licenciamento vencendo) — mesmo raciocínio de reaproveitar
-- "enderecos" em vez de duplicar por tipo de usuário.
--
-- O vínculo é feito por código temporário (telegram_link_token)
-- gerado pelo painel/app e digitado no bot via /vincular <codigo>,
-- em vez de o cliente informar o chat_id "cru" — assim ninguém
-- consegue vincular o Telegram de outra pessoa por engano/má-fé.
-- ------------------------------------------------------------
CREATE TABLE usuarios (
    id                     BIGSERIAL PRIMARY KEY,
    tipo                   CHAR(1)     NOT NULL CHECK (tipo IN ('M', 'C', 'A')),
    -- nome da pessoa (PF/motorista/analista) OU nome fantasia (PJ)
    nome                   VARCHAR(150) NOT NULL,
    email                  VARCHAR(150) NOT NULL UNIQUE,
    senha_hash             TEXT        NOT NULL,
    telefone               VARCHAR(20),
    endereco_id            BIGINT      REFERENCES enderecos(id),
    ativo                  BOOLEAN     NOT NULL DEFAULT true,
    telegram_chat_id       BIGINT      UNIQUE,
    telegram_link_token    VARCHAR(8),
    telegram_link_expira   TIMESTAMPTZ,
    telegram_vinculado_em  TIMESTAMPTZ,
    criado_em              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_usuarios_tipo ON usuarios(tipo);

-- ------------------------------------------------------------
-- MOTORISTAS (extensão 1:1 de usuarios, tipo = 'M')
-- ------------------------------------------------------------
CREATE TABLE motoristas (
    usuario_id      BIGINT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    cnh_numero      VARCHAR(20) NOT NULL,
    cnh_categorias  TEXT[]      NOT NULL,   -- ex: {'B'} ou {'B','C'}
    cnh_validade    DATE        NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'disponivel'
                        CHECK (status IN ('disponivel', 'em_rota', 'folga', 'inativo')),
    observacoes     TEXT,
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_motoristas_atualizado_em
    BEFORE UPDATE ON motoristas
    FOR EACH ROW EXECUTE FUNCTION trg_atualizado_em();

-- ------------------------------------------------------------
-- CLIENTES (extensão 1:1 de usuarios, tipo = 'C')
-- PF: documento = CPF (nome já está em usuarios.nome)
-- PJ: documento = CNPJ, razao_social só existe aqui;
--     usuarios.nome guarda o nome fantasia
-- ------------------------------------------------------------
CREATE TABLE clientes (
    usuario_id      BIGINT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_pessoa     CHAR(2)     NOT NULL CHECK (tipo_pessoa IN ('PF', 'PJ')),
    documento       VARCHAR(18) NOT NULL UNIQUE,  -- CPF ou CNPJ
    razao_social    VARCHAR(150)                  -- só preenchido quando PJ
);

-- ------------------------------------------------------------
-- CAMINHÕES (frota)
-- "ativo" foi removido: existia junto com "status" pra dizer a
-- mesma coisa de dois jeitos (dava pra ter ativo=true e ao
-- mesmo tempo status='inativo'). Agora só "status" manda, e
-- 'inativo' já está dentro do CHECK.
-- ------------------------------------------------------------
CREATE TABLE caminhoes (
    placa                             VARCHAR(8) PRIMARY KEY,
    renavam                           VARCHAR(11) UNIQUE,
    marca                             VARCHAR(40) NOT NULL,
    modelo                            VARCHAR(40) NOT NULL,
    ano_fabricacao                    SMALLINT,
    ano_modelo                        SMALLINT,
    tipo                              VARCHAR(20) NOT NULL
                                          CHECK (tipo IN ('furgao', 'vuc', 'toco', 'truck')),
    capacidade_kg                     NUMERIC(10, 2),
    proprietario                      VARCHAR(150),
    licenciamento_situacao            VARCHAR(20) NOT NULL DEFAULT 'nao_verificado'
                                          CHECK (licenciamento_situacao IN ('regular', 'pendente', 'nao_verificado')),
    licenciamento_ano                 SMALLINT,
    licenciamento_ultima_verificacao  DATE,
    status                            VARCHAR(20) NOT NULL DEFAULT 'disponivel'
                                          CHECK (status IN ('disponivel', 'em_rota', 'manutencao', 'inativo')),
    observacoes                       TEXT,
    atualizado_em                     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_caminhoes_status ON caminhoes(status);

CREATE TRIGGER trg_caminhoes_atualizado_em
    BEFORE UPDATE ON caminhoes
    FOR EACH ROW EXECUTE FUNCTION trg_atualizado_em();

-- ------------------------------------------------------------
-- CARGAS (a viagem: 1 caminhão + 1 motorista numa data,
-- carregando 1 ou mais solicitações — equivale ao que o
-- frontend às vezes chama de "rota")
--
-- UNIQUE(caminhao_placa, data) e UNIQUE(motorista_id, data)
-- impedem escalar o mesmo caminhão/motorista duas vezes no
-- mesmo dia sem querer (dupla reserva). Se um dia a operação
-- passar a rodar mais de uma viagem por caminhão no mesmo dia,
-- essas duas linhas são as primeiras a remover.
-- ------------------------------------------------------------
CREATE TABLE cargas (
    id              BIGSERIAL PRIMARY KEY,
    caminhao_placa  VARCHAR(8)  NOT NULL REFERENCES caminhoes(placa),
    -- NULL enquanto a carga está em montagem (dia + caminhão +
    -- solicitações escolhidos, motorista ainda não). É definido no
    -- passo "Gerar rota" da tela de Cargas — ver migração 002.
    motorista_id    BIGINT      REFERENCES motoristas(usuario_id),
    data            DATE        NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'montagem'
                        CHECK (status IN ('montagem', 'pendente', 'andamento', 'concluida')),
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (caminhao_placa, data),
    UNIQUE (motorista_id, data),
    -- só pode ficar sem motorista enquanto ainda está em montagem
    CONSTRAINT cargas_motorista_exigido_apos_montagem
        CHECK (status = 'montagem' OR motorista_id IS NOT NULL)
);

CREATE INDEX idx_cargas_motorista ON cargas(motorista_id);
CREATE INDEX idx_cargas_status    ON cargas(status);

CREATE TRIGGER trg_cargas_atualizado_em
    BEFORE UPDATE ON cargas
    FOR EACH ROW EXECUTE FUNCTION trg_atualizado_em();

-- ------------------------------------------------------------
-- SOLICITAÇÕES (pedido de transporte feito pelo cliente)
-- carga_id fica NULL até a solicitação ser aprovada e
-- encaixada em uma carga/viagem
-- ------------------------------------------------------------
CREATE TABLE solicitacoes (
    id                    BIGSERIAL PRIMARY KEY,
    cliente_id            BIGINT      NOT NULL REFERENCES clientes(usuario_id),
    endereco_coleta_id    BIGINT      NOT NULL REFERENCES enderecos(id),
    endereco_entrega_id   BIGINT      NOT NULL REFERENCES enderecos(id),
    carga_id              BIGINT      REFERENCES cargas(id),
    data_desejo           DATE,
    periodo_coleta        VARCHAR(10) CHECK (periodo_coleta IN ('manha', 'tarde')),
    periodo_entrega       VARCHAR(10) CHECK (periodo_entrega IN ('manha', 'tarde')),
    tipo_carga            VARCHAR(60),
    peso_kg               NUMERIC(10, 2),
    volume_m3             NUMERIC(10, 2),
    valor_declarado       NUMERIC(12, 2),
    observacoes           TEXT,
    status                VARCHAR(20) NOT NULL DEFAULT 'pendente'
                              CHECK (status IN ('pendente', 'aprovado', 'recusado', 'em_carga', 'em_rota', 'concluido')),
    motivo_recusa         TEXT,
    analista_id           BIGINT      REFERENCES usuarios(id),
    criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_solicitacoes_cliente ON solicitacoes(cliente_id);
CREATE INDEX idx_solicitacoes_status  ON solicitacoes(status);
CREATE INDEX idx_solicitacoes_carga   ON solicitacoes(carga_id);

CREATE TRIGGER trg_solicitacoes_atualizado_em
    BEFORE UPDATE ON solicitacoes
    FOR EACH ROW EXECUTE FUNCTION trg_atualizado_em();

-- ------------------------------------------------------------
-- PARADAS (coleta ou entrega de uma solicitação dentro de uma
-- carga/viagem — o endereço é resolvido via JOIN com
-- solicitacoes.endereco_coleta_id / endereco_entrega_id,
-- não é duplicado aqui)
-- ------------------------------------------------------------
CREATE TABLE paradas (
    id               BIGSERIAL PRIMARY KEY,
    carga_id         BIGINT      NOT NULL REFERENCES cargas(id) ON DELETE CASCADE,
    solicitacao_id   BIGINT      NOT NULL REFERENCES solicitacoes(id),
    tipo             VARCHAR(10) NOT NULL CHECK (tipo IN ('coleta', 'entrega')),
    ordem            SMALLINT    NOT NULL,
    hora_prevista    TIME,
    hora_realizada   TIMESTAMPTZ,
    status           VARCHAR(20) NOT NULL DEFAULT 'pendente'
                         CHECK (status IN ('pendente', 'concluida', 'ocorrencia')),
    atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (solicitacao_id, tipo)
);

CREATE INDEX idx_paradas_carga ON paradas(carga_id);

CREATE TRIGGER trg_paradas_atualizado_em
    BEFORE UPDATE ON paradas
    FOR EACH ROW EXECUTE FUNCTION trg_atualizado_em();

-- ------------------------------------------------------------
-- OCORRÊNCIAS (detalhe opcional de problema numa parada —
-- fica fora de "paradas" pra não encher a tabela de colunas
-- quase sempre vazias)
-- ------------------------------------------------------------
CREATE TABLE ocorrencias (
    id               BIGSERIAL PRIMARY KEY,
    parada_id        BIGINT      NOT NULL UNIQUE REFERENCES paradas(id) ON DELETE CASCADE,
    tipo_ocorrencia  VARCHAR(40),
    descricao        TEXT,
    registrado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- NOTIFICAÇÕES (fila única de avisos — "outbox")
--
-- Em vez de o bot/backend ficar consultando "o que mudou" em
-- 4 tabelas diferentes, qualquer parte do sistema só insere
-- uma linha aqui. Um worker (o próprio telegramBot.js rodando
-- um setInterval, ou um cron) faz:
--   SELECT * FROM notificacoes WHERE enviado = false ORDER BY criado_em;
-- envia pelo canal indicado, e marca enviado=true.
-- Isso também dá um histórico grátis de "o que já avisamos
-- pra cada cliente", útil pra debugar reclamação de "não recebi
-- aviso nenhum".
-- ------------------------------------------------------------
CREATE TABLE notificacoes (
    id               BIGSERIAL PRIMARY KEY,
    usuario_id       BIGINT      NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo             VARCHAR(30) NOT NULL
                         CHECK (tipo IN (
                             'status_solicitacao', 'carga_concluida',
                             'lembrete_licenciamento', 'nova_solicitacao',
                             'ocorrencia', 'aviso_equipe'
                         )),
    titulo           VARCHAR(120) NOT NULL,
    mensagem         TEXT        NOT NULL,
    referencia_tipo  VARCHAR(20),   -- 'solicitacao' | 'carga' | 'caminhao' (p/ o bot linkar de volta)
    referencia_id    BIGINT,
    canal            VARCHAR(20) NOT NULL DEFAULT 'telegram' CHECK (canal IN ('telegram', 'email')),
    enviado          BOOLEAN     NOT NULL DEFAULT false,
    enviado_em       TIMESTAMPTZ,
    erro             TEXT,
    criado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notificacoes_usuario   ON notificacoes(usuario_id);
CREATE INDEX idx_notificacoes_pendentes ON notificacoes(enviado) WHERE enviado = false;

-- ------------------------------------------------------------
-- SINCRONISMO DE STATUS (parada -> solicitação -> carga)
--
-- Resolve o ponto de "status guardado em 3 tabelas que podem
-- ficar dessincronizadas": a partir de agora só a tabela
-- "paradas" é escrita manualmente pela aplicação/motorista; o
-- resto é derivado aqui dentro, sempre da mesma forma.
-- Também aproveita pra gerar a notificação pro cliente.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_status_apos_parada()
RETURNS TRIGGER AS $$
DECLARE
    total_paradas   INT;
    concluidas      INT;
    v_cliente_id    BIGINT;
BEGIN
    IF NEW.status = 'concluida' AND (OLD.status IS DISTINCT FROM NEW.status) THEN

        -- coleta feita -> solicitação "em_rota"; entrega feita -> "concluido"
        UPDATE solicitacoes
           SET status = CASE WHEN NEW.tipo = 'entrega' THEN 'concluido' ELSE 'em_rota' END
         WHERE id = NEW.solicitacao_id
        RETURNING cliente_id INTO v_cliente_id;

        INSERT INTO notificacoes (usuario_id, tipo, titulo, mensagem, referencia_tipo, referencia_id)
        VALUES (
            v_cliente_id,
            CASE WHEN NEW.tipo = 'entrega' THEN 'carga_concluida' ELSE 'status_solicitacao' END,
            'Atualização da sua solicitação',
            CASE WHEN NEW.tipo = 'entrega'
                 THEN 'Sua carga foi entregue. Obrigado por transportar com a Unitrans!'
                 ELSE 'Sua carga foi coletada e já está a caminho.'
            END,
            'solicitacao',
            NEW.solicitacao_id
        );

        -- se todas as paradas da carga já foram concluídas, a carga acabou
        SELECT count(*), count(*) FILTER (WHERE status = 'concluida')
          INTO total_paradas, concluidas
          FROM paradas
         WHERE carga_id = NEW.carga_id;

        IF concluidas = total_paradas THEN
            UPDATE cargas SET status = 'concluida' WHERE id = NEW.carga_id;
        ELSIF concluidas > 0 THEN
            UPDATE cargas SET status = 'andamento' WHERE id = NEW.carga_id AND status = 'pendente';
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_status_parada
    AFTER UPDATE ON paradas
    FOR EACH ROW EXECUTE FUNCTION sync_status_apos_parada();

-- ------------------------------------------------------------
-- VIEW: caminhões com licenciamento pendente/vencido
--
-- Isso é informação que "vence com o tempo" e não com uma
-- escrita no banco, então não dá pra virar trigger — quem
-- consulta essa view é um job diário (pg_cron ou um
-- setInterval/cron no backend) que insere um lembrete em
-- "notificacoes" pra equipe (tipo = 'A') quando encontrar
-- alguma linha aqui.
-- ------------------------------------------------------------
CREATE VIEW vw_caminhoes_licenciamento_pendente AS
SELECT placa, modelo, licenciamento_situacao, licenciamento_ultima_verificacao
FROM caminhoes
WHERE status <> 'inativo'
  AND (
        licenciamento_situacao <> 'regular'
        OR licenciamento_ultima_verificacao IS NULL
        OR licenciamento_ultima_verificacao < (CURRENT_DATE - INTERVAL '365 days')
      );