import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { ConversationList } from '../../../components/ConversationList';
import { useRouter } from 'expo-router';
import { Conversation } from '../../../types/chat';
import { chatService } from '../../../lib/chatService';

export default function MessagesScreen() {
    const router = useRouter();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConversations();
    }, []);

    const loadConversations = async () => {
        try {
            const data = await chatService.getConversations();
            setConversations(data);
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectConversation = (conversation: Conversation) => {
        router.push({
            pathname: "/chatDetails",
            params: { id: conversation.id }
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text variant="headlineMedium">Messages</Text>
            </View>
            <ConversationList
                conversations={conversations}
                loading={loading}
                onSelectConversation={handleSelectConversation}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
}); 