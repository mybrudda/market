import { supabase } from '../supabaseClient';
import { Conversation, Message } from '../types/chat';

export const chatService = {
    async getConversations() {
        const { data: conversations, error } = await supabase
            .from('conversation_details')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) throw error;
        if (!conversations) return [];

        return conversations.map(conv => ({
            ...conv,
            post_image: conv.post_images?.[0] || null,
            last_message: typeof conv.last_message === 'string' 
                ? conv.last_message 
                : conv.last_message?.content
        }));
    },

    async getMessages(conversationId: string) {
        // First get messages
        const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;
        if (!messages) return [];

        // Get all unique sender IDs
        const senderIds = [...new Set(messages.map(m => m.sender_id))];

        // Then get user info for all senders
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, username, avatar_url')
            .in('id', senderIds);

        if (usersError) throw usersError;
        if (!users) return messages;

        // Create a map for quick user lookups
        const usersMap = new Map(users.map(u => [u.id, u]));

        // Combine message data with sender info
        return messages.map(message => ({
            ...message,
            sender: usersMap.get(message.sender_id)
        }));
    },

    async sendMessage(conversationId: string, content: string) {
        const { data: currentUser } = await supabase.auth.getUser();
        if (!currentUser.user) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: currentUser.user.id,
                content
            })
            .select()
            .single();

        if (error) throw error;

        // Update conversation's updated_at timestamp
        await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);

        return data;
    },

    async createConversation(postId: string, participantId: string) {
        const { data: currentUser } = await supabase.auth.getUser();
        if (!currentUser.user) throw new Error('Not authenticated');

        // Check if conversation already exists
        const { data: existingConv } = await supabase
            .from('conversations')
            .select('*')
            .eq('post_id', postId)
            .or(`and(creator_id.eq.${currentUser.user.id},participant_id.eq.${participantId}),and(creator_id.eq.${participantId},participant_id.eq.${currentUser.user.id})`)
            .single();

        if (existingConv) return existingConv;

        // Create new conversation
        const { data, error } = await supabase
            .from('conversations')
            .insert({
                post_id: postId,
                creator_id: currentUser.user.id,
                participant_id: participantId
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async markMessagesAsRead(conversationId: string) {
        const { data: currentUser } = await supabase.auth.getUser();
        if (!currentUser.user) throw new Error('Not authenticated');

        const { error } = await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('conversation_id', conversationId)
            .neq('sender_id', currentUser.user.id)
            .is('read_at', null);

        if (error) throw error;
    }
}; 