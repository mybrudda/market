import React, { useState, useRef } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Animated, Platform } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttachment?: () => void;
  isSending?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export const ChatInput = ({
  value,
  onChangeText,
  onSend,
  onAttachment,
  isSending = false,
  disabled = false,
  placeholder = "Type a message...",
  maxLength = 1000
}: ChatInputProps) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const animatedValue = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleSend = () => {
    if (value.trim() && !isSending && !disabled) {
      onSend();
      inputRef.current?.blur();
    }
  };

  const borderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.surfaceVariant, theme.colors.primary],
  });

  const hasText = value.trim().length > 0;

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: theme.colors.surface,
        borderTopColor: theme.colors.surfaceVariant,
      }
    ]}>
      {/* Top border for visual separation */}
      <View style={[styles.topBorder, { backgroundColor: theme.colors.surfaceVariant }]} />
      
      <View style={styles.inputRow}>
        {/* Attachment button */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.colors.surfaceVariant }]}
          onPress={onAttachment}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name="paperclip"
            size={24}
            color={theme.colors.onSurfaceVariant}
          />
        </TouchableOpacity>

        {/* Main input area */}
        <Animated.View style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderColor,
          }
        ]}>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              {
                color: theme.colors.onSurface,
                fontSize: 16,
              }
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            multiline
            maxLength={maxLength}
            onFocus={handleFocus}
            onBlur={handleBlur}
            editable={!disabled}
            textAlignVertical="center"
            scrollEnabled={false}
          />
          
          {/* Character count */}
          {value.length > maxLength * 0.8 && (
            <Text style={[
              styles.charCount,
              { color: value.length > maxLength * 0.9 ? theme.colors.error : theme.colors.onSurfaceVariant }
            ]}>
              {value.length}/{maxLength}
            </Text>
          )}
        </Animated.View>

        {/* Send button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: hasText 
                ? theme.colors.primary 
                : theme.colors.surfaceVariant,
            }
          ]}
          onPress={handleSend}
          disabled={disabled || !hasText || isSending}
          activeOpacity={0.8}
        >
          {isSending ? (
            <Animated.View style={styles.loadingContainer}>
              <MaterialCommunityIcons
                name="loading"
                size={24}
                color={theme.colors.onPrimary}
              />
            </Animated.View>
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={hasText ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 110 : 100,
  },
  topBorder: {
    height: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    padding: 0,
    margin: 0,
    textAlignVertical: 'center',
  },
  charCount: {
    fontSize: 10,
    textAlign: 'right',
    marginTop: 2,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 