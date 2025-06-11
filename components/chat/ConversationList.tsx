import React from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Dimensions
} from 'react-native';
import { SwipeListView } from 'react-native-swipe-list-view';
import { Image } from 'expo-image';
import { Conversation } from '../../types/chat';
import { format } from 'date-fns';
import { Text, useTheme, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { chatService } from '../../lib/chatService';

interface ConversationListProps {
    conversations: Conversation[];
    loading: boolean;
    onSelectConversation: (conversation: Conversation) => void;
    onDeleteConversation: (conversationId: string) => Promise<void>;
}

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/60';
const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export const ConversationList: React.FC<ConversationListProps> = ({
    conversations,
    loading,
    onSelectConversation,
    onDeleteConversation,
}) => {
    const theme = useTheme();

    const handleDelete = async (conversation: Conversation) => {
        Alert.alert(
            "Delete Conversation",
            "Are you sure you want to delete this conversation? The other participant will still be able to see it.",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => onDeleteConversation(conversation.id)
                }
            ]
        );
    };

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
            <Surface
                style={[
                    styles.conversationItem,
                    {
                        backgroundColor: theme.colors.surface,
                    }
                ]}
                elevation={0}
            >
                <TouchableOpacity
                    onPress={() => onSelectConversation(item)}
                    activeOpacity={0.7}
                    style={styles.touchableContent}
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
                                {format(new Date(item.last_activity_date), 'MMM d, h:mm a')}
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
                                style={{ color: theme.colors.onSurfaceVariant }}
                                numberOfLines={1}
                            >
                                {item.last_message}
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>
            </Surface>
        );
    };

    const renderHiddenItem = ({ item }: { item: Conversation }) => (
        <View style={[styles.rowBack, { backgroundColor: theme.colors.errorContainer }]}>
            <TouchableOpacity
                style={[styles.backRightBtn, { backgroundColor: theme.colors.error }]}
                onPress={() => handleDelete(item)}
            >
                <View style={styles.deleteIconContainer}>
                    <MaterialCommunityIcons
                        name="delete"
                        size={24}
                        color={theme.colors.onError}
                    />
                    <Text style={[styles.backTextWhite, { color: theme.colors.onError }]}>
                        Delete
                    </Text>
                </View>
            </TouchableOpacity>
        </View>
    );

    return (
        <SwipeListView
            data={conversations}
            renderItem={renderItem}
            renderHiddenItem={renderHiddenItem}
            rightOpenValue={-75}
            disableRightSwipe
            keyExtractor={(item) => item.id}
            style={[styles.container, { backgroundColor: theme.colors.background }]}
            closeOnRowPress={true}
            closeOnRowOpen={false}
            recalculateHiddenLayout={true}
            previewRowKey={conversations[0]?.id}
            previewOpenValue={-40}
            previewOpenDelay={3000}
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
        marginBottom: 1,
        minHeight: 100,
    },
    touchableContent: {
        flexDirection: 'row',
        padding: 15,
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
    rowBack: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingLeft: 15,
        marginBottom: 1,
        minHeight: 100,
    },
    backRightBtn: {
        alignItems: 'center',
        bottom: 0,
        justifyContent: 'center',
        position: 'absolute',
        top: 0,
        width: 75,
        right: 0,
    },
    deleteIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    backTextWhite: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
    },
}); 