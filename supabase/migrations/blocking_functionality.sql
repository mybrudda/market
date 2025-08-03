-- First, drop existing objects if they exist
DROP FUNCTION IF EXISTS public.is_user_blocked(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_message_user(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_view_conversation(uuid, uuid);
DROP FUNCTION IF EXISTS public.handle_user_blocked();
DROP FUNCTION IF EXISTS public.prevent_blocked_messages();

DROP TRIGGER IF EXISTS on_user_blocked ON public.blocked_users;
DROP TRIGGER IF EXISTS prevent_blocked_messages ON public.messages;

DROP TABLE IF EXISTS public.blocked_users;

-- Create blocked_users table
CREATE TABLE public.blocked_users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    blocker_id uuid NOT NULL,
    blocked_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT blocked_users_pkey PRIMARY KEY (id),
    CONSTRAINT blocked_users_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.users(id),
    CONSTRAINT blocked_users_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.users(id),
    CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
);

-- Add indexes for better query performance
CREATE INDEX idx_blocked_users_blocker_id ON public.blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked_id ON public.blocked_users(blocked_id);

-- Add RLS policies
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks"
    ON public.blocked_users
    FOR SELECT
    USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

CREATE POLICY "Users can create their own blocks"
    ON public.blocked_users
    FOR INSERT
    WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks"
    ON public.blocked_users
    FOR DELETE
    USING (auth.uid() = blocker_id);

-- Create function to check if a user is blocked
CREATE OR REPLACE FUNCTION public.is_user_blocked(blocker_id uuid, blocked_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.blocked_users
        WHERE (blocker_id = $1 AND blocked_id = $2)
        OR (blocker_id = $2 AND blocked_id = $1)
    );
$$;

-- Create function to check if a user can message another user
CREATE OR REPLACE FUNCTION public.can_message_user(sender_id uuid, receiver_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT NOT EXISTS (
        SELECT 1 FROM public.blocked_users
        WHERE (blocker_id = $2 AND blocked_id = $1)
        OR (blocker_id = $1 AND blocked_id = $2)
    );
$$;

-- Create function to check if a user can view a conversation
CREATE OR REPLACE FUNCTION public.can_view_conversation(user_id uuid, conversation_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = $2
        AND (
            (c.creator_id = $1 AND NOT c.deleted_by_creator)
            OR (c.participant_id = $1 AND NOT c.deleted_by_participant)
        )
    );
$$;

-- Create function to handle blocking
CREATE OR REPLACE FUNCTION public.handle_user_blocked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update conversation visibility for the blocker
    UPDATE public.conversations
    SET deleted_by_creator = CASE 
        WHEN creator_id = NEW.blocker_id THEN true
        ELSE deleted_by_creator
    END,
    deleted_by_participant = CASE 
        WHEN participant_id = NEW.blocker_id THEN true
        ELSE deleted_by_participant
    END
    WHERE (creator_id = NEW.blocker_id AND participant_id = NEW.blocked_id)
    OR (creator_id = NEW.blocked_id AND participant_id = NEW.blocker_id);

    RETURN NEW;
END;
$$;

-- Create function to prevent messages from blocked users
CREATE OR REPLACE FUNCTION public.prevent_blocked_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.blocked_users
        WHERE (blocker_id = (
            SELECT CASE 
                WHEN c.creator_id = NEW.sender_id THEN c.participant_id
                ELSE c.creator_id
            END
            FROM public.conversations c
            WHERE c.id = NEW.conversation_id
        )
        AND blocked_id = NEW.sender_id)
        OR (blocked_id = (
            SELECT CASE 
                WHEN c.creator_id = NEW.sender_id THEN c.participant_id
                ELSE c.creator_id
            END
            FROM public.conversations c
            WHERE c.id = NEW.conversation_id
        )
        AND blocker_id = NEW.sender_id)
    ) THEN
        RAISE EXCEPTION 'Cannot send message: User is blocked';
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for when a user is blocked
CREATE TRIGGER on_user_blocked
    AFTER INSERT ON public.blocked_users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_blocked();

-- Create trigger to prevent messages from blocked users
CREATE TRIGGER prevent_blocked_messages
    BEFORE INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_blocked_messages(); 