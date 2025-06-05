export interface Conversation {
    id: string;
    post_id: string;
    creator_id: string;
    participant_id: string;
    created_at: string;
    updated_at: string;
    // Additional fields from joins
    post_title?: string;
    post_image?: string;
    post_price?: number;
    other_user_name?: string;
    other_user_avatar?: string;
    last_message?: string;
    last_message_at?: string;
    unread_count?: number;
    user?: {
        id: string;
        username: string;
        avatar_url: string | null;
        email: string;
        user_type: 'person' | 'company';
        is_verified: boolean | null;
    };
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    read_at: string | null;
    sender?: {
        id: string;
        username: string;
        avatar_url: string;
    };
}

export interface ChatState {
    conversations: Conversation[];
    currentConversation: Conversation | null;
    messages: Message[];
    loading: boolean;
    error: string | null;
} 