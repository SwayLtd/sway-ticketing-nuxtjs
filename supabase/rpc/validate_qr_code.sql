-- Fonction RPC pour valider un QR code
CREATE OR REPLACE FUNCTION validate_qr_code(
  qr_data text,
  event_id_param integer,
  hmac_key text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  ticket_record tickets%ROWTYPE;
  calculated_hmac text;
  is_valid boolean := false;
BEGIN
  -- Rechercher le ticket par QR code et event_id
  SELECT * INTO ticket_record 
  FROM tickets 
  WHERE qr_code_data = qr_data AND event_id = event_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false, 
      'reason', 'ticket_not_found'
    );
  END IF;
  
  -- Vérifier si déjà scanné
  IF ticket_record.scanned_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'valid', false, 
      'reason', 'already_scanned',
      'scanned_at', ticket_record.scanned_at,
      'scanned_by', ticket_record.scanned_by
    );
  END IF;
  
  -- Vérifier le statut
  IF ticket_record.status != 'valid' THEN
    RETURN jsonb_build_object(
      'valid', false, 
      'reason', 'invalid_status',
      'status', ticket_record.status
    );
  END IF;
  
  -- TODO: Vérification HMAC (à implémenter selon la logique métier)
  -- calculated_hmac := hmac(ticket_record.order_id || ticket_record.product_id, hmac_key, 'sha256');
  
  -- Retourner les informations du ticket valide
  RETURN jsonb_build_object(
    'valid', true,
    'ticket', jsonb_build_object(
      'id', ticket_record.id,
      'order_id', ticket_record.order_id,
      'product_id', ticket_record.product_id,
      'event_id', ticket_record.event_id,
      'customization_data', ticket_record.customization_data
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
