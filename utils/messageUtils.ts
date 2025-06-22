import { Message } from '../types/chat';
import { format, isToday, isYesterday, isSameDay, isSameMinute } from 'date-fns';

export interface GroupedMessage {
  id: string;
  type: 'message' | 'date-separator';
  data: Message | { date: string };
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

export const groupMessages = (messages: Message[]): GroupedMessage[] => {
  if (messages.length === 0) return [];

  const grouped: GroupedMessage[] = [];
  let currentDate: string | null = null;
  let currentSender: string | null = null;
  let currentGroup: Message[] = [];

  const addGroupToResult = (group: Message[], showDateSeparator: boolean) => {
    if (group.length === 0) return;

    // Add date separator if needed
    if (showDateSeparator && currentDate) {
      grouped.push({
        id: `date-${currentDate}`,
        type: 'date-separator',
        data: { date: currentDate },
      });
    }

    // Add messages in group
    group.forEach((message, index) => {
      grouped.push({
        id: message.id,
        type: 'message',
        data: message,
        isFirstInGroup: index === 0,
        isLastInGroup: index === group.length - 1,
      });
    });
  };

  messages.forEach((message, index) => {
    const messageDate = new Date(message.created_at);
    const messageDateStr = format(messageDate, 'yyyy-MM-dd');
    const isNewDate = currentDate !== messageDateStr;
    const isNewSender = currentSender !== message.sender_id;
    const isTimeGap = index > 0 && !isSameMinute(messageDate, new Date(messages[index - 1].created_at));

    // Check if we should start a new group
    const shouldStartNewGroup = isNewSender || isTimeGap || isNewDate;

    if (shouldStartNewGroup && currentGroup.length > 0) {
      addGroupToResult(currentGroup, isNewDate);
      currentGroup = [];
    }

    // Update current date and sender
    if (isNewDate) {
      currentDate = messageDateStr;
    }
    currentSender = message.sender_id;

    // Add message to current group
    currentGroup.push(message);
  });

  // Add the last group
  if (currentGroup.length > 0) {
    addGroupToResult(currentGroup, true);
  }

  return grouped;
};

export const formatMessageTime = (date: string): string => {
  const messageDate = new Date(date);
  if (isToday(messageDate)) {
    return format(messageDate, 'h:mm a');
  } else if (isYesterday(messageDate)) {
    return `Yesterday, ${format(messageDate, 'h:mm a')}`;
  } else {
    return format(messageDate, 'MMM d, h:mm a');
  }
};

export const formatDateSeparator = (date: string): string => {
  const messageDate = new Date(date);
  if (isToday(messageDate)) {
    return 'Today';
  } else if (isYesterday(messageDate)) {
    return 'Yesterday';
  } else {
    return format(messageDate, 'EEEE, MMMM d, yyyy');
  }
};

export const shouldShowDateSeparator = (currentMessage: Message, previousMessage?: Message): boolean => {
  if (!previousMessage) return true;
  
  const currentDate = new Date(currentMessage.created_at);
  const previousDate = new Date(previousMessage.created_at);
  
  return !isSameDay(currentDate, previousDate);
};

export const isFirstInGroup = (currentMessage: Message, previousMessage?: Message): boolean => {
  if (!previousMessage) return true;
  
  const currentDate = new Date(currentMessage.created_at);
  const previousDate = new Date(previousMessage.created_at);
  
  return (
    currentMessage.sender_id !== previousMessage.sender_id ||
    !isSameMinute(currentDate, previousDate)
  );
};

export const isLastInGroup = (currentMessage: Message, nextMessage?: Message): boolean => {
  if (!nextMessage) return true;
  
  const currentDate = new Date(currentMessage.created_at);
  const nextDate = new Date(nextMessage.created_at);
  
  return (
    currentMessage.sender_id !== nextMessage.sender_id ||
    !isSameMinute(currentDate, nextDate)
  );
}; 