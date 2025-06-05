-- Create conversations table
CREATE TABLE conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, creator_id, participant_id)
);

-- Create messages table
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Create indexes for better query performance
CREATE INDEX idx_conversations_creator ON conversations(creator_id);
CREATE INDEX idx_conversations_participant ON conversations(participant_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);

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

-- Create views for easier querying
CREATE VIEW conversation_details AS
SELECT 
    c.*,
    p.title as post_title,
    p.images as post_images,
    CASE 
        WHEN auth.uid() = c.creator_id THEN participant.username
        ELSE creator.username
    END as other_user_name,
    CASE 
        WHEN auth.uid() = c.creator_id THEN participant.avatar_url
        ELSE creator.avatar_url
    END as other_user_avatar,
    (
        SELECT content 
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
    ) as last_message
FROM conversations c
JOIN posts p ON c.post_id = p.id
JOIN auth.users creator ON c.creator_id = creator.id
JOIN auth.users participant ON c.participant_id = participant.id; 