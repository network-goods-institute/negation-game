'use client';

import { useEffect, useState } from 'react';
import { encodeId } from '@/lib/negation-game/encodeId';

interface Topic {
  id: number;
  name: string;
  space: string;
  discourseUrl?: string;
}

interface Rationale {
  id: string;
  title: string;
  createdAt: Date;
  authorUsername: string;
  statistics: {
    views: number;
    copies: number;
    totalCred: number;
    averageFavor: number;
  };
}

interface Props {
  topic: Topic;
  rationales: Rationale[];
}

export function TopicEmbedClient({ topic, rationales }: Props) {
  const [selectedRationale, setSelectedRationale] = useState<Rationale | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Send height once after mount, that's it
    const timer = setTimeout(() => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({
        source: 'negation-game-embed',
        type: 'resize',
        height: Math.min(height, 600) // Cap at 600px
      }, '*');
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Recalculate height when expanded state changes
    if (isExpanded || selectedRationale) {
      const timer = setTimeout(() => {
        const height = document.documentElement.scrollHeight;
        window.parent.postMessage({
          source: 'negation-game-embed',
          type: 'resize',
          height: Math.min(height, 1200) // Allow more height for full rationale embed
        }, '*');
      }, 300); // Longer delay to account for iframe loading
      return () => clearTimeout(timer);
    }
  }, [isExpanded, selectedRationale]);

  useEffect(() => {
    // Listen for messages from embedded rationale iframes
    const handleMessage = (event: MessageEvent) => {
      if (event.data.source === 'negation-game-rationale') {
        const embeddedHeight = event.data.height;
        console.log('Received height from rationale:', embeddedHeight);
        
        // Update the iframe height first
        const iframe = document.querySelector('iframe[title*="Rationale:"]') as HTMLIFrameElement;
        if (iframe) {
          iframe.style.height = `${embeddedHeight}px`;
          console.log('Updated iframe height to:', embeddedHeight);
        }
        
        // Then calculate and send total container height
        setTimeout(() => {
          const totalHeight = document.documentElement.scrollHeight;
          console.log('Sending total height to parent:', totalHeight);
          window.parent.postMessage({
            source: 'negation-game-embed',
            type: 'resize',
            height: Math.min(totalHeight, 1500) // Increased limit for larger content
          }, '*');
        }, 200); // Longer delay to ensure DOM updates
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Always use relative URLs to avoid hydration mismatch
  const getFullUrl = (path: string) => path;

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    window.parent.postMessage({
      source: 'negation-game-embed',
      type: 'navigate',
      url
    }, '*');
  };

  const handleViewRationale = (rationale: Rationale, e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedRationale(rationale);
    setIsExpanded(true);
  };

  const handleCloseRationale = () => {
    setSelectedRationale(null);
    setIsExpanded(false);
  };

  const containerStyle = {
    padding: '20px',
    maxWidth: '600px',
    margin: '0 auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    lineHeight: '1.5'
  };

  if (rationales.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={{ 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px', 
          padding: '24px', 
          textAlign: 'center',
          backgroundColor: '#f9fafb'
        }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>📄</div>
          <h2 style={{ margin: '0 0 12px', fontSize: '18px', color: '#111827' }}>
            No Rationales Yet
          </h2>
          <p style={{ margin: '0 0 20px', color: '#6b7280' }}>
            No one has created a rationale for this topic yet.
          </p>
          <a 
            href={getFullUrl(`/s/${topic.space}/topic/${encodeId(topic.id)}`)}
            onClick={(e) => handleLinkClick(e, `/s/${topic.space}/topic/${encodeId(topic.id)}`)}
            style={{
              display: 'block',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontSize: '14px',
              textDecoration: 'none',
              textAlign: 'center',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            Create First Rationale
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ margin: '0', fontSize: '18px', color: '#111827' }}>
          📄 Rationales Available
        </h2>
        <span style={{ fontSize: '14px', color: '#6b7280' }}>
          {rationales.length} rationale{rationales.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <a 
          href={getFullUrl(`/s/${topic.space}/topic/${encodeId(topic.id)}`)}
          onClick={(e) => handleLinkClick(e, `/s/${topic.space}/topic/${encodeId(topic.id)}`)}
          style={{
            display: 'block',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '14px',
            textDecoration: 'none',
            textAlign: 'center',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          Explore Topic & Add Rationale
        </a>
      </div>

      <div style={{ marginBottom: '16px' }}>
        {rationales.slice(0, 3).map((rationale) => (
          <div key={rationale.id} style={{ 
            border: '1px solid #e5e7eb', 
            borderRadius: '6px', 
            padding: '16px',
            marginBottom: '8px',
            backgroundColor: '#ffffff'
          }}>
            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ 
                  margin: '0 0 8px', 
                  fontSize: '14px', 
                  fontWeight: '500',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {rationale.title}
                </h3>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  by {rationale.authorUsername} • {rationale.statistics.views} views
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                <button
                  onClick={(e) => handleViewRationale(rationale, e)}
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  Explore
                </button>
                <a 
                  href={getFullUrl(`/s/${topic.space}/rationale/${rationale.id}`)}
                  onClick={(e) => handleLinkClick(e, `/s/${topic.space}/rationale/${rationale.id}`)}
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    textDecoration: 'none'
                  }}
                >
                  View Full
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rationales.length > 3 && (
        <div style={{ 
          textAlign: 'center',
          marginBottom: '16px'
        }}>
          <a 
            href={getFullUrl(`/s/${topic.space}/topic/${encodeId(topic.id)}`)}
            onClick={(e) => handleLinkClick(e, `/s/${topic.space}/topic/${encodeId(topic.id)}`)}
            style={{
              display: 'inline-block',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '14px',
              textDecoration: 'none'
            }}
          >
            View All {rationales.length} Rationales
          </a>
        </div>
      )}


      {/* Expanded Rationale View - Full Page Embed */}
      {selectedRationale && isExpanded && (
        <div style={{
          marginTop: '24px',
          border: '2px solid #3b82f6',
          borderRadius: '12px',
          backgroundColor: '#ffffff',
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: '0', fontSize: '15px', fontWeight: '600' }}>
              📄 {selectedRationale.title}
            </h3>
            <button
              onClick={handleCloseRationale}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              ✕ Close
            </button>
          </div>
          
          {/* Action buttons moved to top */}
          <div style={{
            backgroundColor: '#f8fafc',
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            gap: '8px',
            justifyContent: 'center'
          }}>
            <a
              href={getFullUrl(`/s/${topic.space}/rationale/${selectedRationale.id}`)}
              onClick={(e) => handleLinkClick(e, `/s/${topic.space}/rationale/${selectedRationale.id}`)}
              style={{
                display: 'inline-block',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '5px',
                fontSize: '13px',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              Open Full Page
            </a>
            <a
              href={getFullUrl(`/s/${topic.space}/topic/${encodeId(topic.id)}`)}
              onClick={(e) => handleLinkClick(e, `/s/${topic.space}/topic/${encodeId(topic.id)}`)}
              style={{
                display: 'inline-block',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #cbd5e1',
                padding: '8px 16px',
                borderRadius: '5px',
                fontSize: '13px',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              Browse Topic
            </a>
          </div>

          {/* Embedded Rationale Page in Mobile Mode */}
          <div style={{ position: 'relative', minHeight: '400px' }}>
            <iframe
              src={getFullUrl(`/s/${topic.space}/rationale/${selectedRationale.id}?embed=mobile`)}
              style={{
                width: '100%',
                height: '600px', // Start smaller, will be dynamically resized
                border: 'none',
                backgroundColor: 'white'
              }}
              title={`Rationale: ${selectedRationale.title}`}
              onLoad={(e) => {
                console.log('Rationale iframe loaded, waiting for height messages...');
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}