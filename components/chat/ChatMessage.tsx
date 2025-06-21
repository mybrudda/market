import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Message } from '../../types/chat';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ChatMessageProps {
    message: Message;
    isOwnMessage: boolean;
    hasFailed?: boolean;
}

export const ChatMessage = memo(({ message, isOwnMessage, hasFailed }: ChatMessageProps) => {
    const theme = useTheme();

    return (
        <View style={[
            styles.container,
            isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer,
            hasFailed && styles.failedMessage
        ]}>
            <View style={[
                styles.bubble,
                {
                    backgroundColor: isOwnMessage 
                        ? hasFailed 
                            ? theme.colors.errorContainer 
                            : theme.colors.primary 
                        : theme.colors.surfaceVariant,
                },
            ]}>
                <Text
                    variant="bodyMedium"
                    style={[
                        styles.messageText,
                        { 
                            color: isOwnMessage 
                                ? hasFailed
                                    ? theme.colors.error
                                    : theme.colors.onPrimary 
                                : theme.colors.onSurface 
                        }
                    ]}
                >
                    {message.content}
                </Text>
                {hasFailed && (
                    <MaterialCommunityIcons
                        name="alert-circle"
                        size={16}
                        color={theme.colors.error}
                        style={styles.errorIcon}
                    />
                )}
            </View>
            <View style={[
                styles.messageFooter,
                isOwnMessage ? styles.ownMessageFooter : styles.otherMessageFooter
            ]}>
                <Text 
                    variant="labelSmall"
                    style={[
                        styles.timeText,
                        { color: hasFailed ? theme.colors.error : theme.colors.onSurfaceVariant }
                    ]}
                >
                    {hasFailed ? 'Failed to send - Tap to retry' : format(new Date(message.created_at), 'h:mm a')}
                </Text>
                {isOwnMessage && !hasFailed && (
                    <View style={styles.readStatusContainer}>
                        <MaterialCommunityIcons
                            name={message.read_at ? "check-all" : "check"}
                            size={16}
                            color={message.read_at ? theme.colors.primary : theme.colors.onSurfaceVariant}
                            style={styles.readStatusIcon}
                        />
                    </View>
                )}
            </View>
        </View>
    );
}, (prevProps, nextProps) => {
    // Custom comparison function for better memoization
    return (
        prevProps.message.id === nextProps.message.id &&
        prevProps.message.content === nextProps.message.content &&
        prevProps.message.created_at === nextProps.message.created_at &&
        prevProps.message.read_at === nextProps.message.read_at &&
        prevProps.isOwnMessage === nextProps.isOwnMessage &&
        prevProps.hasFailed === nextProps.hasFailed
    );
});

ChatMessage.displayName = 'ChatMessage';

const styles = StyleSheet.create({
    container: {
        marginVertical: 8,
        maxWidth: '80%',
    },
    ownMessageContainer: {
        alignSelf: 'flex-end',
    },
    otherMessageContainer: {
        alignSelf: 'flex-start',
    },
    bubble: {
        borderRadius: 16,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    messageText: {
        flexShrink: 1,
        marginRight: 4,
    },
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        marginHorizontal: 4,
    },
    ownMessageFooter: {
        justifyContent: 'flex-end',
    },
    otherMessageFooter: {
        justifyContent: 'flex-start',
    },
    timeText: {
        fontSize: 11,
    },
    failedMessage: {
        opacity: 0.9,
    },
    errorIcon: {
        marginLeft: 4,
    },
    readStatusContainer: {
        marginLeft: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    readStatusIcon: {
        marginLeft: 2,
    },
}); 