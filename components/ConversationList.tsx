 import React from 'react';
import {
    View,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { Conversation } from '../types/chat';
import { format } from 'date-fns';
import { Text, useTheme } from 'react-native-paper';

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
    const theme = useTheme();

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    if (conversations.length === 0) {
        return (
            <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                    No conversations yet
                </Text>
            </View>
        );
    }

    const renderItem = ({ item }: { item: Conversation }) => (
        <TouchableOpacity
            style={[
                styles.conversationItem,
                {
                    backgroundColor: theme.colors.surface,
                    borderBottomColor: theme.colors.surfaceVariant
                }
            ]}
            onPress={() => onSelectConversation(item)}
        >
            <Image
                source={item.post_image || 'https://via.placeholder.com/60'}
                style={styles.postImage}
                contentFit="cover"
                transition={200}
            />
            <View style={styles.conversationInfo}>
                <View style={styles.headerRow}>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                        {item.other_user_name}
                    </Text>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                        {format(new Date(item.updated_at), 'MMM d, h:mm a')}
                    </Text>
                </View>
                <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurfaceVariant }}
                    numberOfLines={1}
                >
                    Re: {item.post_title}
                </Text>
                {item.last_message && (
                    <Text
                        variant="bodyMedium"
                        style={{ color: theme.colors.onSurface }}
                        numberOfLines={1}
                    >
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
            style={[styles.container, { backgroundColor: theme.colors.background }]}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    conversationItem: {
        flexDirection: 'row',
        padding: 15,
        borderBottomWidth: 1,
    },
    postImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
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
}); 