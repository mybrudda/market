-- Drop the existing view
DROP VIEW IF EXISTS conversation_details;

-- Recreate the view with post status
CREATE VIEW conversation_details AS
SELECT 
    c.*,
    p.title as post_title,
    p.images[0] as post_image,
    p.price as post_price,
    p.status as post_status,
    CASE 
        WHEN auth.uid() = c.creator_id THEN participant.username
        ELSE creator.username
    END as other_user_name,
    CASE 
        WHEN auth.uid() = c.creator_id THEN participant.full_name
        ELSE creator.full_name
    END as other_user_full_name,
    CASE 
        WHEN auth.uid() = c.creator_id THEN participant.avatar_url
        ELSE creator.avatar_url
    END as other_user_avatar,
    CASE 
        WHEN auth.uid() = c.creator_id THEN participant.is_verified
        ELSE creator.is_verified
    END as other_user_is_verified,
    CASE 
        WHEN auth.uid() = c.creator_id THEN participant.user_type
        ELSE creator.user_type
    END as other_user_type,
    (
        SELECT row_to_json(last_message) FROM (
            SELECT content, created_at, read_at
            FROM messages m
            WHERE m.conversation_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
        ) last_message
    ) as last_message,
    (
        SELECT COUNT(*)
        FROM messages m
        WHERE m.conversation_id = c.id
        AND m.sender_id != auth.uid()
        AND m.read_at IS NULL
    ) as unread_count
FROM conversations c
JOIN posts p ON c.post_id = p.id
JOIN users creator ON c.creator_id = creator.id
JOIN users participant ON c.participant_id = participant.id
WHERE 
    -- Only show conversations that haven't been deleted by the current user
    (auth.uid() = c.creator_id AND NOT c.deleted_by_creator) OR
    (auth.uid() = c.participant_id AND NOT c.deleted_by_participant);