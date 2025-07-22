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

    setTimeout(() => {
      const height = Math.min(document.documentElement.scrollHeight, 600);
      window.parent.postMessage({
        source: 'negation-game-embed',
        type: 'resize',
        height
      }, '*');
    }, 300);
  };

  const containerStyle = {
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    lineHeight: '1.4',
    color: '#222',
    backgroundColor: '#fff'
  };

  if (rationales.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={{
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '16px',
          textAlign: 'center',
          backgroundColor: '#f8f8f8'
        }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#333', fontWeight: '600' }}>
            Negation Game × Scroll
          </h3>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#111', marginBottom: '8px' }}>
            {topic.name}
          </div>
          <p style={{ margin: '0 0 16px', color: '#666', fontSize: '13px' }}>
            No rationales available for this topic yet.
          </p>
          <a
            href={getFullUrl(`/s/${topic.space}/topic/${encodeId(topic.id)}`)}
            onClick={(e) => handleLinkClick(e, `/s/${topic.space}/topic/${encodeId(topic.id)}`)}
            style={{
              display: 'inline-block',
              backgroundColor: '#0088cc',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '3px',
              fontSize: '13px',
              textDecoration: 'none',
              fontWeight: '500'
            }}
          >
            Add Rationale
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
        <h3 style={{ margin: '0', fontSize: '15px', color: '#333', fontWeight: '600' }}>
          Rationales
        </h3>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#111' }}>
          {topic.name}
        </div>
        <span style={{ fontSize: '12px', color: '#888' }}>
          {rationales.length} rationale{rationales.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <a
          href={getFullUrl(`/s/${topic.space}/topic/${encodeId(topic.id)}`)}
          onClick={(e) => handleLinkClick(e, `/s/${topic.space}/topic/${encodeId(topic.id)}`)}
          style={{
            display: 'inline-block',
            backgroundColor: '#0088cc',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '3px',
            fontSize: '12px',
            textDecoration: 'none',
            fontWeight: '500'
          }}
        >
          Add Rationale
        </a>
      </div>

      <div style={{ marginBottom: '12px' }}>
        {rationales.slice(0, 3).map((rationale) => (
          <div key={rationale.id} style={{
            border: '1px solid #ddd',
            borderRadius: '3px',
            padding: '12px',
            marginBottom: '6px',
            backgroundColor: '#fafafa'
          }}>
            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{
                  margin: '0 0 4px',
                  fontSize: '13px',
                  fontWeight: '500',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: '#333'
                }}>
                  {rationale.title}
                </h4>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  by {rationale.authorUsername} • {rationale.statistics.views} views
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
                <button
                  onClick={(e) => handleViewRationale(rationale, e)}
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#0088cc',
                    color: 'white',
                    border: 'none',
                    padding: '4px 8px',
                    borderRadius: '2px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  View
                </button>
                <a
                  href={getFullUrl(`/s/${topic.space}/rationale/${rationale.id}`)}
                  onClick={(e) => handleLinkClick(e, `/s/${topic.space}/rationale/${rationale.id}`)}
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#f0f0f0',
                    color: '#555',
                    border: '1px solid #ccc',
                    padding: '4px 8px',
                    borderRadius: '2px',
                    fontSize: '11px',
                    textDecoration: 'none',
                    fontFamily: 'inherit'
                  }}
                >
                  Open
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {rationales.length > 3 && (
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <a
            href={getFullUrl(`/s/${topic.space}/topic/${encodeId(topic.id)}`)}
            onClick={(e) => handleLinkClick(e, `/s/${topic.space}/topic/${encodeId(topic.id)}`)}
            style={{
              color: '#0088cc',
              fontSize: '12px',
              textDecoration: 'none'
            }}
          >
            View all {rationales.length} rationales →
          </a>
        </div>
      )}


      {selectedRationale && isExpanded && (
        <div style={{
          marginTop: '12px',
          border: '1px solid #ddd',
          borderRadius: '3px',
          backgroundColor: '#fff',
          overflow: 'hidden'
        }}>
          <div style={{
            backgroundColor: '#f8f8f8',
            padding: '8px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #eee'
          }}>
            <h4 style={{ margin: '0', fontSize: '13px', fontWeight: '500', color: '#333' }}>
              {selectedRationale.title}
            </h4>
            <button
              onClick={handleCloseRationale}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#666',
                padding: '2px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
          </div>

          <div style={{
            backgroundColor: '#fafafa',
            padding: '8px 12px',
            borderBottom: '1px solid #eee',
            display: 'flex',
            gap: '8px'
          }}>
            <a
              href={getFullUrl(`/s/${topic.space}/rationale/${selectedRationale.id}`)}
              onClick={(e) => handleLinkClick(e, `/s/${topic.space}/rationale/${selectedRationale.id}`)}
              style={{
                display: 'inline-block',
                backgroundColor: '#0088cc',
                color: 'white',
                border: 'none',
                padding: '4px 8px',
                borderRadius: '2px',
                fontSize: '11px',
                textDecoration: 'none',
                fontWeight: '500'
              }}
            >
              Open Full
            </a>
            <a
              href={getFullUrl(`/s/${topic.space}/topic/${encodeId(topic.id)}`)}
              onClick={(e) => handleLinkClick(e, `/s/${topic.space}/topic/${encodeId(topic.id)}`)}
              style={{
                display: 'inline-block',
                backgroundColor: '#f0f0f0',
                color: '#555',
                border: '1px solid #ccc',
                padding: '4px 8px',
                borderRadius: '2px',
                fontSize: '11px',
                textDecoration: 'none'
              }}
            >
              Browse Topic
            </a>
          </div>

          <div style={{ position: 'relative', minHeight: '200px' }}>
            <div
              id={`loading-${selectedRationale.id}`}
              style={{
                position: 'absolute',
                top: '0',
                left: '0',
                right: '0',
                bottom: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f8fafc',
                color: '#64748b',
                fontSize: '13px'
              }}
            >
              Loading rationale...
            </div>
            <iframe
              src={getFullUrl(`/s/scroll/rationale/${selectedRationale.id}?embed=mobile`)}
              style={{
                width: '100%',
                height: '400px',
                border: 'none',
                backgroundColor: 'white',
                opacity: '0',
                transition: 'opacity 0.3s ease'
              }}
              title={`Rationale: ${selectedRationale.title}`}
              onLoad={(e) => {
                console.log('Rationale iframe loaded, waiting for height messages...');
                const iframe = e.target as HTMLIFrameElement;
                const loadingDiv = document.getElementById(`loading-${selectedRationale.id}`);
                if (loadingDiv) {
                  loadingDiv.style.display = 'none';
                }
                iframe.style.opacity = '1';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}