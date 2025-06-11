import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { ConversationList } from '../../../components/chat/ConversationList';
import { useRouter } from 'expo-router';
import { Conversation } from '../../../types/chat';
import { chatService } from '../../../lib/chatService';
import { supabase } from '../../../supabaseClient';
import { useIsFocused } from '@react-navigation/native';
import { useAuthStore } from '../../../store/useAuthStore';
import { useUnreadMessagesStore } from '../../../store/useUnreadMessagesStore';

export default function MessagesScreen() {
    const router = useRouter();
    const theme = useTheme();
    const isFocused = useIsFocused();
    const { user } = useAuthStore();
    const { fetchUnreadCounts, incrementUnreadCount } = useUnreadMessagesStore();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadConversations = useCallback(async () => {
        try {
            setError(null);
            const data = await chatService.getConversations();
            setConversations(data);
            await fetchUnreadCounts();
        } catch (error) {
            console.error('Error loading conversations:', error);
            setError('Failed to load conversations');
        } finally {
            setLoading(false);
        }
    }, [fetchUnreadCounts]);

    const handleDeleteConversation = useCallback(async (conversationId: string) => {
        try {
            await chatService.deleteConversation(conversationId);
            setConversations(prevConversations => 
                prevConversations.filter(conv => conv.id !== conversationId)
            );
            await fetchUnreadCounts(); // Refresh unread counts after deletion
        } catch (error) {
            console.error('Error deleting conversation:', error);
            Alert.alert('Error', 'Failed to delete conversation');
        }
    }, [fetchUnreadCounts]);

    useEffect(() => {
        if (!user) {
            setError('Please sign in to view messages');
            setLoading(false);
            return;
        }

        // Initial load
        loadConversations();

        // Only set up real-time subscription when screen is focused
        if (!isFocused) return;

        // Set up real-time subscription for conversations and messages
        const channel = supabase.channel('messages_realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'conversations'
                },
                async (payload) => {
                    // If conversation is updated/deleted, refresh conversations
                    await loadConversations();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages'
                },
                async (payload) => {
                    if (payload.new && payload.new.sender_id !== user.id) {
                        const conversationId = payload.new.conversation_id;
                        
                        // Check if the conversation is deleted for the current user
                        const { data: conversation } = await supabase
                            .from('conversations')
                            .select('creator_id, deleted_by_creator, deleted_by_participant')
                            .eq('id', conversationId)
                            .single();

                        if (conversation) {
                            const isCreator = conversation.creator_id === user.id;
                            const isDeleted = isCreator ? conversation.deleted_by_creator : conversation.deleted_by_participant;

                            // Only update if the conversation is not deleted for this user
                            if (!isDeleted) {
                                // Update the unread count
                                incrementUnreadCount(conversationId);
                                // Update the conversation list in the background
                                loadConversations();
                            }
                        }
                    }
                }
            );

        // Subscribe to the channel
        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Subscribed to real-time updates');
            }
        });

        // Set up a periodic refresh for unread counts
        const refreshInterval = setInterval(() => {
            if (isFocused) {
                fetchUnreadCounts();
            }
        }, 5000);

        // Cleanup when screen loses focus or unmounts
        return () => {
            console.log('Unsubscribing from real-time updates');
            channel.unsubscribe();
            clearInterval(refreshInterval);
        };
    }, [isFocused, loadConversations, user, fetchUnreadCounts, incrementUnreadCount]);

    const handleSelectConversation = (conversation: Conversation) => {
        router.push({
            pathname: "/ChatRoom",
            params: { 
                id: conversation.id,
                conversation: JSON.stringify(conversation)
            }
        });
    };

    if (error) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
                <View style={[styles.header, { borderBottomColor: theme.colors.surfaceVariant }]}>
                    <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>Messages</Text>
                </View>
                <View style={styles.centerContent}>
                    <Text style={{ color: theme.colors.error }}>{error}</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.header, { borderBottomColor: theme.colors.surfaceVariant }]}>
                <Text variant="headlineMedium" style={{ color: theme.colors.onBackground }}>Messages</Text>
            </View>
            <ConversationList
                conversations={conversations}
                loading={loading}
                onSelectConversation={handleSelectConversation}
                onDeleteConversation={handleDeleteConversation}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
}); 