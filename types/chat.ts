export interface Conversation {
    id: string;
    post_id: string;
    creator_id: string;
    participant_id: string;
    created_at: string;
    updated_at: string;
    post_title: string;
    post_image: string;
    post_price: number;
    post_status: 'active' | 'expired' | 'removed' | 'pending';
    other_user_name: string;
    other_user_full_name: string | null;
    other_user_avatar: string | null;
    other_user_is_verified: boolean | null;
    other_user_type: 'person' | 'company';
    last_message: string | null;
    last_message_at?: string;
    unread_count: number;
    user?: {
        id: string;
        username: string;
        avatar_url: string | null;
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
        avatar_url: string | null;
    };
}

export interface ChatState {
    conversations: Conversation[];
    currentConversation: Conversation | null;
    messages: Message[];
    loading: boolean;
    error: string | null;
} 