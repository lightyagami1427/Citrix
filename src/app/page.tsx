'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Message } from '@/types';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import LoadingIndicator from '@/components/LoadingIndicator';
import EmptyState from '@/components/EmptyState';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const generateId = () =>
    `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const sendMessage = useCallback(
    async (query?: string) => {
      const messageText = query || input.trim();
      if (!messageText || isLoading) return;

      // Add user message
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: messageText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: messageText }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Something went wrong');
        }

        const assistantMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: data.response,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        const errorMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred. Please try again.',
          timestamp: Date.now(),
          isError: true,
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading]
  );

  const handleRegenerate = useCallback(
    (messageIndex: number) => {
      // Find the user message before this assistant message
      const userMsg = messages
        .slice(0, messageIndex)
        .reverse()
        .find((m) => m.role === 'user');
      if (!userMsg) return;

      // Remove the assistant message and regenerate
      setMessages((prev) => prev.filter((_, i) => i !== messageIndex));
      sendMessage(userMsg.content);
    },
    [messages, sendMessage]
  );

  const handleSuggestionClick = (query: string) => {
    sendMessage(query);
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header__brand">
          <div className="header__logo">C</div>
          <div>
            <div className="header__title">Citrix Copilot</div>
            <div className="header__subtitle">
              AI-Powered Troubleshooting Assistant
            </div>
          </div>
        </div>
        <div className="header__status">
          <span className="header__status-dot" />
          Online
        </div>
      </header>

      {/* Chat Area */}
      <div className="chat" ref={chatContainerRef} id="chat-area">
        <div className="chat__messages">
          {messages.length === 0 && !isLoading ? (
            <EmptyState onSuggestionClick={handleSuggestionClick} />
          ) : (
            <>
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  onRegenerate={
                    message.role === 'assistant'
                      ? () => handleRegenerate(index)
                      : undefined
                  }
                />
              ))}
            </>
          )}
          {isLoading && <LoadingIndicator />}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSubmit={() => sendMessage()}
        isLoading={isLoading}
      />
    </div>
  );
}
