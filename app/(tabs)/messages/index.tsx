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

export default function MessagesScreen() {
    const router = useRouter();
    const theme = useTheme();
    const isFocused = useIsFocused();
    const { user } = useAuthStore();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadConversations = useCallback(async () => {
        try {
            setError(null);
            const data = await chatService.getConversations();
            setConversations(data);
        } catch (error) {
            console.error('Error loading conversations:', error);
            setError('Failed to load conversations');
        } finally {
            setLoading(false);
        }
    }, []); 

    const handleDeleteConversation = useCallback(async (conversationId: string) => {
        try {
            await chatService.deleteConversation(conversationId);
            setConversations(prevConversations => 
                prevConversations.filter(conv => conv.id !== conversationId)
            );
        } catch (error) {
            console.error('Error deleting conversation:', error);
            Alert.alert('Error', 'Failed to delete conversation');
        }
    }, []);

    useEffect(() => {
        // Don't load or subscribe if user is not authenticated
        if (!user) {
            setError('Please sign in to view messages');
            setLoading(false);
            return;
        }

        // Initial load
        loadConversations();

        // Only set up real-time subscription when screen is focused
        if (!isFocused) return;

        // Set up real-time subscription for conversations
        const channel = supabase.channel('messages_realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'conversations'
                },
                async () => {
                    await loadConversations();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'conversations'
                },
                async () => {
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
                async () => {
                    await loadConversations();
                }
            );

        // Subscribe to the channel
        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Subscribed to real-time updates');
            }
        });

        // Cleanup when screen loses focus or unmounts
        return () => {
            console.log('Unsubscribing from real-time updates');
            channel.unsubscribe();
        };
    }, [isFocused, loadConversations, user]);

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