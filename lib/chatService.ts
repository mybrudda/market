import { supabase } from '../supabaseClient';
import { Conversation, Message } from '../types/chat';

export const chatService = {
    async getConversations() {
        const { data: currentUser } = await supabase.auth.getUser();
        if (!currentUser.user) throw new Error('Not authenticated');

        const { data: conversations, error } = await supabase
            .from('conversation_details')
            .select('*')
            .or(`and(creator_id.eq.${currentUser.user.id},deleted_by_creator.eq.false),and(participant_id.eq.${currentUser.user.id},deleted_by_participant.eq.false)`)
            .order('last_activity_date', { ascending: false });

        if (error) throw error;
        if (!conversations) return [];

        return conversations.map(conv => ({
            ...conv,
            last_message: typeof conv.last_message === 'string' 
                ? conv.last_message 
                : conv.last_message?.content,
            unread_count: conv.creator_id === currentUser.user.id 
                ? (conv.unread_count_creator || 0)
                : (conv.unread_count_participant || 0)
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
        
        // Add sender information to the returned message
        return {
            ...data,
            sender: {
                id: currentUser.user.id,
                username: currentUser.user.email || currentUser.user.id,
                avatar_url: null
            }
        };
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

        // The unread count will be automatically updated by the database trigger
    },

    async deleteConversation(conversationId: string) {
        const { data: currentUser } = await supabase.auth.getUser();
        if (!currentUser.user) throw new Error('Not authenticated');

        console.log('Current user ID:', currentUser.user.id);

        // Get the conversation to check user's role
        const { data: conversation, error: convError } = await supabase
            .from('conversations')
            .select('creator_id, participant_id, deleted_by_creator, deleted_by_participant')
            .eq('id', conversationId)
            .single();

        if (convError) throw convError;
        if (!conversation) throw new Error('Conversation not found');

        console.log('Conversation details:', {
            conversationId,
            creatorId: conversation.creator_id,
            participantId: conversation.participant_id,
            deletedByCreator: conversation.deleted_by_creator,
            deletedByParticipant: conversation.deleted_by_participant
        });

        // Check if user is creator or participant
        const isCreator = currentUser.user.id === conversation.creator_id;
        const isParticipant = currentUser.user.id === conversation.participant_id;

        console.log('Role check:', { isCreator, isParticipant });

        if (!isCreator && !isParticipant) {
            throw new Error('User is not part of this conversation');
        }

        // Update the appropriate field
        const updateData: { deleted_by_creator?: boolean; deleted_by_participant?: boolean } = {};
        
        if (isCreator) {
            updateData.deleted_by_creator = true;
            console.log('User is creator, updating deleted_by_creator');
        } else {
            updateData.deleted_by_participant = true;
            console.log('User is participant, updating deleted_by_participant');
        }

        console.log('Update data:', updateData);

        // Update the conversation
        const { data: updatedConversation, error } = await supabase
            .from('conversations')
            .update(updateData)
            .eq('id', conversationId)
            .select()
            .single();

        if (error) {
            console.error('Error updating conversation:', error);
            throw error;
        }

        console.log('Updated conversation:', updatedConversation);
    }
}; 