-- Drop the existing view if it exists
DROP VIEW IF EXISTS conversation_details;

-- Create the conversation details view
CREATE OR REPLACE VIEW conversation_details AS
SELECT 
    c.id,
    c.post_id,
    c.creator_id,
    c.participant_id,
    c.created_at,
    c.last_activity_date,
    c.deleted_by_creator,
    c.deleted_by_participant,
    c.unread_count_creator,
    c.unread_count_participant,
    p.title as post_title,
    p.images[1] as post_image,
    p.price as post_price,
    p.status as post_status,
    -- Dynamic user information based on current user
    CASE 
        WHEN c.creator_id = auth.uid() THEN participant.username
        ELSE creator.username
    END as other_user_name,
    CASE 
        WHEN c.creator_id = auth.uid() THEN participant.full_name
        ELSE creator.full_name
    END as other_user_full_name,
    CASE 
        WHEN c.creator_id = auth.uid() THEN participant.avatar_url
        ELSE creator.avatar_url
    END as other_user_avatar,
    CASE 
        WHEN c.creator_id = auth.uid() THEN participant.is_verified
        ELSE creator.is_verified
    END as other_user_is_verified,
    CASE 
        WHEN c.creator_id = auth.uid() THEN participant.user_type
        ELSE creator.user_type
    END as other_user_type,
    -- Get the latest message
    (
        SELECT content
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
    ) as last_message,
    -- Get unread count for current user
    CASE 
        WHEN c.creator_id = auth.uid() THEN c.unread_count_creator
        ELSE c.unread_count_participant
    END as unread_count
FROM conversations c
LEFT JOIN posts p ON c.post_id = p.id
LEFT JOIN users creator ON c.creator_id = creator.id
LEFT JOIN users participant ON c.participant_id = participant.id;

-- Add helpful comments
COMMENT ON VIEW conversation_details IS 'Provides a detailed view of conversations with user-specific information and unread counts';
COMMENT ON COLUMN conversation_details.other_user_name IS 'Username of the other participant in the conversation relative to the current user';
COMMENT ON COLUMN conversation_details.unread_count IS 'Number of unread messages for the current user in this conversation';
COMMENT ON COLUMN conversation_details.last_message IS 'Content of the most recent message in the conversation'; 