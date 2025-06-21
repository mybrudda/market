import React, { useEffect, useState, useRef, useCallback, memo, useMemo } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useTheme, Text, Menu, IconButton } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { ChatMessage } from "../components/chat/ChatMessage";
import { chatService } from "../lib/chatService";
import { Message, Conversation } from "../types/chat";
import { supabase } from "../supabaseClient";
import Header from "../components/layout/Header";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { useUnreadMessagesStore } from "../store/useUnreadMessagesStore";
import { useBlockedUsers } from '../lib/hooks/useBlockedUsers';

// Add blurhash constant at the top level
const blurhash = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

// Types for the memoized header component
interface ListHeaderProps {
  conversation: Conversation | null;
  theme: any;
  formatPrice: (price: number) => string;
  getCleanAvatarUrl: (url: string | null) => string | null;
  currentUser: any;
  onBlock: () => void;
  onUnblock: () => void;
  isBlocked: boolean;
  blockingLoading: boolean;
}

// Memoized message component
const MemoizedChatMessage = memo(ChatMessage);

// Memoized header component
const MemoizedListHeader = memo(
  ({
    conversation,
    theme,
    formatPrice,
    getCleanAvatarUrl,
    currentUser,
    onBlock,
    onUnblock,
    isBlocked,
    blockingLoading,
  }: ListHeaderProps) => {
    const [menuVisible, setMenuVisible] = useState(false);

    if (!conversation) return null;

    const isPostActive = conversation.post_status === 'active';

    return (
      <View
        style={[
          styles.headerInfo,
          { backgroundColor: theme.colors.elevation.level1 },
        ]}
      >
        <View
          style={[
            styles.userInfoContainer,
            {
              backgroundColor: theme.colors.elevation.level1,
              borderBottomColor: theme.colors.surfaceVariant,
            },
          ]}
        >
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              {conversation.other_user_avatar ? (
                getCleanAvatarUrl(conversation.other_user_avatar) ? (
                  <ExpoImage
                    source={{
                      uri: getCleanAvatarUrl(conversation.other_user_avatar)!,
                    }}
                    style={styles.avatar}
                    contentFit="cover"
                    transition={200}
                    placeholder={blurhash}
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="account-circle"
                    size={40}
                    color={theme.colors.primary}
                  />
                )
              ) : (
                <MaterialCommunityIcons
                  name="account-circle"
                  size={40}
                  color={theme.colors.primary}
                />
              )}

              <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                  <Text
                    variant="titleMedium"
                    style={{ color: theme.colors.onSurface }}
                  >
                    {conversation.other_user_full_name ||
                      conversation.other_user_name}
                  </Text>
                  {conversation.other_user_is_verified && (
                    <MaterialCommunityIcons
                      name="check-decagram"
                      size={20}
                      color={theme.colors.primary}
                      style={styles.verifiedIcon}
                    />
                  )}
                </View>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  @{conversation.other_user_name}
                </Text>
              </View>
            </View>

            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <IconButton
                  icon="dots-vertical"
                  size={24}
                  onPress={() => setMenuVisible(true)}
                  iconColor={theme.colors.onSurfaceVariant}
                  disabled={blockingLoading}
                />
              }
            >
              {isBlocked ? (
                <Menu.Item
                  onPress={() => {
                    onUnblock();
                    setMenuVisible(false);
                  }}
                  title="Unblock User"
                  leadingIcon="account-check"
                  disabled={blockingLoading}
                />
              ) : (
                <Menu.Item
                  onPress={() => {
                    onBlock();
                    setMenuVisible(false);
                  }}
                  title="Block User"
                  leadingIcon="account-remove"
                  disabled={blockingLoading}
                />
              )}
            </Menu>
          </View>
        </View>
      </View>
    );
  }
);

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
        const [conversationsResponse, messagesResponse] = await Promise.all([
          chatService.getConversations(),
          chatService.getMessages(conversationId),
        ]);

        const currentConversation = conversationsResponse.find(
          (c) => c.id === conversationId
        );
        if (currentConversation) {
          console.log("Conversation data:", currentConversation);
          setConversation(currentConversation);
        }
        setMessages(messagesResponse);
        
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
                flatListRef.current?.scrollToEnd({ animated: true });
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

  // Memoized ListHeaderComponent - optimized to prevent re-renders during message sending
  const ListHeaderComponent = useCallback(
    () => (
      <MemoizedListHeader
        conversation={conversation}
        theme={theme}
        formatPrice={formatPrice}
        getCleanAvatarUrl={getCleanAvatarUrl}
        currentUser={currentUser}
        onBlock={() => handleBlockRef.current?.()}
        onUnblock={() => handleUnblockRef.current?.()}
        isBlocked={isBlocked}
        blockingLoading={blockingLoading}
      />
    ),
    [conversation, theme, currentUser, isBlocked, blockingLoading, formatPrice, getCleanAvatarUrl]
  );

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
        flatListRef.current?.scrollToEnd({ animated: true });
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
    ({ item }: { item: Message }) => {
      const isOwnMessage = item.sender_id === currentUser?.id;
      const hasFailed = failedMessages.has(item.id);
      
      return (
        <TouchableOpacity
          onPress={() => (hasFailed ? handleRetryMessage(item) : null)}
          disabled={!hasFailed || sendingMessage}
        >
          <MemoizedChatMessage
            message={item}
            isOwnMessage={isOwnMessage}
            hasFailed={hasFailed}
          />
        </TouchableOpacity>
      );
    },
    [currentUser?.id, failedMessages, handleRetryMessage, sendingMessage]
  );

  // Memoized key extractor
  const keyExtractor = useCallback((item: Message) => item.id, []);

  // Memoized getItemLayout for better FlatList performance
  const getItemLayout = useCallback((data: ArrayLike<Message> | null | undefined, index: number) => ({
    length: 80, // Approximate height of a message item
    offset: 80 * index,
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
    
    return uniqueMessages;
  }, [messages]);

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
        <Header title={"Chat"} />
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
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          ListHeaderComponent={ListHeaderComponent}
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
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
        />
        {!isBlocked && canSendMessages && (
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.surfaceVariant,
              },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  color: theme.colors.onSurface,
                },
              ]}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: newMessage.trim()
                    ? theme.colors.primary
                    : "transparent",
                },
              ]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim() || sendingMessage}
            >
              {sendingMessage ? (
                <ActivityIndicator size="small" color={theme.colors.onPrimary} />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={
                    newMessage.trim()
                      ? theme.colors.onPrimary
                      : theme.colors.onSurfaceVariant
                  }
                />
              )}
            </TouchableOpacity>
          </View>
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
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 16,
  },
  headerInfo: {
    marginBottom: 0,
    borderRadius: 0,
    overflow: "hidden",
  },
  userInfoContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  verifiedIcon: {
    marginLeft: 4,
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 60,
    paddingTop: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  failedMessage: {
    opacity: 0.7,
  },
  retryButton: {
    padding: 8,
  },
  blockedMessageContainer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
  },
});
