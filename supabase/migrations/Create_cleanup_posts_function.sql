-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_posts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete posts where:
    -- 1. expiry_date has passed AND
    -- 2. status is either 'removed' or 'expired'
    DELETE FROM posts
    WHERE expiry_date < CURRENT_TIMESTAMP
      AND status IN ('removed', 'expired');

    -- Log the cleanup (optional)
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
GRANT ALL ON TABLE cleanup_logs TO postgres; 