import React, { useEffect, useState, useRef, useCallback, memo } from 'react';
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
} from 'react-native';
import { useTheme, Text, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ChatMessage } from '../components/ChatMessage';
import { chatService } from '../lib/chatService';
import { Message, Conversation } from '../types/chat';
import { supabase } from '../supabaseClient';
import Header from '../components/Header';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
const MemoizedListHeader = memo(({ conversation, theme, formatPrice, getCleanAvatarUrl }: ListHeaderProps) => (
    <View style={[styles.headerInfo, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.userInfoContainer}>
            <View style={styles.logoContainer}>
                {conversation?.user?.avatar_url ? (
                    getCleanAvatarUrl(conversation.user.avatar_url) ? (
                        <Image
                            source={{ uri: getCleanAvatarUrl(conversation.user.avatar_url)! }}
                            style={styles.avatar}
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
                        <Text variant="titleLarge" style={styles.username}>
                            {conversation?.user?.username || conversation?.other_user_name}
                        </Text>
                        {conversation?.user?.is_verified && (
                            <MaterialCommunityIcons
                                name="check-decagram"
                                size={20}
                                color={theme.colors.primary}
                                style={styles.verifiedIcon}
                            />
                        )}
                    </View>
                    {conversation?.user?.user_type && (
                        <Text variant="bodyMedium" style={[styles.userType, { color: theme.colors.onSurfaceVariant }]}>
                            {conversation.user.user_type.charAt(0).toUpperCase() + conversation.user.user_type.slice(1)}
                        </Text>
                    )}
                </View>
            </View>
        </View>
        {conversation?.post_image && (
            <View style={styles.postContainer}>
                <View style={styles.postContent}>
                    <Image
                        source={{ uri: conversation.post_image }}
                        style={styles.postImage}
                        resizeMode="cover"
                    />
                    <View style={styles.postTitleContainer}>
                        <Text 
                            variant="bodyMedium" 
                            style={styles.postTitle}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                        >
                            {conversation.post_title}
                        </Text>
                        <Text 
                            variant="labelLarge" 
                            style={[styles.postPrice, { color: theme.colors.primary }]}
                        >
                            {formatPrice(conversation.post_price || 0)}
                        </Text>
                    </View>
                </View>
            </View>
        )}
    </View>
));

export default function ChatDetails() {
    const theme = useTheme();
    const params = useLocalSearchParams();
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const conversationId = params.id as string;

    // Memoized callbacks
    const handleSendMessage = useCallback(async () => {
        if (!conversationId || !newMessage.trim()) return;

        try {
            await chatService.sendMessage(conversationId, newMessage.trim());
            setNewMessage('');
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }, [conversationId, newMessage]);

    const renderMessage = useCallback(({ item }: { item: Message }) => {
        const isOwnMessage = item.sender_id === currentUser?.id;
        return <MemoizedChatMessage message={item} isOwnMessage={isOwnMessage} />;
    }, [currentUser?.id]);

    const keyExtractor = useCallback((item: Message) => item.id, []);

    // Memoized header component
    const ListHeaderComponent = useCallback(() => (
        <MemoizedListHeader
            conversation={conversation}
            theme={theme}
            formatPrice={formatPrice}
            getCleanAvatarUrl={getCleanAvatarUrl}
        />
    ), [conversation, theme]);

    useEffect(() => {
        let messageChannel: any;

        const init = async () => {
            // Load current user first
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.warn('User not logged in');
                setLoading(false);
                return;
            }
            setCurrentUser(user);

            // Load conversation details and messages in parallel
            try {
                const [conversationsResponse, messagesResponse] = await Promise.all([
                    chatService.getConversations(),
                    chatService.getMessages(conversationId)
                ]);

                const currentConversation = conversationsResponse.find(c => c.id === conversationId);
                if (currentConversation) {
                    setConversation(currentConversation);
                }
                setMessages(messagesResponse);
                await chatService.markMessagesAsRead(conversationId);
            } catch (error) {
                console.error('Failed to load data:', error);
            }
            setLoading(false);

            // Setup realtime subscription
            messageChannel = supabase
                .channel(`messages:conversation:${conversationId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'messages',
                        filter: `conversation_id=eq.${conversationId}`,
                    },
                    (payload) => {
                        const newMsg = payload.new as Message;
                        setMessages((prev) => {
                            const exists = prev.some((msg) => msg.id === newMsg.id);
                            if (exists) return prev;
                            return [...prev, newMsg];
                        });

                        if (newMsg.sender_id !== user.id) {
                            setTimeout(() => {
                                flatListRef.current?.scrollToEnd({ animated: true });
                            }, 100);
                        }

                        chatService.markMessagesAsRead(conversationId);
                    }
                )
                .subscribe();
        };

        init();

        return () => {
            if (messageChannel) {
                supabase.removeChannel(messageChannel);
            }
        };
    }, [conversationId]);

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(price);
    };

    const getCleanAvatarUrl = (url: string | null) => {
        if (!url) return null;
        // Remove the @ prefix and ::text suffix from the URL
        return url.replace(/^@/, '').replace(/::text$/, '');
    };

    if (loading || !currentUser) {
        return (
            <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <Header title={'Chat'} />
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={keyExtractor}
                    style={styles.messageList}
                    contentContainerStyle={[
                        styles.messageListContent,
                        { backgroundColor: theme.colors.background }
                    ]}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={15}
                    maxToRenderPerBatch={10}
                    windowSize={10}
                    removeClippedSubviews={true}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    ListHeaderComponent={ListHeaderComponent}
                    maintainVisibleContentPosition={{
                        minIndexForVisible: 0,
                        autoscrollToTopThreshold: 10
                    }}
                />
                <View style={[styles.inputContainer, { 
                    backgroundColor: theme.colors.surface,
                    borderTopColor: theme.colors.surfaceVariant
                }]}>
                    <TextInput
                        style={[styles.input, { 
                            backgroundColor: theme.colors.surfaceVariant,
                            color: theme.colors.onSurface
                        }]}
                        value={newMessage}
                        onChangeText={setNewMessage}
                        placeholder="Type a message..."
                        placeholderTextColor={theme.colors.onSurfaceVariant}
                        multiline
                        maxLength={1000}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, { 
                            backgroundColor: newMessage.trim() ? theme.colors.primary : 'transparent'
                        }]}
                        onPress={handleSendMessage}
                        disabled={!newMessage.trim()}
                    >
                        <Ionicons
                            name="send"
                            size={20}
                            color={newMessage.trim() ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
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
        justifyContent: 'center',
        alignItems: 'center',
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
        overflow: 'hidden',
    },
    userInfoContainer: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
        backgroundColor: 'white',
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    userInfo: {
        marginLeft: 12,
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    username: {
        fontWeight: '600',
    },
    verifiedIcon: {
        marginLeft: 4,
    },
    userType: {
        marginTop: 2,
    },
    postContainer: {
        padding: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.03)',
    },
    postContent: {
        flexDirection: 'row',
        alignItems: 'center',
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
    postTitle: {
        fontWeight: '500',
        marginBottom: 4,
    },
    postPrice: {
        fontWeight: '600',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
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
        justifyContent: 'center',
        alignItems: 'center',
    },
});
