# Market Application

This document outlines the key features and management systems of the marketplace application.

## Table of Contents
1. [Post Management](#post-management)
2. [Chat System](#chat-system)
3. [Automated Cleanup](#automated-cleanup)
4. [Soft Deletion Mechanisms](#soft-deletion-mechanisms)
5. [Database Views](#database-views)
6. [Monitoring](#monitoring)

## Post Management

### Post Status Types
Posts can have one of the following statuses:
- `active`: Post is visible and available
- `expired`: Post has reached its expiry date
- `removed`: Post has been soft-deleted by the user
- `pending`: Post is awaiting approval/review

### Post Deletion Mechanism
- When a user "deletes" a post, it's not immediately removed from the database
- Instead, its status is changed to `removed`
- Posts marked as `removed` remain in the database until their expiry date passes

## Chat System

### Conversation Management
The chat system implements a soft deletion mechanism that allows:
- Independent deletion by both creator and participant
- Preservation of chat history for the other party
- Proper handling of post status in conversations

### Soft Deletion in Conversations
The system uses two boolean fields to manage conversation visibility:
- `deleted_by_creator`: Tracks if the creator has deleted the conversation
- `deleted_by_participant`: Tracks if the participant has deleted the conversation

When a user deletes a conversation:
1. The appropriate field is set to `true` based on their role
2. The conversation becomes hidden for that user only
3. The other user can still access the conversation normally
4. No actual data is deleted from the database

Example:
```sql
-- When creator deletes the conversation
UPDATE conversations
SET deleted_by_creator = true
WHERE id = 'conversation_id';

-- When participant deletes the conversation
UPDATE conversations
SET deleted_by_participant = true
WHERE id = 'conversation_id';
```

### Conversation Visibility
The `conversation_details` view handles visibility rules:
```sql
WHERE 
    (auth.uid() = c.creator_id AND NOT c.deleted_by_creator) OR
    (auth.uid() = c.participant_id AND NOT c.deleted_by_participant)
```

This ensures:
- Users only see conversations they haven't deleted
- Deletion actions are independent for each user
- Data integrity is maintained for both parties

## Automated Cleanup

### Cleanup Process
A GitHub Actions workflow (`cleanup-posts.yml`) runs daily at 3 AM UTC to handle permanent deletion:

1. Image Cleanup:
   - Deletes images from Cloudinary for expired/removed posts
   - Tracks and verifies each deletion
   - Logs failed deletions

2. Post Deletion:
   ```sql
   DELETE FROM posts
   WHERE expiry_date < CURRENT_TIMESTAMP
     AND status IN ('removed', 'expired');
   ```

### Cleanup Logging
Operations are logged in the `cleanup_logs` table:
- Number of posts/images deleted
- Timestamp and operation type
- Error information (if any)

## Monitoring

### Cleanup Monitoring
```sql
SELECT * FROM cleanup_logs ORDER BY executed_at DESC;
```

### Required Secrets
Set these in your GitHub repository:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_CLOUD_NAME`

## Error Handling

The system includes robust error handling:
- Failed deletions are logged
- Operations are verified
- Administrators are alerted of issues
- Cleanup jobs can be manually triggered

## Important Notes

1. Soft deletion preserves data while hiding it from users
2. Conversations implement independent deletion for each user
3. Posts are permanently deleted only after expiry
4. All operations are logged for monitoring
5. The system maintains data integrity throughout
6. Real-time updates reflect deletion status changes 