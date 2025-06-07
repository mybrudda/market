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
    Alert,
} from 'react-native';
import { useTheme, Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { ChatMessage } from '../components/ChatMessage';
import { chatService } from '../lib/chatService';
import { Message, Conversation } from '../types/chat';
import { supabase } from '../supabaseClient';
import Header from '../components/Header';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';

// Add blurhash constant at the top level
const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

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
const MemoizedListHeader = memo(({ conversation, theme, formatPrice, getCleanAvatarUrl }: ListHeaderProps) => {
    if (!conversation) return null;
    
    return (
        <View style={[styles.headerInfo, { backgroundColor: theme.colors.elevation.level1 }]}>
            <View style={[styles.userInfoContainer, {
                backgroundColor: theme.colors.elevation.level1,
                borderBottomColor: theme.colors.surfaceVariant
            }]}>
                <View style={styles.logoContainer}>
                    {conversation.user?.avatar_url ? (
                        getCleanAvatarUrl(conversation.user.avatar_url) ? (
                            <ExpoImage
                                source={{ uri: getCleanAvatarUrl(conversation.user.avatar_url)! }}
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
                    
                    <View style={styles.nameRow}>
                        <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
                            {conversation.user?.username || conversation.other_user_name}
                        </Text>
                        {conversation.user?.is_verified && (
                            <MaterialCommunityIcons
                                name="check-decagram"
                                size={20}
                                color={theme.colors.primary}
                                style={styles.verifiedIcon}
                            />
                        )}
                    </View>
                    {conversation.user?.user_type && (
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                            {conversation.user.user_type.charAt(0).toUpperCase() + conversation.user.user_type.slice(1)}
                        </Text>
                    )}
                </View>
            </View>
            
            <View style={[styles.postContainer, { backgroundColor: theme.colors.elevation.level2 }]}>
                <View style={styles.postContent}>
                    <ExpoImage
                        source={{ uri: conversation.post_image }}
                        style={styles.postImage}
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
                        <Text 
                            variant="labelLarge" 
                            style={{ color: theme.colors.primary }}
                        >
                            {formatPrice(conversation.post_price || 0)}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
});

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
    const [sendingMessage, setSendingMessage] = useState(false);
    const [failedMessages, setFailedMessages] = useState<Set<string>>(new Set());

    // Memoized callbacks
    const handleSendMessage = useCallback(async () => {
        if (!conversationId || !newMessage.trim()) return;
        
        const messageContent = newMessage.trim();
        const tempMessageId = Date.now().toString(); // Temporary ID for optimistic update
        
        // Create temporary message for optimistic update
        const tempMessage: Message = {
            id: tempMessageId,
            conversation_id: conversationId,
            sender_id: currentUser?.id,
            content: messageContent,
            created_at: new Date().toISOString(),
            read_at: null,
            sender: currentUser
        };

        // Optimistically add message to UI
        setMessages(prev => [...prev, tempMessage]);
        setNewMessage(''); // Clear input
        setSendingMessage(true);

        try {
            const sentMessage = await chatService.sendMessage(conversationId, messageContent);
            
            // Replace temp message with real one
            setMessages(prev => 
                prev.map(msg => msg.id === tempMessageId ? sentMessage : msg)
            );
            
            // Scroll to bottom
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch (error) {
            console.error('Error sending message:', error);
            
            // Add to failed messages set
            setFailedMessages(prev => new Set(prev).add(tempMessageId));
            
            // Show error to user
            Alert.alert(
                'Failed to Send Message',
                'There was a problem sending your message. Tap the message to try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setSendingMessage(false);
        }
    }, [conversationId, newMessage, currentUser]);

    // Add retry handler
    const handleRetryMessage = useCallback(async (failedMessage: Message) => {
        if (!conversationId) return;

        try {
            // Remove from failed messages
            setFailedMessages(prev => {
                const newSet = new Set(prev);
                newSet.delete(failedMessage.id);
                return newSet;
            });

            // Try to send again
            const sentMessage = await chatService.sendMessage(conversationId, failedMessage.content);
            
            // Replace failed message with successful one
            setMessages(prev => 
                prev.map(msg => msg.id === failedMessage.id ? sentMessage : msg)
            );
        } catch (error) {
            console.error('Error retrying message:', error);
            
            // Add back to failed messages
            setFailedMessages(prev => new Set(prev).add(failedMessage.id));
            
            Alert.alert(
                'Failed to Send Message',
                'There was a problem sending your message. Please try again later.',
                [{ text: 'OK' }]
            );
        }
    }, [conversationId]);

    const renderMessage = useCallback(({ item }: { item: Message }) => {
        const isOwnMessage = item.sender_id === currentUser?.id;
        const hasFailed = failedMessages.has(item.id);
        return (
            <TouchableOpacity 
                onPress={() => hasFailed ? handleRetryMessage(item) : null}
                disabled={!hasFailed}
            >
                <MemoizedChatMessage 
                    message={item} 
                    isOwnMessage={isOwnMessage}
                    hasFailed={hasFailed}
                />
            </TouchableOpacity>
        );
    }, [currentUser?.id, failedMessages, handleRetryMessage]);

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
                    async (payload) => {
                        try {
                            // Get the complete message with sender info
                            const { data: messages } = await supabase
                                .from('messages')
                                .select(`
                                    *,
                                    sender:sender_id (
                                        id,
                                        username,
                                        avatar_url
                                    )
                                `)
                                .eq('id', payload.new.id)
                                .single();

                            if (!messages) return;

                            const newMsg = messages as Message;

                            setMessages((prev) => {
                                // Check if message already exists (avoid duplicates)
                                const exists = prev.some((msg) => msg.id === newMsg.id);
                                if (exists) return prev;
                                
                                // Add new message
                                const updatedMessages = [...prev, newMsg];
                                
                                // Sort by created_at to maintain order
                                return updatedMessages.sort((a, b) => 
                                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                                );
                            });

                            // If message is from other user, scroll to bottom
                            if (newMsg.sender_id !== user.id) {
                                setTimeout(() => {
                                    flatListRef.current?.scrollToEnd({ animated: true });
                                }, 100);
                            }

                            // Mark messages as read
                            await chatService.markMessagesAsRead(conversationId);
                        } catch (error) {
                            console.error('Error handling real-time message:', error);
                        }
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('Successfully subscribed to messages');
                    }
                });
        };

        init();

        return () => {
            if (messageChannel) {
                console.log('Cleaning up message subscription');
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
    verifiedIcon: {
        marginLeft: 4,
    },
    postContainer: {
        padding: 12,
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
    failedMessage: {
        opacity: 0.7,
    },
    retryButton: {
        padding: 8,
    },
});
