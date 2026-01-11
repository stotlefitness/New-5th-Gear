-- 006_clear_messages.sql
-- Clear all messages from the messages table
-- This deletes all messages but keeps conversations intact

DELETE FROM public.messages;
