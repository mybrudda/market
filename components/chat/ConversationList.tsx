import React from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SwipeListView } from 'react-native-swipe-list-view';
import { Image as ExpoImage } from 'expo-image';
import { Conversation } from '../../types/chat';
import { format } from 'date-fns';
import { Text, useTheme, Surface, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useUnreadMessagesStore } from '../../store/useUnreadMessagesStore';
import { useAuthStore } from '../../store/useAuthStore';

const PLACEHOLDER_IMAGE = 'https://res.cloudinary.com/dtac4dhtj/image/upload/v1701835686/placeholder_image.jpg';
const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

interface ConversationListProps {
    conversations: Conversation[];
    loading: boolean;
    onSelectConversation: (conversation: Conversation) => void;
    onDeleteConversation: (conversationId: string) => Promise<void>;
}

export const ConversationList: React.FC<ConversationListProps> = ({
    conversations,
    loading,
    onSelectConversation,
    onDeleteConversation,
}) => {
    const theme = useTheme();
    const { unreadCounts } = useUnreadMessagesStore();
    const { user } = useAuthStore();

    const handleDelete = async (conversation: Conversation) => {
        Alert.alert(
            "Delete Conversation",
            "Are you sure you want to delete this conversation?",
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
        const isCreator = item.creator_id === user?.id;
        const isDeleted = isCreator ? item.deleted_by_creator : item.deleted_by_participant;
        const unreadCount = !isDeleted ? (unreadCounts[item.id] || 0) : 0;
        const lastActivityDate = new Date(item.last_activity_date);
        const formattedDate = format(lastActivityDate, 'MMM d, h:mm a');
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
                    <ExpoImage
                        source={{ uri: isPostActive ? (item.post_image || PLACEHOLDER_IMAGE) : PLACEHOLDER_IMAGE }}
                        style={[
                            styles.postImage,
                            !isPostActive && { opacity: 0.5 }
                        ]}
                        contentFit="cover"
                        transition={200}
                        placeholder={blurhash}
                    />
                    <View style={styles.conversationInfo}>
                        <View style={styles.headerRow}>
                            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                                {item.other_user_full_name || item.other_user_name}
                                {item.other_user_is_verified && (
                                    <MaterialCommunityIcons
                                        name="check-decagram"
                                        size={16}
                                        color={theme.colors.primary}
                                        style={styles.verifiedIcon}
                                    />
                                )}
                            </Text>
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                {formattedDate}
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
                        <View style={styles.messageContainer}>
                            <Text
                                variant="bodyMedium"
                                numberOfLines={1}
                                style={[
                                    styles.lastMessage,
                                    { 
                                        color: unreadCount > 0 
                                            ? theme.colors.onBackground 
                                            : theme.colors.onSurfaceVariant,
                                        fontWeight: unreadCount > 0 ? '600' : '400'
                                    }
                                ]}
                            >
                                {item.last_message || 'No messages yet'}
                            </Text>
                            {!isDeleted && unreadCount > 0 && (
                                <Badge
                                    size={24}
                                    style={[
                                        styles.badge,
                                        { 
                                            backgroundColor: '#EF4444',
                                            color: '#FFFFFF',
                                            fontSize: 14,
                                            
                                          
                                        }
                                    ]}
                                >
                                    {unreadCount}
                                </Badge>
                            )}
                        </View>
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
    verifiedIcon: {
        marginLeft: 4,
    },
    messageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    lastMessage: {
        flex: 1,
        marginRight: 8,
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
    badge: {
        marginLeft: 8,
    },
}); 