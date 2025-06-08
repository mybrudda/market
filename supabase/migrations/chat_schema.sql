-- Create conversations table
CREATE TABLE conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL,
    creator_id UUID NOT NULL,
    participant_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT conversations_post_id_fkey FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT conversations_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT conversations_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT unique_conversation UNIQUE(post_id, creator_id, participant_id)
);

-- Create messages table
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    read_at TIMESTAMPTZ,
    CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_conversations_creator ON conversations(creator_id);
CREATE INDEX idx_conversations_participant ON conversations(participant_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- Enable realtime for messages and conversations
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- Create a function to update the conversations updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update the conversations updated_at timestamp
CREATE TRIGGER update_conversation_timestamp
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- Set up Row Level Security (RLS)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for conversations
CREATE POLICY "Users can view their own conversations"
ON conversations
FOR SELECT
USING (auth.uid() = creator_id OR auth.uid() = participant_id);

CREATE POLICY "Users can create conversations"
ON conversations
FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own conversations"
ON conversations
FOR UPDATE
USING (auth.uid() = creator_id OR auth.uid() = participant_id);

-- Create policies for messages
CREATE POLICY "Users can view messages in their conversations"
ON messages
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM conversations
        WHERE conversations.id = messages.conversation_id
        AND (conversations.creator_id = auth.uid() OR conversations.participant_id = auth.uid())
    )
);

CREATE POLICY "Users can insert messages in their conversations"
ON messages
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM conversations
        WHERE conversations.id = conversation_id
        AND (conversations.creator_id = auth.uid() OR conversations.participant_id = auth.uid())
    )
    AND auth.uid() = sender_id
);

-- Create a view for easier conversation querying with last message
CREATE VIEW conversation_details AS
SELECT 
    c.*,
    p.title as post_title,
    p.images[0] as post_image,
    p.price as post_price,
    CASE 
        WHEN auth.uid() = c.creator_id THEN participant.username
        ELSE creator.username
    END as other_user_name,
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
JOIN users participant ON c.participant_id = participant.id; 