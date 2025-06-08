-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  participant_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT conversations_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES auth.users(id),
  CONSTRAINT conversations_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES auth.users(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  read_at timestamp with time zone,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id)
);
CREATE TABLE public.posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  description text,
  post_type text NOT NULL CHECK (post_type = ANY (ARRAY['vehicle'::text, 'realestate'::text, 'other'::text])),
  listing_type text NOT NULL CHECK (listing_type = ANY (ARRAY['sale'::text, 'rent'::text, 'other'::text])),
  category text NOT NULL,
  price numeric,
  currency text,
  location jsonb,
  images jsonb,
  details jsonb,
  status USER-DEFINED DEFAULT 'active'::post_status,
  expiry_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT auth.uid(),
  username text NOT NULL UNIQUE,
  full_name text,
  avatar_url text DEFAULT '''https://res.cloudinary.com/dtac4dhtj/image/upload/default_image_iqjmul.jpg''::text'::text,
  is_verified boolean DEFAULT false,
  user_type text NOT NULL CHECK (user_type = ANY (ARRAY['person'::text, 'company'::text])),
  created_at timestamp without time zone DEFAULT now(),
  email text NOT NULL UNIQUE,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);