-- Fonction RPC pour marquer un ticket comme scanné
CREATE OR REPLACE FUNCTION mark_ticket_scanned(
  ticket_id_param uuid,
  scanner_id_param uuid
) RETURNS jsonb AS $$
DECLARE
  updated_ticket tickets%ROWTYPE;
BEGIN
  -- Marquer le ticket comme scanné avec vérification atomique
  UPDATE tickets 
  SET 
    scanned_at = NOW(),
    scanned_by = scanner_id_param,
    status = 'scanned'
  WHERE id = ticket_id_param 
    AND scanned_at IS NULL  -- Éviter les doubles scans
    AND status = 'valid'
  RETURNING * INTO updated_ticket;
  
  IF NOT FOUND THEN
    -- Vérifier pourquoi l'update a échoué
    SELECT * INTO updated_ticket FROM tickets WHERE id = ticket_id_param;
    
    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'reason', 'ticket_not_found'
      );
    ELSIF updated_ticket.scanned_at IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'reason', 'already_scanned',
        'scanned_at', updated_ticket.scanned_at,
        'scanned_by', updated_ticket.scanned_by
      );
    ELSE
      RETURN jsonb_build_object(
        'success', false,
        'reason', 'invalid_status',
        'status', updated_ticket.status
      );
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'ticket', jsonb_build_object(
      'id', updated_ticket.id,
      'scanned_at', updated_ticket.scanned_at,
      'scanned_by', updated_ticket.scanned_by,
      'status', updated_ticket.status
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
