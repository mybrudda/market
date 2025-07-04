-- Create saved_posts table
CREATE TABLE public.saved_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL,
  saved_at timestamp with time zone DEFAULT now(),
  CONSTRAINT saved_posts_pkey PRIMARY KEY (id),
  CONSTRAINT saved_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT saved_posts_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE,
  CONSTRAINT saved_posts_unique UNIQUE (user_id, post_id) -- prevents duplicate saves
);

-- Create function to check if user is trying to save their own post
CREATE OR REPLACE FUNCTION check_not_own_post()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.posts 
    WHERE id = NEW.post_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Cannot save your own post';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent saving own posts
CREATE TRIGGER prevent_save_own_post
  BEFORE INSERT ON public.saved_posts
  FOR EACH ROW
  EXECUTE FUNCTION check_not_own_post();

-- Add RLS (Row Level Security) policies
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own saved posts
CREATE POLICY "Users can view their own saved posts" ON public.saved_posts
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert their own saved posts
CREATE POLICY "Users can insert their own saved posts" ON public.saved_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own saved posts
CREATE POLICY "Users can delete their own saved posts" ON public.saved_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_saved_posts_user_id ON public.saved_posts(user_id);
CREATE INDEX idx_saved_posts_post_id ON public.saved_posts(post_id);
CREATE INDEX idx_saved_posts_saved_at ON public.saved_posts(saved_at); 