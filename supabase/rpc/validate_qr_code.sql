-- Fonction RPC pour valider un QR code avec vérification HMAC
CREATE OR REPLACE FUNCTION validate_qr_code(
  qr_data text,
  event_id_param integer
) RETURNS jsonb AS $$
DECLARE
  ticket_record tickets%ROWTYPE;
  event_hmac text;
  calculated_hmac text;
  message_to_verify text;
  ticket_index integer;
BEGIN
  -- Récupérer la clé HMAC de l'événement
  SELECT hmac_token INTO event_hmac
  FROM events 
  WHERE id = event_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', false, 
      'reason', 'event_not_found'
    );
  END IF;
  
  -- Rechercher le ticket correspondant en vérifiant le HMAC
  FOR ticket_record IN 
    SELECT * FROM tickets 
    WHERE event_id = event_id_param 
      AND status = 'valid'
      AND scanned_at IS NULL
  LOOP
    -- Calculer l'index du ticket dans la commande pour ce produit
    SELECT (ROW_NUMBER() OVER (ORDER BY created_at) - 1) INTO ticket_index
    FROM tickets t2 
    WHERE t2.order_id = ticket_record.order_id 
      AND t2.product_id = ticket_record.product_id 
      AND t2.id <= ticket_record.id;
    
    -- Reconstituer le message pour ce ticket (format: order_id:product_id:index)
    message_to_verify := ticket_record.order_id::text || ':' || 
                        ticket_record.product_id::text || ':' || 
                        ticket_index::text;
    
    -- Calculer le HMAC attendu
    calculated_hmac := encode(hmac(message_to_verify, event_hmac, 'sha256'), 'hex');
    
    -- Vérifier si le QR code correspond au HMAC calculé
    IF calculated_hmac = qr_data THEN
      -- Ticket valide trouvé
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
    END IF;
  END LOOP;
  
  -- Vérifier si le QR code correspond à un ticket déjà scanné
  FOR ticket_record IN 
    SELECT * FROM tickets 
    WHERE event_id = event_id_param 
      AND scanned_at IS NOT NULL
  LOOP
    -- Calculer l'index du ticket pour vérification
    SELECT (ROW_NUMBER() OVER (ORDER BY created_at) - 1) INTO ticket_index
    FROM tickets t2 
    WHERE t2.order_id = ticket_record.order_id 
      AND t2.product_id = ticket_record.product_id 
      AND t2.id <= ticket_record.id;
    
    message_to_verify := ticket_record.order_id::text || ':' || 
                        ticket_record.product_id::text || ':' || 
                        ticket_index::text;
    
    calculated_hmac := encode(hmac(message_to_verify, event_hmac, 'sha256'), 'hex');
    
    IF calculated_hmac = qr_data THEN
      -- Ticket déjà scanné
      RETURN jsonb_build_object(
        'valid', false, 
        'reason', 'already_scanned',
        'scanned_at', ticket_record.scanned_at,
        'scanned_by', ticket_record.scanned_by
      );
    END IF;
  END LOOP;
  
  -- Aucun ticket correspondant trouvé - QR code invalide ou contrefait
  RETURN jsonb_build_object(
    'valid', false, 
    'reason', 'ticket_not_found_or_invalid_hmac'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
