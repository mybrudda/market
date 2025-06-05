import React from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { Conversation } from '../types/chat';
import { format } from 'date-fns';

interface ConversationListProps {
    conversations: Conversation[];
    loading: boolean;
    onSelectConversation: (conversation: Conversation) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
    conversations,
    loading,
    onSelectConversation,
}) => {
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    if (conversations.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No conversations yet</Text>
            </View>
        );
    }

    const renderItem = ({ item }: { item: Conversation }) => (
        <TouchableOpacity
            style={styles.conversationItem}
            onPress={() => onSelectConversation(item)}
        >
            <Image
                source={item.other_user_avatar || 'https://via.placeholder.com/40'}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
            />
            <View style={styles.conversationInfo}>
                <View style={styles.headerRow}>
                    <Text style={styles.username}>{item.other_user_name}</Text>
                    <Text style={styles.time}>
                        {format(new Date(item.updated_at), 'MMM d, h:mm a')}
                    </Text>
                </View>
                <Text style={styles.postTitle} numberOfLines={1}>
                    Re: {item.post_title}
                </Text>
                {item.last_message && (
                    <Text style={styles.lastMessage} numberOfLines={1}>
                        {item.last_message}
                    </Text>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <FlatList
            data={conversations}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            style={styles.container}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
    },
    conversationItem: {
        flexDirection: 'row',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    conversationInfo: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
    },
    time: {
        fontSize: 12,
        color: '#666',
    },
    postTitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    lastMessage: {
        fontSize: 14,
        color: '#444',
    },
}); 