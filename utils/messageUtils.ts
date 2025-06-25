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

  // Pre-calculate today's UTC date once
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  messages.forEach((message, index) => {
    // Optimize date operations by reusing Date object and avoiding string operations
    const messageDate = new Date(message.created_at);
    const utcYear = messageDate.getUTCFullYear();
    const utcMonth = messageDate.getUTCMonth();
    const utcDay = messageDate.getUTCDate();
    
    // Use template literal for better performance than String.padStart
    const messageDateStr = `${utcYear}-${utcMonth < 9 ? '0' : ''}${utcMonth + 1}-${utcDay < 10 ? '0' : ''}${utcDay}`;
    
    // Check if we need a date separator
    const isNewDate = currentDate !== messageDateStr;
    
    // Add date separator if it's a new date
    if (isNewDate) {
      grouped.push({
        id: `date-${messageDateStr}`,
        type: 'date-separator',
        data: { date: messageDateStr },
      });
      currentDate = messageDateStr;
    }

    // Optimize group detection by avoiding unnecessary Date object creation
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
    
    const isFirstInGroup = !prevMessage || 
      message.sender_id !== prevMessage.sender_id ||
      !isSameMinute(messageDate, new Date(prevMessage.created_at));
    
    const isLastInGroup = !nextMessage ||
      message.sender_id !== nextMessage.sender_id ||
      !isSameMinute(messageDate, new Date(nextMessage.created_at));

    // Add the message
    grouped.push({
      id: message.id,
      type: 'message',
      data: message,
      isFirstInGroup,
      isLastInGroup,
    });
  });

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

// Cache for today's date to avoid recalculating
let cachedTodayUtc: number | null = null;
let cachedYesterdayUtc: number | null = null;
let cachedTodayDate: string | null = null;

const getTodayUtc = (): { todayUtc: number; yesterdayUtc: number; todayDate: string } => {
  const today = new Date();
  const todayDateStr = `${today.getUTCFullYear()}-${today.getUTCMonth() < 9 ? '0' : ''}${today.getUTCMonth() + 1}-${today.getUTCDate() < 10 ? '0' : ''}${today.getUTCDate()}`;
  
  // Only recalculate if the date has changed
  if (cachedTodayDate !== todayDateStr) {
    cachedTodayDate = todayDateStr;
    cachedTodayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    cachedYesterdayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1);
  }
  
  return {
    todayUtc: cachedTodayUtc!,
    yesterdayUtc: cachedYesterdayUtc!,
    todayDate: cachedTodayDate!
  };
};

export const formatDateSeparator = (date: string): string => {
  const messageDate = new Date(date);
  
  // Use UTC date for consistent comparison
  const utcYear = messageDate.getUTCFullYear();
  const utcMonth = messageDate.getUTCMonth();
  const utcDay = messageDate.getUTCDate();
  
  // Create a date object using UTC components for comparison
  const utcDate = Date.UTC(utcYear, utcMonth, utcDay);
  const { todayUtc, yesterdayUtc } = getTodayUtc();
  
  if (utcDate === todayUtc) {
    return 'Today';
  } else if (utcDate === yesterdayUtc) {
    return 'Yesterday';
  } else {
    return format(messageDate, 'MMMM d, yyyy');
  }
};

export const shouldShowDateSeparator = (currentMessage: Message, previousMessage?: Message): boolean => {
  if (!previousMessage) return true;
  
  const currentDate = new Date(currentMessage.created_at);
  const previousDate = new Date(previousMessage.created_at);
  
  // Use UTC dates for consistent comparison
  const currentUtc = new Date(Date.UTC(
    currentDate.getUTCFullYear(),
    currentDate.getUTCMonth(),
    currentDate.getUTCDate()
  ));
  const previousUtc = new Date(Date.UTC(
    previousDate.getUTCFullYear(),
    previousDate.getUTCMonth(),
    previousDate.getUTCDate()
  ));
  
  return currentUtc.getTime() !== previousUtc.getTime();
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