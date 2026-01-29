import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getXSkillsRuntime } from '@x-skills-for-ai/core';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const assistantMessage: Message = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const runtime = getXSkillsRuntime();
      const skills = runtime.inspect();
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content, skills }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let reply = data.reply || '';
      try {
        const parsed = JSON.parse(reply);
        if (parsed && typeof parsed.skill === 'string') {
          const params = parsed.params || {};
          await getXSkillsRuntime().execute(parsed.skill, params);
          reply = `✅ Skill "${parsed.skill}" executed${Object.keys(params).length > 0 ? ` with params: ${JSON.stringify(params)}` : ''}`;
        }
      } catch (e) {
        // Normal text response, keep original reply
      }
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, content: reply } : m
        )
      );
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: `Error: ${(error as Error).message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#f5f5f5' }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              marginBottom: '20px',
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '70%',
                padding: '12px 16px',
                borderRadius: '18px',
                backgroundColor: msg.role === 'user' ? '#007bff' : '#ffffff',
                color: msg.role === 'user' ? 'white' : 'black',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {messages.length > 0 &&
          messages[messages.length - 1].role === 'assistant' &&
          messages[messages.length - 1].content === '' && (
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-start' }}>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '18px',
                  backgroundColor: '#ffffff',
                  color: 'black',
                }}
              >
                ...
              </div>
            </div>
          )}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ padding: '20px', borderTop: '1px solid #ddd' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Type your message here..."
            style={{
              flex: 1,
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              resize: 'none',
              height: '50px',
              fontSize: '16px',
            }}
            disabled={isLoading}
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            style={{
              padding: '12px 24px',
              backgroundColor: isLoading || !input.trim() ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
              fontSize: '16px',
            }}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;