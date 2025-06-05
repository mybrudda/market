import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Message } from '../types/chat';
import { format } from 'date-fns';
import { Image } from 'expo-image';

interface ChatMessageProps {
    message: Message;
    isOwnMessage: boolean;
}

export function ChatMessage({ message, isOwnMessage }: ChatMessageProps) {
    const theme = useTheme();

    return (
        <View style={[
            styles.container,
            isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
        ]}>
            {!isOwnMessage && message.sender?.avatar_url && (
                <Image
                    source={message.sender.avatar_url}
                    style={styles.avatar}
                    contentFit="cover"
                    transition={200}
                />
            )}
            <View style={[
                styles.bubble,
                {
                    backgroundColor: isOwnMessage ? theme.colors.primary : theme.colors.surfaceVariant,
                },
            ]}>
                <Text
                    variant="bodyMedium"
                    style={[
                        styles.messageText,
                        { color: isOwnMessage ? theme.colors.onPrimary : theme.colors.onSurface }
                    ]}
                >
                    {message.content}
                </Text>
            </View>
            <Text 
                variant="labelSmall"
                style={[
                    styles.timeText,
                    { color: theme.colors.onSurfaceVariant }
                ]}
            >
                {format(new Date(message.created_at), 'h:mm a')}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginVertical: 4,
        maxWidth: '80%',
    },
    ownMessageContainer: {
        alignSelf: 'flex-end',
    },
    otherMessageContainer: {
        alignSelf: 'flex-start',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
    },
    bubble: {
        borderRadius: 16,
        padding: 12,
    },
    messageText: {
        flexShrink: 1,
    },
    timeText: {
        marginTop: 4,
        marginHorizontal: 4,
    },
}); 