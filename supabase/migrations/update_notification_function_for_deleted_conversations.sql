-- Migration: Update should_send_notification function to check if conversation is deleted
-- This prevents users from receiving notifications for conversations they've deleted


-- Function to check if user should receive notifications
CREATE OR REPLACE FUNCTION public.should_send_notification(
    p_recipient_id UUID,
    p_sender_id UUID,
    p_notification_type TEXT DEFAULT 'message',
    p_conversation_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_blocked BOOLEAN;
    v_settings RECORD;
    v_conversation RECORD;
BEGIN
    -- Check if sender is blocked by recipient
    SELECT EXISTS (
        SELECT 1 FROM public.blocked_users
        WHERE blocker_id = p_recipient_id AND blocked_id = p_sender_id
    ) INTO v_is_blocked;

    IF v_is_blocked THEN
        RETURN FALSE;
    END IF;

    -- Check if conversation has been deleted by recipient (only for message notifications)
    IF p_notification_type = 'message' AND p_conversation_id IS NOT NULL THEN
        SELECT * INTO v_conversation
        FROM public.conversations
        WHERE id = p_conversation_id;

        IF v_conversation IS NOT NULL THEN
            -- Check if recipient deleted the conversation
            IF v_conversation.creator_id = p_recipient_id THEN
                -- Recipient is the creator, check if they deleted it
                IF v_conversation.deleted_by_creator THEN
                    RETURN FALSE;
                END IF;
            ELSIF v_conversation.participant_id = p_recipient_id THEN
                -- Recipient is the participant, check if they deleted it
                IF v_conversation.deleted_by_participant THEN
                    RETURN FALSE;
                END IF;
            END IF;
        END IF;
    END IF;

    -- Get notification settings
    SELECT * INTO v_settings
    FROM public.notification_settings
    WHERE user_id = p_recipient_id;

    -- If no settings found, use defaults (allow notifications)
    IF v_settings IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Check if notifications are disabled for this type
    IF p_notification_type = 'message' AND NOT v_settings.message_notifications THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;

