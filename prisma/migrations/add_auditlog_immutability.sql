-- Trigger para proteger AuditLog contra UPDATE e DELETE
-- Registros de auditoria são imutáveis e não devem ser alterados

CREATE OR REPLACE FUNCTION prevent_auditlog_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Registros de auditoria são imutáveis e não podem ser alterados';
    END IF;
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Registros de auditoria são imutáveis e não podem ser excluídos';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger anterior se existir
DROP TRIGGER IF EXISTS trg_prevent_auditlog_modification ON "AuditLog";

-- Criar trigger que bloqueia UPDATE e DELETE
CREATE TRIGGER trg_prevent_auditlog_modification
    BEFORE UPDATE OR DELETE ON "AuditLog"
    FOR EACH ROW
    EXECUTE FUNCTION prevent_auditlog_modification();
