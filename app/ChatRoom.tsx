import React, { useEffect, useState, useRef, useCallback, memo, useMemo } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Animated,
  RefreshControl,
  Easing,
} from "react-native";
import { useTheme, Text, Menu } from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import { ChatMessage } from "../components/chat/ChatMessage";
import { ScrollToBottomButton } from "../components/chat/ScrollToBottomButton";
import { ChatInput } from "../components/chat/ChatInput";
import { UserInfoModal } from "../components/chat/UserInfoModal";
import { chatService } from "../lib/chatService";
import { Message, Conversation } from "../types/chat";
import { GroupedMessage, groupMessages, formatDateSeparator } from "../utils/messageUtils";
import { supabase } from "../supabaseClient";
import Header from "../components/layout/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { useUnreadMessagesStore } from "../store/useUnreadMessagesStore";
import { useBlockedUsers } from '../lib/hooks/useBlockedUsers';

// Add blurhash constant at the top level
const blurhash = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

// Memoized message component
const MemoizedChatMessage = memo(ChatMessage);

export default function ChatRoom() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { clearUnreadCount } = useUnreadMessagesStore();
  const [conversation, setConversation] = useState<Conversation | null>(() => {
    // Initialize from params if available
    if (params.conversation) {
      try {
        return JSON.parse(params.conversation as string);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const flatListRef = useRef<FlatList>(null);
  const conversationId = params.id as string;
  const [sendingMessage, setSendingMessage] = useState(false);
  const [failedMessages, setFailedMessages] = useState<Set<string>>(new Set());
  const { isUserBlocked, canMessageUser, refreshBlockedUsers } = useBlockedUsers();
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockingLoading, setBlockingLoading] = useState(false);
  const [canSendMessages, setCanSendMessages] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showUserInfo, setShowUserInfo] = useState(false);

  // Pagination state
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [oldestMessageTimestamp, setOldestMessageTimestamp] = useState<string | null>(null);
  const INITIAL_MESSAGES_COUNT = 15;
  const MESSAGES_PER_PAGE = 10;

  // Scroll position tracking
  const [isNearBottom, setIsNearBottom] = useState(true);
  const scrollPositionRef = useRef(0);
  const contentHeightRef = useRef(0);
  const scrollViewHeightRef = useRef(0);

  // Animation values
  const scrollToBottomButtonAnimation = useRef(new Animated.Value(0)).current;
  
  // Custom smooth scroll function
  const smoothScrollToBottom = useCallback(() => {
    if (flatListRef.current) {
      // Add a small delay for smoother animation
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, []);
  
  // Scroll tracking
  const isUserScrollingRef = useRef(false);
  const isAutoScrollingRef = useRef(false);

  // Use refs to access current state values in subscription callbacks
  const currentUserRef = useRef<any>(null);
  const conversationRef = useRef<Conversation | null>(null);
  const stableCurrentUserRef = useRef<any>(null);
  const stableOtherUserRef = useRef<any>(null);

  // Use refs for stable function references to prevent re-renders
  const handleBlockRef = useRef<(() => Promise<void>) | null>(null);
  const handleUnblockRef = useRef<(() => Promise<void>) | null>(null);

  // Create stable sender objects to prevent re-renders
  const stableCurrentUser = useMemo(() => {
    if (!currentUser) return undefined;
    return {
      id: currentUser.id,
      username: currentUser.username || currentUser.email,
      avatar_url: currentUser.avatar_url
    };
  }, [currentUser?.id, currentUser?.username, currentUser?.email, currentUser?.avatar_url]);

  const stableOtherUser = useMemo(() => {
    if (!conversation) return undefined;
    return {
      id: conversation.other_user_name, // This is the user ID from the conversation
      username: conversation.other_user_name,
      avatar_url: conversation.other_user_avatar
    };
  }, [conversation?.other_user_name, conversation?.other_user_avatar]);

  // Update refs when state changes
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  // Update stable user refs when they change
  useEffect(() => {
    stableCurrentUserRef.current = stableCurrentUser;
  }, [stableCurrentUser]);

  useEffect(() => {
    stableOtherUserRef.current = stableOtherUser;
  }, [stableOtherUser]);

  // Load initial data
  useEffect(() => {
    let messageChannel: any;

    const init = async () => {
      // Load current user first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn("User not logged in");
        setLoading(false);
        return;
      }
      setCurrentUser(user);

      // Load conversation details and messages in parallel
      try {
        const [conversationsResponse, messagesResponse, totalCount] = await Promise.all([
          chatService.getConversations(),
          chatService.getMessages(conversationId, INITIAL_MESSAGES_COUNT),
          chatService.getMessagesCount(conversationId),
        ]);

        const currentConversation = conversationsResponse.find(
          (c) => c.id === conversationId
        );
        if (currentConversation) {
          console.log("Conversation data:", currentConversation);
          setConversation(currentConversation);
        }
        
        setMessages(messagesResponse);
        if (messagesResponse.length > 0) {
          setOldestMessageTimestamp(String(messagesResponse[0].created_at));
          setHasMoreMessages(totalCount > INITIAL_MESSAGES_COUNT);
          
          console.log('🚀 Initial messages loaded:', {
            count: messagesResponse.length,
            totalInConversation: totalCount,
            oldestMessageId: messagesResponse[0].id,
            newestMessageId: messagesResponse[messagesResponse.length - 1].id,
            hasMore: totalCount > INITIAL_MESSAGES_COUNT
          });
        } else {
          setHasMoreMessages(false);
          console.log('📭 No messages in conversation');
        }
        
        // Clear unread count and mark messages as read
        clearUnreadCount(conversationId);
        await chatService.markMessagesAsRead(conversationId);
      } catch (error) {
        console.error("Failed to load data:", error);
        Alert.alert(
          "Error",
          "Failed to load conversation data. Please try again.",
          [{ text: "OK" }]
        );
      }
      setLoading(false);

      // Setup realtime subscription
      messageChannel = supabase
        .channel(`messages:conversation:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          async (payload) => {
            console.log("Received realtime message:", payload);
            try {
              // Get current values from refs
              const currentConversationState = conversationRef.current;
              const currentUserState = currentUserRef.current;

              // Determine the correct sender object with stable reference
              const isFromCurrentUser = payload.new.sender_id === currentUserState?.id;
              const sender = isFromCurrentUser ? stableCurrentUserRef.current : stableOtherUserRef.current;

              const newMsg: Message = {
                id: payload.new.id,
                conversation_id: payload.new.conversation_id,
                sender_id: payload.new.sender_id,
                content: payload.new.content,
                created_at: payload.new.created_at,
                read_at: payload.new.read_at,
                sender,
              };

              console.log("Processing realtime message:", {
                messageId: newMsg.id,
                isFromCurrentUser,
                currentMessagesCount: messages.length
              });

              setMessages((prev) => {
                // Check if message already exists by ID
                if (prev.some((msg) => msg.id === newMsg.id)) {
                  console.log("Message already exists by ID, skipping:", newMsg.id);
                  return prev;
                }

                // Check if this is a message we just sent (by content and sender)
                if (isFromCurrentUser) {
                  const recentMessage = prev.find(msg => 
                    msg.content === newMsg.content && 
                    msg.sender_id === newMsg.sender_id &&
                    Math.abs(new Date(msg.created_at).getTime() - new Date(newMsg.created_at).getTime()) < 5000 // Within 5 seconds
                  );
                  
                  if (recentMessage) {
                    console.log("Message from current user already exists, skipping:", newMsg.content);
                    return prev;
                  }
                }

                // Remove any temporary versions of this message and add new one
                const withoutTemp = prev.filter((msg) => !msg.id.startsWith('temp-'));
                const updatedMessages = [...withoutTemp, newMsg];
                console.log("Updated messages count:", updatedMessages.length);
                return updatedMessages;
              });

              // If message is from other user, scroll to bottom and mark as read
              if (!isFromCurrentUser) {
                // Check if user is near bottom before deciding to auto-scroll
                if (isNearBottom) {
                  // Smooth scroll to bottom
                  smoothScrollToBottom();
                }
                
                // Mark as read asynchronously to not block the UI
                chatService.markMessagesAsRead(conversationId).catch(console.error);
                clearUnreadCount(conversationId);
              }
            } catch (error) {
              console.error("Error handling realtime message:", error);
              Alert.alert(
                "Error",
                "Failed to process new message. Please refresh the chat.",
                [{ text: "OK" }]
              );
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            console.log("Message updated:", payload);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
              )
            );
          }
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR') {
            console.error('Channel subscription error');
            Alert.alert(
              "Connection Error",
              "Lost connection to chat. Please refresh the page.",
              [{ text: "OK" }]
            );
          }
        });
    };

    init();

    return () => {
      if (messageChannel) {
        console.log("Cleaning up message subscription");
        supabase.removeChannel(messageChannel);
      }
    };
  }, [conversationId, clearUnreadCount]);

  // Function to load older messages
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlderMessages || !hasMoreMessages) return;

    console.log('🔄 Loading older messages...', {
      currentMessagesCount: messages.length,
      oldestTimestamp: oldestMessageTimestamp,
      hasMore: hasMoreMessages,
      fetchingCount: MESSAGES_PER_PAGE
    });

    setIsLoadingOlderMessages(true);

    try {
      const olderMessages = await chatService.getMessages(
        conversationId,
        MESSAGES_PER_PAGE,
        oldestMessageTimestamp || undefined
      );

      console.log('📨 Loaded older messages:', {
        count: olderMessages.length,
        firstMessageId: olderMessages[0]?.id,
        lastMessageId: olderMessages[olderMessages.length - 1]?.id
      });

      if (olderMessages.length > 0) {
        setMessages(prev => [...olderMessages, ...prev]);
        setOldestMessageTimestamp(String(olderMessages[0].created_at));
        setHasMoreMessages(olderMessages.length === MESSAGES_PER_PAGE);
        
        console.log('✅ Updated messages state:', {
          newTotalCount: messages.length + olderMessages.length,
          newOldestTimestamp: olderMessages[0].created_at,
          hasMore: olderMessages.length === MESSAGES_PER_PAGE
        });
      } else {
        setHasMoreMessages(false);
        console.log('🏁 No more messages to load');
      }
    } catch (error) {
      console.error("❌ Failed to load older messages:", error);
      Alert.alert(
        "Error",
        "Failed to load older messages. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoadingOlderMessages(false);
    }
  }, [conversationId, isLoadingOlderMessages, hasMoreMessages, oldestMessageTimestamp, messages.length]);

  // Function to check if user is near bottom
  const checkIfNearBottom = useCallback((contentOffsetY: number, contentHeight: number, scrollViewHeight: number) => {
    const threshold = 100; // pixels from bottom
    const isNear = contentOffsetY + scrollViewHeight >= contentHeight - threshold;
    setIsNearBottom(isNear);
    
    // Show/hide scroll to bottom button
    Animated.timing(scrollToBottomButtonAnimation, {
      toValue: isNear ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (conversation) {
      const otherUserId = conversation.creator_id === currentUser?.id 
        ? conversation.participant_id 
        : conversation.creator_id;
      setIsBlocked(isUserBlocked(otherUserId));
      
      // Check if user can send messages (only once when conversation loads)
      if (otherUserId) {
        canMessageUser(otherUserId).then((canMessage) => {
          setCanSendMessages(canMessage);
          if (!canMessage) {
            // Don't show alert, just set the blocked state
            // The UI will handle hiding the input section
          }
        }).catch((error) => {
          console.error('Error checking message permission:', error);
          setCanSendMessages(false);
        });
      }
    }
  }, [conversation, currentUser, isUserBlocked, canMessageUser]);

  // Memoized formatPrice function
  const formatPrice = useCallback((price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  }, []);

  // Memoized getCleanAvatarUrl function
  const getCleanAvatarUrl = useCallback((url: string | null) => {
    if (!url) return null;
    // Remove the @ prefix and ::text suffix from the URL
    return url.replace(/^@/, "").replace(/::text$/, "");
  }, []);

  // Memoized block handler
  const handleBlock = useCallback(async () => {
    if (!conversation || !currentUser || blockingLoading) return;

    setBlockingLoading(true);
    try {
      const otherUserId = conversation.creator_id === currentUser.id 
        ? conversation.participant_id 
        : conversation.creator_id;

      // First check if the user is already blocked
      const { data: existingBlock, error: checkError } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', currentUser.id)
        .eq('blocked_id', otherUserId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingBlock) {
        Alert.alert('Already Blocked', 'This user is already blocked.');
        return;
      }

      // Insert the block
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          blocker_id: currentUser.id,
          blocked_id: otherUserId
        });

      if (error) throw error;

      setIsBlocked(true);
      await refreshBlockedUsers();
      
      Alert.alert(
        'User Blocked',
        'You will no longer receive messages from this user.'
      );
    } catch (error) {
      console.error('Error blocking user:', error);
      Alert.alert(
        'Error',
        'Failed to block user. Please try again.'
      );
    } finally {
      setBlockingLoading(false);
    }
  }, [conversation, currentUser, blockingLoading, refreshBlockedUsers]);

  // Memoized unblock handler
  const handleUnblock = useCallback(async () => {
    if (!conversation || !currentUser || blockingLoading) return;

    setBlockingLoading(true);
    try {
      const otherUserId = conversation.creator_id === currentUser.id 
        ? conversation.participant_id 
        : conversation.creator_id;

      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', currentUser.id)
        .eq('blocked_id', otherUserId);

      if (error) throw error;

      setIsBlocked(false);
      await refreshBlockedUsers();
      
      Alert.alert(
        'User Unblocked',
        'You can now receive messages from this user.'
      );
    } catch (error) {
      console.error('Error unblocking user:', error);
      Alert.alert(
        'Error',
        'Failed to unblock user. Please try again.'
      );
    } finally {
      setBlockingLoading(false);
    }
  }, [conversation, currentUser, blockingLoading, refreshBlockedUsers]);

  // Update function refs
  useEffect(() => {
    handleBlockRef.current = handleBlock;
  }, [handleBlock]);

  useEffect(() => {
    handleUnblockRef.current = handleUnblock;
  }, [handleUnblock]);

  // Memoized message sending handler to prevent re-renders
  const handleSendMessage = useCallback(async () => {
    if (!conversationId || !newMessage.trim() || !conversation || sendingMessage) return;

    const messageContent = newMessage.trim();
    const tempMessageId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create temporary message for optimistic update with stable sender reference
    const tempMessage: Message = {
      id: tempMessageId,
      conversation_id: conversationId,
      sender_id: currentUser?.id,
      content: messageContent,
      created_at: new Date().toISOString(),
      read_at: null,
      sender: stableCurrentUserRef.current,
    };

    // Clear input immediately for better UX
    setNewMessage("");
    setSendingMessage(true);

    // Set a timeout to remove the temporary message if it doesn't get replaced
    const cleanupTimeout = setTimeout(() => {
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessageId));
      console.log("Cleaned up temporary message:", tempMessageId);
    }, 10000); // 10 seconds timeout

    try {
      // Add temporary message immediately (optimistic update)
      setMessages((prev) => [...prev, tempMessage]);
      console.log("Added temporary message:", tempMessageId);

      // Send the message without blocking check (already checked when conversation loads)
      const sentMessage = await chatService.sendMessage(conversationId, messageContent);
      console.log("Message sent successfully:", sentMessage.id);

      // Clear the timeout since we're replacing the message
      clearTimeout(cleanupTimeout);

      // Replace temporary message with the real message immediately
      const realMessage: Message = {
        ...sentMessage,
        // Use the sender from the sent message if available, otherwise use stable reference
        sender: sentMessage.sender || stableCurrentUserRef.current,
      };

      setMessages((prev) => {
        // Remove temporary message and add real message
        const withoutTemp = prev.filter((msg) => msg.id !== tempMessageId);
        const updatedMessages = [...withoutTemp, realMessage];
        console.log("Replaced temp message with real message:", {
          tempId: tempMessageId,
          realId: realMessage.id,
          totalMessages: updatedMessages.length
        });
        return updatedMessages;
      });

      // Scroll to bottom to show the new message
      setTimeout(() => {
        if (isNearBottom) {
          smoothScrollToBottom();
        }
      }, 100);

    } catch (error) {
      // Clear the timeout on error
      clearTimeout(cleanupTimeout);
      
      console.error("Error sending message:", error);
      
      // Add back to failed messages
      setFailedMessages((prev) => new Set(prev).add(tempMessageId));
      
      // Restore the message input if sending failed
      setNewMessage(messageContent);
      
      Alert.alert(
        "Failed to Send Message",
        "There was a problem sending your message. Tap the message to try again.",
        [{ text: "OK" }]
      );
    } finally {
      setSendingMessage(false);
    }
  }, [conversationId, newMessage, conversation, currentUser, sendingMessage]);

  // Memoized retry handler
  const handleRetryMessage = useCallback(
    async (failedMessage: Message) => {
      if (!conversationId || sendingMessage) return;

      try {
        // Remove from failed messages
        setFailedMessages((prev) => {
          const newSet = new Set(prev);
          newSet.delete(failedMessage.id);
          return newSet;
        });

        setSendingMessage(true);

        // Try to send again
        const sentMessage = await chatService.sendMessage(
          conversationId,
          failedMessage.content
        );

        // Replace failed message with successful one, ensuring stable sender reference
        const updatedMessage: Message = {
          ...sentMessage,
          // Use the sender from the sent message if available, otherwise use stable reference
          sender: sentMessage.sender || stableCurrentUserRef.current,
        };

        setMessages((prev) =>
          prev.map((msg) => (msg.id === failedMessage.id ? updatedMessage : msg))
        );
      } catch (error) {
        console.error("Error retrying message:", error);

        // Add back to failed messages
        setFailedMessages((prev) => new Set(prev).add(failedMessage.id));

        Alert.alert(
          "Failed to Send Message",
          "There was a problem sending your message. Please try again later.",
          [{ text: "OK" }]
        );
      } finally {
        setSendingMessage(false);
      }
    },
    [conversationId, sendingMessage]
  );

  // Memoized render message function
  const renderMessage = useCallback(
    ({ item }: { item: GroupedMessage }) => {
      if (item.type === 'date-separator') {
        return (
          <View style={styles.dateSeparator}>
            <Text variant="labelSmall" style={[styles.dateText, { color: theme.colors.onSurfaceVariant }]}>
              {formatDateSeparator((item.data as { date: string }).date)}
            </Text>
          </View>
        );
      }

      const message = item.data as Message;
      const isOwnMessage = message.sender_id === currentUser?.id;
      const hasFailed = failedMessages.has(message.id);
      
      return (
        <ChatMessage
          message={message}
          isOwnMessage={isOwnMessage}
          hasFailed={hasFailed}
          onRetry={() => hasFailed ? handleRetryMessage(message) : undefined}
          onLongPress={() => {
            // Handle long press for message actions
            console.log('Long pressed message:', message.id);
          }}
          isFirstInGroup={item.isFirstInGroup}
          isLastInGroup={item.isLastInGroup}
        />
      );
    },
    [currentUser?.id, failedMessages, handleRetryMessage, theme.colors.onSurfaceVariant]
  );

  // Memoized key extractor
  const keyExtractor = useCallback((item: GroupedMessage) => item.id, []);

  // Memoized getItemLayout for better FlatList performance
  const getItemLayout = useCallback((data: ArrayLike<GroupedMessage> | null | undefined, index: number) => ({
    length: 100, // More accurate height estimate for message items
    offset: 100 * index,
    index,
  }), []);

  // Memoized messages array to prevent unnecessary re-renders and ensure uniqueness
  const memoizedMessages = useMemo(() => {
    // Remove any duplicate messages by ID
    const uniqueMessages = messages.reduce((acc, message) => {
      const existingIndex = acc.findIndex(msg => msg.id === message.id);
      if (existingIndex >= 0) {
        // If we find a duplicate, keep the one that's not a temp message
        if (message.id.startsWith('temp-') && !acc[existingIndex].id.startsWith('temp-')) {
          // Replace temp message with real message
          acc[existingIndex] = message;
        }
        // Otherwise keep the existing message
      } else {
        acc.push(message);
      }
      return acc;
    }, [] as Message[]);
    
    // Group messages for better UI
    return groupMessages(uniqueMessages);
  }, [messages]);

  // Memoized scroll handlers
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const currentScrollPosition = contentOffset.y;
    
    scrollPositionRef.current = currentScrollPosition;
    contentHeightRef.current = contentSize.height;
    scrollViewHeightRef.current = layoutMeasurement.height;
    checkIfNearBottom(currentScrollPosition, contentSize.height, layoutMeasurement.height);
  }, [checkIfNearBottom]);

  const handleContentSizeChange = useCallback((width: number, height: number) => {
    contentHeightRef.current = height;
    // Only auto-scroll if user is near bottom
    if (isNearBottom) {
      isAutoScrollingRef.current = true;
      smoothScrollToBottom();
      setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 500);
    }
  }, [isNearBottom]);

  const handleLayout = useCallback((event: any) => {
    scrollViewHeightRef.current = event.nativeEvent.layout.height;
    // Only auto-scroll if user is near bottom
    if (isNearBottom) {
      isAutoScrollingRef.current = true;
      smoothScrollToBottom();
      setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 500);
    }
  }, [isNearBottom]);

  // Scroll event handlers
  const handleScrollBeginDrag = useCallback(() => {
    console.log('👆 User started scrolling');
    isUserScrollingRef.current = true;
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    console.log('👆 User stopped scrolling');
    // Keep the flag true for a bit longer to catch momentum scrolling
    setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 1000);
  }, []);

  const handleMomentumScrollEnd = useCallback(() => {
    console.log('👆 Momentum scroll ended');
    isUserScrollingRef.current = false;
  }, []);

  if (loading || !currentUser) {
    return (
      <SafeAreaView
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Header 
          title={conversation?.other_user_full_name || conversation?.other_user_name || "Chat"}
          rightElement={
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  onPress={() => setMenuVisible(true)}
                  style={styles.menuButton}
                >
                  <MaterialCommunityIcons
                    name="dots-vertical"
                    size={24}
                    color={theme.colors.onSecondaryContainer}
                  />
                </TouchableOpacity>
              }
            >
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  setShowUserInfo(true);
                }}
                title="View User Info"
                leadingIcon="account"
              />
              {isBlocked ? (
                <Menu.Item
                  onPress={() => {
                    handleUnblock();
                    setMenuVisible(false);
                  }}
                  title="Unblock User"
                  leadingIcon="account-check"
                  disabled={blockingLoading}
                />
              ) : (
                <Menu.Item
                  onPress={() => {
                    handleBlock();
                    setMenuVisible(false);
                  }}
                  title="Block User"
                  leadingIcon="account-remove"
                  disabled={blockingLoading}
                />
              )}
            </Menu>
          }
        />
        <View style={styles.postInfoContainer}>
          <ExpoImage
            source={{ uri: conversation?.post_image }}
            style={[
              styles.postImage,
              conversation?.post_status !== 'active' && { opacity: 0.5 }
            ]}
            contentFit="cover"
            transition={300}
            placeholder={blurhash}
            cachePolicy="memory-disk"
          />
          <View style={styles.postTitleContainer}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurface }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {conversation?.post_title}
            </Text>
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              {formatPrice(conversation?.post_price || 0)}
            </Text>
            {conversation?.post_status !== 'active' && (
              <Text
                variant="bodySmall"
                style={{ 
                  color: theme.colors.error,
                  fontStyle: 'italic'
                }}
              >
                This post is no longer available
              </Text>
            )}
          </View>
        </View>
        
        <FlatList
          ref={flatListRef}
          data={memoizedMessages}
          renderItem={renderMessage}
          keyExtractor={(item: GroupedMessage) => item.id}
          getItemLayout={getItemLayout}
          style={styles.messageList}
          contentContainerStyle={[
            styles.messageListContent,
            { backgroundColor: theme.colors.background },
          ]}
          showsVerticalScrollIndicator={false}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={true}
          onScroll={handleScroll}
          onContentSizeChange={handleContentSizeChange}
          onLayout={handleLayout}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingOlderMessages}
              onRefresh={hasMoreMessages ? loadOlderMessages : undefined}
              enabled={hasMoreMessages}
            />
          }
        />
        <ScrollToBottomButton
          onPress={smoothScrollToBottom}
          animatedValue={scrollToBottomButtonAnimation}
        />
        {!isBlocked && canSendMessages && (
          <ChatInput
            value={newMessage}
            onChangeText={setNewMessage}
            onSend={handleSendMessage}
            onAttachment={() => {
              // Handle attachment
              console.log('Attachment pressed');
            }}
            isSending={sendingMessage}
            disabled={!canSendMessages}
            placeholder="Type a message..."
            maxLength={1000}
          />
        )}
        {(isBlocked || !canSendMessages) && (
          <View
            style={[
              styles.blockedMessageContainer,
              {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.surfaceVariant,
              },
            ]}
          >
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: 'center',
                fontStyle: 'italic',
                paddingVertical: 20,
              }}
            >
              {isBlocked 
                ? "You have blocked this user. You can view the conversation but cannot send new messages."
                : "You cannot send messages to this user."
              }
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* User Info Modal */}
      <UserInfoModal
        visible={showUserInfo}
        onClose={() => setShowUserInfo(false)}
        conversation={conversation}
        getCleanAvatarUrl={getCleanAvatarUrl}
        blurhash={blurhash}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 16,
  },
  postInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  postImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  postTitleContainer: {
    flex: 1,
    marginLeft: 8,
  },
  blockedMessageContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
  },
  dateSeparator: {
    padding: 8,
    alignItems: 'center',
  },
  dateText: {
    fontWeight: 'bold',
  },
  menuButton: {
    padding: 8,
  },
});
