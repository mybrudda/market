# Market Application

This document outlines the key features and management systems of the marketplace application.

## Table of Contents
1. [Post Management](#post-management)
2. [Chat System](#chat-system)
3. [Automated Cleanup](#automated-cleanup)
4. [Soft Deletion Mechanisms](#soft-deletion-mechanisms)
5. [Database Views](#database-views)
6. [Monitoring](#monitoring)
7. [User Blocking System](#user-blocking-system)

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

### How It Works

The chat system connects buyers and sellers through a seamless messaging experience. Here's how it works:

#### Messaging Flow
1. When viewing a listing, potential buyers can start a conversation with the seller
2. Each chat is connected to a specific listing, keeping conversations organized
3. Messages are delivered instantly to both users
4. Users receive notifications when they have new messages
5. The Messages tab shows a red badge with the total number of unread messages

#### Conversation Features
- **Real-Time Updates**: Messages appear instantly without needing to refresh
- **Read Status**: Users can see when their messages have been read
- **Post Context**: The related listing's details stay visible in the chat
- **Message History**: Full chat history is maintained for reference

#### Conversation Management
- **Deleting Conversations**
  - Users can swipe left on any conversation to delete it
  - Deleted conversations are completely hidden from your view
  - Deletion is personal - the other user can still see the conversation
  - New messages in deleted conversations won't make them reappear
  - You won't see unread message counts for deleted conversations
  - The other user's experience remains unchanged

- **Organization**
  - Chats are sorted by most recent activity
  - Each conversation shows:
    - The other user's profile picture and name
    - A preview of the last message
    - The listing's title and image
    - Unread message count (for non-deleted conversations)
    - Time of last message

#### Unread Messages System
- Each active conversation shows its own unread message count
- The Messages tab shows the total number of unread messages
- Counts update automatically when messages are read
- Red badges make it easy to spot new messages
- Deleted conversations never show unread counts

#### Privacy Features
- Conversations are private between buyer and seller
- Users can permanently hide conversations from their view
- Deletion is one-sided - the other person's view stays intact
- Chat history is preserved for record-keeping
- Deleted conversations stay hidden even if new messages arrive

#### User Experience
- **For Buyers**:
  - Easy to contact sellers about listings
  - Keep conversations organized by hiding completed ones
  - See unread counts only for active conversations
  - Quick access to listing details while chatting

- **For Sellers**:
  - Manage multiple buyer conversations
  - Hide conversations for sold items
  - Keep active inquiries separate from old ones
  - Respond quickly to active inquiries

### Using the Chat

1. **Starting a Chat**
   - Find an interesting listing
   - Click "Message Seller"
   - Type your message
   - The conversation appears in your Messages tab

2. **Managing Conversations**
   - Open the Messages tab to see all your active chats
   - Swipe left on any conversation to permanently hide it
   - Hidden conversations won't reappear with new messages
   - Focus on your active conversations without clutter

3. **During a Chat**
   - Messages send instantly
   - See when the other person has read your messages
   - The listing details stay visible at the top
   - Previous messages are available for context

### Coming Soon
We're planning to add more features like:
- Sharing images in chats
- Message reactions
- Quick replies
- Better search options
- Message organization tools
- Enhanced notifications

## User Blocking System

### Overview
The blocking system allows users to control their interactions by blocking other users. When a user is blocked, they cannot:
- Send messages to the blocker
- Start new conversations with the blocker

### How Blocking Works

#### Blocking a User
1. Users can block others from:
   - The chat room menu
2. Blocking is immediate and takes effect right away
3. The blocked user is not notified of being blocked

#### Blocked Users Management
- Access the blocked users list from your profile
- View all users you've blocked
- Unblock users at any time
- See blocked users' basic profile information
- Refresh the list to see updates

#### Blocking Effects
- **Messages**:
  - Blocked users cannot send new messages
  - Existing conversations are preserved but blocked users cannot send new messages
  - Blocked users cannot start new conversations




#### Database Structure
- `blocked_users` table tracks blocking relationships
- Each record contains:
  - `blocker_id`: The user who blocked
  - `blocked_id`: The user who was blocked
  - `created_at`: When the block was created

#### Security Measures
- Blocking checks are enforced at the database level
- Triggers prevent blocked users from sending messages
- RLS policies ensure proper access control
- Blocking status is checked before allowing interactions


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