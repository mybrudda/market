-- Push Notifications Schema for Expo Push Service (migrated to public.users)
-- This migration first drops all old objects, then recreates them to reference public.users(id)
-- FIXED: One user can be connected to multiple devices, but multiple users cannot be connected to one device

-- 1. DROP OLD OBJECTS

-- Drop triggers and their functions first (they depend on tables)
DROP TRIGGER IF EXISTS on_new_user_notification_settings ON public.users;
DROP FUNCTION IF EXISTS public.handle_new_user_notification_settings();

-- Drop all functions that depend on tables
DROP FUNCTION IF EXISTS public.create_default_notification_settings();
DROP FUNCTION IF EXISTS public.should_send_notification(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.get_user_expo_push_tokens(UUID);
DROP FUNCTION IF EXISTS public.register_expo_push_token(TEXT, TEXT);

-- Drop policies (that depend on tables)
DROP POLICY IF EXISTS "Users can manage their own push tokens" ON public.push_tokens;
DROP POLICY IF EXISTS "Users can manage their own notification settings" ON public.notification_settings;

-- Drop tables (last, since everything else depends on them)
DROP TABLE IF EXISTS public.push_tokens CASCADE;
DROP TABLE IF EXISTS public.notification_settings CASCADE;

-- 2. RECREATE OBJECTS WITH public.users(id)

-- Push tokens table: one user per device, but user can have many devices
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    expo_push_token TEXT NOT NULL,
    device_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(device_id)
);

CREATE TABLE IF NOT EXISTS public.notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message_notifications BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_expo_token ON public.push_tokens(expo_push_token);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON public.push_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON public.notification_settings(user_id);

-- Enable RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own push tokens"
    ON public.push_tokens
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own notification settings"
    ON public.notification_settings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Function to register/update Expo push token with device transfer logic
CREATE OR REPLACE FUNCTION public.register_expo_push_token(
    p_expo_push_token TEXT,
    p_device_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_token_id UUID;
    v_existing_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    IF p_device_id IS NOT NULL THEN
        SELECT user_id INTO v_existing_user_id
        FROM public.push_tokens
        WHERE device_id = p_device_id AND is_active = true;

        IF v_existing_user_id IS NOT NULL AND v_existing_user_id != v_user_id THEN
            UPDATE public.push_tokens
            SET 
                user_id = v_user_id,
                expo_push_token = p_expo_push_token,
                updated_at = now()
            WHERE device_id = p_device_id
            RETURNING id INTO v_token_id;
        ELSE
            SELECT id INTO v_token_id
            FROM public.push_tokens
            WHERE user_id = v_user_id AND device_id = p_device_id;

            IF v_token_id IS NOT NULL THEN
                UPDATE public.push_tokens
                SET 
                    expo_push_token = p_expo_push_token,
                    updated_at = now()
                WHERE id = v_token_id;
            ELSE
                INSERT INTO public.push_tokens (user_id, expo_push_token, device_id)
                VALUES (v_user_id, p_expo_push_token, p_device_id)
                RETURNING id INTO v_token_id;
            END IF;
        END IF;
    ELSE
        INSERT INTO public.push_tokens (user_id, expo_push_token, device_id)
        VALUES (v_user_id, p_expo_push_token, p_device_id)
        RETURNING id INTO v_token_id;
    END IF;

    RETURN v_token_id;
END;
$$;

-- Function to get active Expo push tokens for a user
CREATE OR REPLACE FUNCTION public.get_user_expo_push_tokens(p_user_id UUID)
RETURNS TABLE(expo_push_token TEXT, device_id TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT pt.expo_push_token, pt.device_id
    FROM public.push_tokens pt
    WHERE pt.user_id = p_user_id 
    AND pt.is_active = true
    ORDER BY pt.updated_at DESC;
$$;

-- Function to check if user should receive notifications
CREATE OR REPLACE FUNCTION public.should_send_notification(
    p_recipient_id UUID,
    p_sender_id UUID,
    p_notification_type TEXT DEFAULT 'message'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_blocked BOOLEAN;
    v_settings RECORD;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.blocked_users
        WHERE blocker_id = p_recipient_id AND blocked_id = p_sender_id
    ) INTO v_is_blocked;

    IF v_is_blocked THEN
        RETURN FALSE;
    END IF;

    SELECT * INTO v_settings
    FROM public.notification_settings
    WHERE user_id = p_recipient_id;

    IF v_settings IS NULL THEN
        RETURN TRUE;
    END IF;

    IF p_notification_type = 'message' AND NOT v_settings.message_notifications THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;

-- Function to create default notification settings
CREATE OR REPLACE FUNCTION public.create_default_notification_settings()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_settings_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    SELECT id INTO v_settings_id
    FROM public.notification_settings
    WHERE user_id = v_user_id;

    IF v_settings_id IS NULL THEN
        INSERT INTO public.notification_settings (user_id)
        VALUES (v_user_id)
        RETURNING id INTO v_settings_id;
    END IF;

    RETURN v_settings_id;
END;
$$;

-- Trigger to create default notification settings when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_notification_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.notification_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Create trigger for new users (on public.users)
DROP TRIGGER IF EXISTS on_new_user_notification_settings ON public.users;
CREATE TRIGGER on_new_user_notification_settings
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_notification_settings(); 