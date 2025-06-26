# Push Notifications

This document describes the push notification functionality in the marketplace app.

## Overview

The push notification system automatically notifies users when they receive messages from other users. Users can control their notification preferences through the app settings.

## Features

### Message Notifications
- **Automatic Notifications**: Users receive push notifications when someone sends them a message
- **Message Preview**: Notifications show the sender's name and a preview of the message
- **Real-time Delivery**: Notifications are sent instantly when messages are delivered

### User Preferences
- **Notification Toggle**: Users can enable or disable message notifications
- **Settings Screen**: Access notification preferences from the profile section
- **Immediate Effect**: Changes take effect immediately without app restart

### Permission Management
- **Automatic Request**: App requests notification permissions when user logs in
- **Device Support**: Works on both iOS and Android devices

## How It Works

### When Messages Are Sent
1. User A sends a message to User B
2. System checks if User B has notifications enabled
3. If enabled, push notification is sent to User B's device
4. User B receives notification with sender name and message preview

### Notification Settings
- Users can access notification settings from their profile
- Simple toggle to enable/disable message notifications
- Settings are saved automatically and apply immediately

### Blocked Users
- Users who are blocked cannot send notifications
- Blocked users' messages don't trigger notifications
- Respects the existing blocking system

## User Experience

### For Message Recipients
- Receive instant notifications for new messages
- See sender name and message preview in notification
- Tap notification to open the conversation
- Notifications work even when app is closed

### For Message Senders
- No notifications when sending messages
- Messages appear instantly in chat
- Normal chat functionality remains unchanged

### Settings Management
- Easy access to notification preferences
- Clear visual indicators for enabled/disabled state
- Immediate feedback when changing settings

## System Functions

### Core Functions
- `registerForPushNotifications()`: Sets up push notifications for the user
- `sendMessageNotification()`: Sends notification when message is received
- `setupNotificationListeners()`: Handles notifications when app is open
- `clearToken()`: Removes notification data when user logs out

### Database Functions
- `register_expo_push_token()`: Saves user's notification token
- `get_user_expo_push_tokens()`: Retrieves user's active tokens
- `should_send_notification()`: Checks if notification should be sent
- `create_default_notification_settings()`: Creates default settings for new users

