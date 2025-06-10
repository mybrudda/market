-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- Create a function to delete an image from Cloudinary
CREATE OR REPLACE FUNCTION delete_cloudinary_image(image_url TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    public_id TEXT;
    api_response JSONB;
BEGIN
    -- Extract public_id from the URL
    -- Example URL: https://res.cloudinary.com/dtac4dhtj/image/upload/v1234567890/abcdef123456.jpg
    public_id := regexp_replace(
        image_url,
        '^https://res\.cloudinary\.com/dtac4dhtj/image/upload/(?:v\d+/)?([^/]+)\.[^.]+$',
        '\1'
    );
    
    -- Log the public_id for debugging
    RAISE NOTICE 'Attempting to delete image with public_id: %', public_id;
    
    -- Make DELETE request to Cloudinary API using unsigned mode with upload preset
    SELECT content::jsonb INTO api_response
    FROM http((
        'POST',
        format('https://api.cloudinary.com/v1_1/dtac4dhtj/image/destroy'),
        ARRAY[
            ('Content-Type', 'application/json')
        ],
        'application/json',
        json_build_object(
            'public_id', public_id,
            'upload_preset', 'Default'
        )::text
    )::http_request);
    
    -- Log the API response for debugging
    RAISE NOTICE 'Cloudinary API response: %', api_response;
    
    -- Check if deletion was successful
    IF api_response->>'result' != 'ok' THEN
        RAISE NOTICE 'Failed to delete image: %', api_response->>'error'->>'message';
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Log any errors but don't stop the process
    RAISE NOTICE 'Error deleting image %: %', image_url, SQLERRM;
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
    image_urls TEXT[];
    deleted_count INTEGER := 0;
    failed_count INTEGER := 0;
BEGIN
    -- First, get all posts that need to be deleted
    FOR post_record IN 
        SELECT id, images, title 
        FROM posts 
        WHERE expiry_date < CURRENT_TIMESTAMP
        AND status IN ('removed', 'expired')
    LOOP
        -- Log the post being processed
        RAISE NOTICE 'Processing post ID: % - Title: %', post_record.id, post_record.title;
        
        -- Convert JSONB array to text array
        image_urls := ARRAY(SELECT jsonb_array_elements_text(post_record.images));
        
        -- Delete each image from Cloudinary
        IF image_urls IS NOT NULL THEN
            FOREACH image_url IN ARRAY image_urls
            LOOP
                BEGIN
                    PERFORM delete_cloudinary_image(image_url);
                    deleted_count := deleted_count + 1;
                EXCEPTION WHEN OTHERS THEN
                    failed_count := failed_count + 1;
                    RAISE NOTICE 'Failed to delete image % from post %: %', 
                        image_url, post_record.id, SQLERRM;
                END;
            END LOOP;
        END IF;
    END LOOP;

    -- Delete the posts from the database
    WITH deleted_posts AS (
        DELETE FROM posts
        WHERE expiry_date < CURRENT_TIMESTAMP
        AND status IN ('removed', 'expired')
        RETURNING id
    )
    SELECT count(*) INTO deleted_count FROM deleted_posts;

    -- Log the cleanup operation with detailed statistics
    INSERT INTO cleanup_logs (
        operation,
        rows_affected,
        details,
        executed_at
    )
    VALUES (
        'posts_cleanup',
        deleted_count,
        json_build_object(
            'images_deleted', deleted_count,
            'images_failed', failed_count,
            'timestamp', CURRENT_TIMESTAMP
        )::jsonb,
        CURRENT_TIMESTAMP
    );
    
    -- Log completion
    RAISE NOTICE 'Cleanup completed. Posts deleted: %, Images deleted: %, Images failed: %',
        deleted_count, deleted_count, failed_count;
END;
$$;

-- Update cleanup_logs table to include details column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'cleanup_logs' 
        AND column_name = 'details'
    ) THEN
        ALTER TABLE cleanup_logs ADD COLUMN details JSONB;
    END IF;
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_posts() TO postgres;
GRANT EXECUTE ON FUNCTION delete_cloudinary_image(TEXT) TO postgres;
GRANT ALL ON TABLE cleanup_logs TO postgres;

-- Schedule the cron job to run daily at 3 AM UTC
SELECT cron.schedule(
    'cleanup-expired-posts',
    '0 3 * * *',
    'SELECT cleanup_expired_posts()'
); 