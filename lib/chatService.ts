import { supabase } from '../supabaseClient';
import { Conversation, Message } from '../types/chat';

export const chatService = {
    async getConversations() {
        const { data: currentUser } = await supabase.auth.getUser();
        if (!currentUser.user) throw new Error('Not authenticated');

        // First get all conversations
        const { data: conversations, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .or(`creator_id.eq.${currentUser.user.id},participant_id.eq.${currentUser.user.id}`)
            .order('updated_at', { ascending: false });

        if (convError) throw convError;
        if (!conversations) return [];

        // Get all unique user IDs (excluding current user)
        const userIds = conversations.map(conv => 
            conv.creator_id === currentUser.user.id ? conv.participant_id : conv.creator_id
        );

        // Get all posts referenced in conversations
        const postIds = conversations.map(conv => conv.post_id);

        // Fetch users data
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, username, avatar_url')
            .in('id', userIds);

        if (usersError) throw usersError;

        // Fetch posts data
        const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select('id, title, images, price')
            .in('id', postIds);

        if (postsError) throw postsError;

        // Get last messages for each conversation
        const { data: lastMessages, error: messagesError } = await supabase
            .from('messages')
            .select('conversation_id, content, created_at')
            .in('conversation_id', conversations.map(c => c.id))
            .order('created_at', { ascending: false });

        if (messagesError) throw messagesError;

        // Create a map for quick lookups
        const usersMap = new Map(users?.map(u => [u.id, u]));
        const postsMap = new Map(posts?.map(p => [p.id, p]));
        const lastMessageMap = new Map();
        lastMessages?.forEach(msg => {
            if (!lastMessageMap.has(msg.conversation_id)) {
                lastMessageMap.set(msg.conversation_id, msg);
            }
        });

        // Combine all the data
        return conversations.map(conv => {
            const otherUserId = conv.creator_id === currentUser.user.id ? conv.participant_id : conv.creator_id;
            const otherUser = usersMap.get(otherUserId);
            const post = postsMap.get(conv.post_id);
            const lastMessage = lastMessageMap.get(conv.id);

            // Parse images from JSONB if it exists
            const postImages = post?.images ? (
                typeof post.images === 'string' ? JSON.parse(post.images) : post.images
            ) : [];

            return {
                ...conv,
                post_title: post?.title,
                post_image: postImages[0],
                post_price: post?.price,
                other_user_name: otherUser?.username,
                other_user_avatar: otherUser?.avatar_url,
                last_message: lastMessage?.content,
                last_message_at: lastMessage?.created_at
            };
        });
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