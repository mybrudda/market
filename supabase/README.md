# Post Management System

This document outlines how post deletion and status management works in the marketplace app.

## Post Status Types

Posts can have one of the following statuses:
- `active`: Post is visible and available
- `expired`: Post has reached its expiry date
- `removed`: Post has been soft-deleted by the user
- `pending`: Post is awaiting approval/review

## Deletion Mechanism

### Soft Delete
- When a user "deletes" a post, it's not immediately removed from the database
- Instead, its status is changed to `removed`
- Posts marked as `removed` remain in the database until their expiry date passes

### Automatic Cleanup
A scheduled cron job (`cleanup_expired_posts`) runs daily at 3 AM UTC to handle permanent deletion:

```sql
DELETE FROM posts
WHERE expiry_date < CURRENT_TIMESTAMP
  AND status IN ('removed', 'expired');
```

The job will permanently delete posts that meet BOTH conditions:
1. The post's expiry_date has passed
2. The post's status is either 'removed' or 'expired'

### Cleanup Logging
- Each cleanup operation is logged in the `cleanup_logs` table
- Logs include:
  - Number of posts deleted
  - Timestamp of the cleanup
  - Operation type

## Chat/Message Handling

When a post is no longer active (status is not 'active'):
1. The post remains visible in conversations but is marked as "no longer available"
2. The post image is replaced with a placeholder and shown with reduced opacity
3. Users can still access the chat history
4. The conversation remains functional for communication

## Database Views

### conversation_details
- Includes `post_status` to track post availability
- Used to display appropriate UI elements in the chat interface
- Helps maintain conversation context even after post removal

## Migration Files


1. `20240321000000_create_cleanup_posts_function.sql`: Creates the cleanup function and cron job
2. `20240321000001_update_conversation_details.sql`: Updates view to include post status

## Monitoring

You can monitor the cleanup operations by querying the cleanup_logs table:
```sql
SELECT * FROM cleanup_logs ORDER BY executed_at DESC;
```

## Important Notes

1. Posts are not immediately deleted when marked as 'removed'
2. Both expiry date and status conditions must be met for permanent deletion
3. Conversations are preserved even after post deletion
4. The cleanup job runs automatically and requires no manual intervention 