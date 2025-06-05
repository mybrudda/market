import React, { useEffect, useState, useRef } from 'react';
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

            // Load conversation details
            try {
                const conversations = await chatService.getConversations();
                const currentConversation = conversations.find(c => c.id === conversationId);
                if (currentConversation) {
                    setConversation(currentConversation);
                }
            } catch (error) {
                console.error('Failed to load conversation:', error);
            }

            // Load existing messages
            try {
                const data = await chatService.getMessages(conversationId);
                setMessages(data);
                await chatService.markMessagesAsRead(conversationId);
            } catch (error) {
                console.error('Failed to load messages:', error);
            }
            setLoading(false);

            // Setup realtime subscription AFTER user is set
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
                            // Prevent duplicates
                            const exists = prev.some((msg) => msg.id === newMsg.id);
                            if (exists) return prev;
                            return [...prev, newMsg];
                        });

                        // Scroll only if incoming message (not sent by current user)
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

        // Cleanup subscription on unmount
        return () => {
            if (messageChannel) {
                supabase.removeChannel(messageChannel);
            }
        };
    }, [conversationId]);

    const handleSendMessage = async () => {
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
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isOwnMessage = item.sender_id === currentUser?.id;
        return <ChatMessage message={item} isOwnMessage={isOwnMessage} />;
    };

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

    const ListHeaderComponent = () => (
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
    );

    if (loading || !currentUser) {
        return (
            <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Header title={'Chat'} />
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    style={styles.messageList}
                    contentContainerStyle={[
                        styles.messageListContent,
                        { backgroundColor: theme.colors.background }
                    ]}
                    showsVerticalScrollIndicator={false}
                    initialNumToRender={20}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    ListHeaderComponent={ListHeaderComponent}
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
        </SafeAreaView>
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
    keyboardView: {
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
        padding: 8,
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
