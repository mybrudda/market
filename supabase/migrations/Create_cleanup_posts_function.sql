-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- Create a function to delete an image from Cloudinary
-- images are currently deleted using unsigned mode but should be later changed to signed mode
CREATE OR REPLACE FUNCTION delete_cloudinary_image(image_url TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    public_id TEXT;
BEGIN
    -- Extract public_id from the URL
    public_id := regexp_replace(image_url, '^https://res.cloudinary.com/dtac4dhtj/image/upload/.*?/([^/]+)\.[^.]+$', '\1');
    
    -- Make DELETE request to Cloudinary API using unsigned mode
    PERFORM http_delete(
        'https://api.cloudinary.com/v1_1/dtac4dhtj/image/destroy/' || public_id || '?upload_preset=Default'
    );
END;
$$;

-- Create the cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    post_record RECORD;
    image_url TEXT;
BEGIN
    -- First, get all posts that need to be deleted
    FOR post_record IN 
        SELECT id, images 
        FROM posts 
        WHERE expiry_date < CURRENT_TIMESTAMP
        AND status IN ('removed', 'expired')
    LOOP
        -- Delete each image from Cloudinary
        IF post_record.images IS NOT NULL THEN
            FOREACH image_url IN ARRAY post_record.images
            LOOP
                BEGIN
                    PERFORM delete_cloudinary_image(image_url);
                EXCEPTION WHEN OTHERS THEN
                    -- Log error but continue with other images
                    RAISE NOTICE 'Failed to delete image %: %', image_url, SQLERRM;
                END;
            END LOOP;
        END IF;
    END LOOP;

    -- Then delete the posts from the database
    DELETE FROM posts
    WHERE expiry_date < CURRENT_TIMESTAMP
    AND status IN ('removed', 'expired');

    -- Log the cleanup
    INSERT INTO cleanup_logs (operation, rows_affected, executed_at)
    VALUES (
        'posts_cleanup',
        (SELECT count(*) FROM posts 
         WHERE expiry_date < CURRENT_TIMESTAMP
           AND status IN ('removed', 'expired')),
        CURRENT_TIMESTAMP
    );
END;
$$;

-- Create a table to track cleanup operations (optional but recommended for monitoring)
CREATE TABLE IF NOT EXISTS cleanup_logs (
    id BIGSERIAL PRIMARY KEY,
    operation TEXT NOT NULL,
    rows_affected INTEGER NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Schedule the cron job to run daily at 3 AM UTC
SELECT cron.schedule(
    'cleanup-expired-posts', -- unique job name
    '0 3 * * *',           -- cron schedule (every day at 3 AM)
    'SELECT cleanup_expired_posts()'
);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_posts() TO postgres;
GRANT EXECUTE ON FUNCTION delete_cloudinary_image(TEXT) TO postgres;
GRANT ALL ON TABLE cleanup_logs TO postgres; 