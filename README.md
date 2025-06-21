# Market Application

This document outlines the key features and management systems of the marketplace application.

## Table of Contents
1. [Post Management](#post-management)
2. [Chat System](#chat-system)
3. [User Blocking System](#user-blocking-system)
4. [Automated Cleanup](#automated-cleanup)
5. [Monitoring](#monitoring)

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

#### Chatroom Message Sending Logic

The chatroom implements a sophisticated message sending system that ensures real-time delivery while preventing duplicates and unnecessary re-renders. Here's how the message flow works:

**1. Message Composition and Sending**
When a user types a message and hits send, the system immediately creates a temporary message with a unique temporary ID. This temporary message appears instantly in the chat (optimistic update), providing immediate visual feedback to the user. The temporary message includes all the necessary information like content, sender details, and timestamp.

**2. Database Insertion**
Simultaneously, the system sends the actual message to the database through the chat service. The database insertion returns the real message with a permanent ID and server-generated timestamp. This ensures data consistency and proper message ordering.

**3. Message Replacement**
Once the database confirms the message was saved successfully, the system replaces the temporary message with the real message. This replacement happens seamlessly without any visual flickering or disruption to the user experience. The real message maintains the same visual appearance but now has the correct permanent ID and server timestamp.

**4. Real-time Subscription Handling**
The chatroom maintains a real-time subscription to the database that listens for new messages. When a message is inserted into the database, all connected users receive the update instantly. The subscription includes sophisticated deduplication logic to prevent duplicate messages from appearing.

**5. Deduplication Strategy**
The system uses multiple layers of deduplication to prevent duplicate messages:
- ID-based deduplication: Checks if a message with the same ID already exists
- Content-based deduplication: For messages from the current user, checks if a message with the same content was sent recently
- Temporary message cleanup: Removes any temporary messages that might still be present

**6. Performance Optimizations**
The chatroom implements several performance optimizations to ensure smooth operation:
- Stable object references prevent unnecessary re-renders
- Memoized components only re-render when their actual data changes
- Optimized FlatList rendering with proper key extraction
- Efficient message state management with proper cleanup

**7. Error Handling and Recovery**
If a message fails to send, the system provides comprehensive error handling:
- Failed messages are marked with a visual indicator
- Users can tap failed messages to retry sending
- Temporary messages are cleaned up automatically after a timeout
- Network errors are handled gracefully with user-friendly alerts

**8. Message State Management**
The system maintains several message states:
- Temporary messages (optimistic updates)
- Real messages (confirmed by database)
- Failed messages (awaiting retry)
- Read/unread status tracking

**9. Real-time Updates for Other Users**
When other users receive messages through the real-time subscription:
- Messages appear instantly without page refresh
- Unread counts update automatically
- Chat automatically scrolls to show new messages
- Read status is updated when messages are viewed

**10. Cleanup and Maintenance**
The system includes automatic cleanup mechanisms:
- Temporary messages are removed after successful replacement
- Timeout-based cleanup for orphaned temporary messages
- Memory-efficient message storage and retrieval
- Proper subscription cleanup when leaving the chatroom

This sophisticated message handling system ensures that users experience instant, reliable messaging while maintaining data integrity and preventing common issues like duplicate messages or unnecessary re-renders.

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