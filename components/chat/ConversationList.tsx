import React, { useState } from 'react';
import {
    View,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator
} from 'react-native';
import { Image } from 'expo-image';
import { Conversation } from '../../types/chat';
import { format } from 'date-fns';
import { Text, useTheme } from 'react-native-paper';

interface ConversationListProps {
    conversations: Conversation[];
    loading: boolean;
    onSelectConversation: (conversation: Conversation) => void;
}

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/60';
const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

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

    const renderItem = ({ item }: { item: Conversation }) => {
        const isPostActive = item.post_status === 'active';

        return (
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
                    source={isPostActive ? (item.post_image || PLACEHOLDER_IMAGE) : PLACEHOLDER_IMAGE}
                    style={[
                        styles.postImage,
                        !isPostActive && { opacity: 0.5 }
                    ]}
                    contentFit="cover"
                    transition={200}
                    placeholder={blurhash}
                    cachePolicy="memory-disk"
                />
                <View style={styles.conversationInfo}>
                    <View style={styles.headerRow}>
                        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                            {item.other_user_full_name || item.other_user_name}
                        </Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {format(new Date(item.updated_at), 'MMM d, h:mm a')}
                        </Text>
                    </View>
                    <Text
                        variant="bodyMedium"
                        style={{ 
                            color: isPostActive ? theme.colors.onSurfaceVariant : theme.colors.error,
                            fontStyle: isPostActive ? 'normal' : 'italic'
                        }}
                        numberOfLines={1}
                    >
                        {isPostActive ? `Re: ${item.post_title}` : 'This post is no longer available'}
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
    };

    return (
        <FlatList
            data={conversations}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
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
        backgroundColor: '#f0f0f0',
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