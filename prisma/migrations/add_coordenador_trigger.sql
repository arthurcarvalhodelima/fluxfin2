-- Trigger para garantir pelo menos 1 COORDENADOR por projeto na tabela EquipeProjeto
-- Executa após INSERT ou DELETE e verifica se ainda existe ao menos um COORDENADOR

CREATE OR REPLACE FUNCTION check_coordenador_exists()
RETURNS TRIGGER AS $$
DECLARE
    projeto_id UUID;
    coordenador_count INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        projeto_id := OLD."projetoId";
    ELSE
        projeto_id := NEW."projetoId";
    END IF;

    SELECT COUNT(*) INTO coordenador_count
    FROM "EquipeProjeto"
    WHERE "projetoId" = projeto_id AND "papel" = 'COORDENADOR';

    IF coordenador_count = 0 THEN
        RAISE EXCEPTION 'A equipe deve ter pelo menos um COORDENADOR';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger anterior se existir
DROP TRIGGER IF EXISTS trg_check_coordenador ON "EquipeProjeto";

-- Criar trigger que executa após INSERT e DELETE
CREATE TRIGGER trg_check_coordenador
    AFTER INSERT OR DELETE ON "EquipeProjeto"
    FOR EACH ROW
    EXECUTE FUNCTION check_coordenador_exists();
