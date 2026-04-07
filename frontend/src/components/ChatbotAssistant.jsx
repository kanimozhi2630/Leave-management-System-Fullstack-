import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';

const ChatbotAssistant = ({ onUseLetter }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { type: 'bot', text: 'Hi! Tell me why you need leave (e.g. "I am sick with fever and need 2 days off") and I will generate a formal letter for you.' }
  ]);

  const generateLetter = (text) => {
    const reason = text.toLowerCase();
    let formalReason = "personal matters";
    if (reason.includes("fever") || reason.includes("sick") || reason.includes("hospital") || reason.includes("accident")) {
      formalReason = "unexpected medical concerns";
    } else if (reason.includes("wedding") || reason.includes("marriage")) {
      formalReason = "important family functions";
    } else if (reason.includes("emergency")) {
      formalReason = "unforeseen emergencies";
    }

    return `Respected Sir/Madam,\n\nI am writing to formally request a leave of absence due to ${formalReason}. Specifically: "${text}". \n\nI assure you that I will catch up on any missed coursework and assignments promptly upon my return. Thank you for your time and understanding regarding this priority matter.\n\nSincerely,\n[Your Name]`;
  };

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { type: 'user', text: input }]);
    
    setTimeout(() => {
      const formalLetter = generateLetter(input);
      setMessages(prev => [...prev, { type: 'bot', text: 'Here is your formal letter:', letter: formalLetter }]);
    }, 500);
    setInput('');
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#0d9488',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          transition: 'transform 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        title="Open Chatbot Assistant"
      >
        <MessageSquare size={28} />
      </button>
    );
  }

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '2rem', 
      right: '2rem', 
      width: '380px', 
      border: '1px solid #e2e8f0', 
      borderRadius: '12px', 
      padding: '1.5rem', 
      background: 'white',
      boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🤖 Chatbot Assistant</h3>
        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
          <X size={24} />
        </button>
      </div>
      <p style={{fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem'}}>Converts your casual text into a properly formatted, rule-based professional letter seamlessly.</p>
      <div style={{ height: '300px', overflowY: 'auto', marginBottom: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: '1rem', textAlign: m.type === 'user' ? 'right' : 'left' }}>
            <span style={{ display: 'inline-block', padding: '0.6rem 1rem', borderRadius: '8px', background: m.type === 'user' ? '#0d9488' : '#e2e8f0', color: m.type === 'user' ? 'white' : 'black', textAlign: 'left', wordBreak: 'break-word' }}>
              {m.text}
            </span>
            {m.letter && (
              <div style={{ marginTop: '0.5rem', background: '#fff', border: '1px solid #cbd5e1', padding: '1rem', borderRadius: '8px', textAlign: 'left', whiteSpace: 'pre-wrap' }}>
                <em style={{color: '#64748b', fontSize: '0.85rem'}}>Generated Format:</em><br/>
                {m.letter}
                <br/>
                <button 
                  onClick={() => {
                    onUseLetter(m.letter);
                    setIsOpen(false);
                  }}
                  style={{ marginTop: '1rem', background: '#0d9488', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
                  Use this draft
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="E.g. I have a fever..."
          style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend} style={{ background: '#0d9488', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatbotAssistant;
