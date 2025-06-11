import React, { useEffect, useState, useRef, useCallback, memo } from "react";
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
import { useTheme, Text } from "react-native-paper";
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

// Add blurhash constant at the top level
const blurhash = "L6PZfSi_.AyE_3t7t7R**0o#DgR4";

// Types for the memoized header component
interface ListHeaderProps {
  conversation: Conversation | null;
  theme: any;
  formatPrice: (price: number) => string;
  getCleanAvatarUrl: (url: string | null) => string | null;
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
  }: ListHeaderProps) => {
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
        </View>

        <View style={styles.postContent}>
          <ExpoImage
            source={{ uri: conversation.post_image }}
            style={[
              styles.postImage,
              !isPostActive && { opacity: 0.5 }
            ]}
            contentFit="cover"
            transition={300}
            placeholder={blurhash}
            cachePolicy="memory-disk"
          />
          <View style={styles.postTitleContainer}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurface, marginBottom: 4 }}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {conversation.post_title}
            </Text>
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              {formatPrice(conversation.post_price || 0)}
            </Text>
            {!isPostActive && (
              <Text
                variant="bodySmall"
                style={{ 
                  color: theme.colors.error,
                  fontStyle: 'italic',
                  marginTop: 4
                }}
              >
                This post is no longer available
              </Text>
            )}
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
              const newMsg = {
                ...payload.new,
                sender:
                  conversation &&
                  conversation.user?.id === payload.new.sender_id
                    ? conversation.user
                    : currentUser,
              } as Message;

              setMessages((prev) => {
                // Check if message already exists by ID
                if (prev.some((msg) => msg.id === newMsg.id)) {
                  return prev;
                }

                // Remove any temporary versions of this message
                const withoutTemp = prev.filter(
                  (msg) =>
                    !msg.id.startsWith("temp-") ||
                    msg.content !== newMsg.content
                );

                // Add new message and sort
                return [...withoutTemp, newMsg].sort(
                  (a, b) =>
                    new Date(a.created_at).getTime() -
                    new Date(b.created_at).getTime()
                );
              });

              // If message is from other user, scroll to bottom and mark as read
              if (newMsg.sender_id !== currentUser?.id) {
                flatListRef.current?.scrollToEnd({ animated: true });
                await chatService.markMessagesAsRead(conversationId);
                clearUnreadCount(conversationId);
              }
            } catch (error) {
              console.error("Error handling realtime message:", error);
            }
          }
        )
        .subscribe();
    };

    init();

    return () => {
      if (messageChannel) {
        console.log("Cleaning up message subscription");
        supabase.removeChannel(messageChannel);
      }
    };
  }, [conversationId, clearUnreadCount]);

  const handleSendMessage = useCallback(async () => {
    if (!conversationId || !newMessage.trim()) return;

    const messageContent = newMessage.trim();
    const tempMessageId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create temporary message for optimistic update
    const tempMessage: Message = {
      id: tempMessageId,
      conversation_id: conversationId,
      sender_id: currentUser?.id,
      content: messageContent,
      created_at: new Date().toISOString(),
      read_at: null,
      sender: currentUser,
    };

    setNewMessage(""); // Clear input first
    setSendingMessage(true);

    try {
      // Add temporary message
      setMessages((prev) => {
        // Check for any duplicate content in recent messages (last 5 seconds)
        const recentDuplicate = prev.some(
          (msg) =>
            msg.content === messageContent &&
            !msg.id.startsWith("temp-") &&
            Date.now() - new Date(msg.created_at).getTime() < 5000
        );

        if (recentDuplicate) {
          return prev;
        }

        return [...prev, tempMessage].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });

      const sentMessage = await chatService.sendMessage(
        conversationId,
        messageContent
      );

      // Remove temporary message once real message is received
      // (The real-time subscription will handle adding the real message)
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMessageId));
    } catch (error) {
      console.error("Error sending message:", error);
      setFailedMessages((prev) => new Set(prev).add(tempMessageId));
      Alert.alert(
        "Failed to Send Message",
        "There was a problem sending your message. Tap the message to try again.",
        [{ text: "OK" }]
      );
    } finally {
      setSendingMessage(false);
    }
  }, [conversationId, newMessage, currentUser]);

  // Add retry handler
  const handleRetryMessage = useCallback(
    async (failedMessage: Message) => {
      if (!conversationId) return;

      try {
        // Remove from failed messages
        setFailedMessages((prev) => {
          const newSet = new Set(prev);
          newSet.delete(failedMessage.id);
          return newSet;
        });

        // Try to send again
        const sentMessage = await chatService.sendMessage(
          conversationId,
          failedMessage.content
        );

        // Replace failed message with successful one
        setMessages((prev) =>
          prev.map((msg) => (msg.id === failedMessage.id ? sentMessage : msg))
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
      }
    },
    [conversationId]
  );

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isOwnMessage = item.sender_id === currentUser?.id;
      const hasFailed = failedMessages.has(item.id);
      return (
        <TouchableOpacity
          onPress={() => (hasFailed ? handleRetryMessage(item) : null)}
          disabled={!hasFailed}
        >
          <MemoizedChatMessage
            message={item}
            isOwnMessage={isOwnMessage}
            hasFailed={hasFailed}
          />
        </TouchableOpacity>
      );
    },
    [currentUser?.id, failedMessages, handleRetryMessage]
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  // Memoized header component
  const ListHeaderComponent = useCallback(
    () => (
      <MemoizedListHeader
        conversation={conversation}
        theme={theme}
        formatPrice={formatPrice}
        getCleanAvatarUrl={getCleanAvatarUrl}
      />
    ),
    [conversation, theme]
  );

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getCleanAvatarUrl = (url: string | null) => {
    if (!url) return null;
    // Remove the @ prefix and ::text suffix from the URL
    return url.replace(/^@/, "").replace(/::text$/, "");
  };

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
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <Header title={"Chat"} />
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={keyExtractor}
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
          ListHeaderComponent={ListHeaderComponent}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
        />
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
            disabled={!newMessage.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={
                newMessage.trim()
                  ? theme.colors.onPrimary
                  : theme.colors.onSurfaceVariant
              }
            />
          </TouchableOpacity>
        </View>
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
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  userInfoContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  postContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  postImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  postTitleContainer: {
    flex: 1,
    marginLeft: 12,
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
});
