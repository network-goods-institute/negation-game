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
  const [selectedRationaleId, setSelectedRationaleId] = useState<string | null>(null);
  const [isRationaleLoading, setIsRationaleLoading] = useState<boolean>(false);
  const [spinnerRotation, setSpinnerRotation] = useState<number>(0);
  const [postNumber, setPostNumber] = useState<number>(1);

  useEffect(() => {
    // Try to get post number from URL parameters or parent frame
    const urlParams = new URLSearchParams(window.location.search);
    const postParam = urlParams.get('post');
    if (postParam) {
      setPostNumber(parseInt(postParam) || 1);
    }

    // Alternative: listen for post number from parent frame
    const handlePostNumber = (event: MessageEvent) => {
      if (event.data?.type === 'post-number' && typeof event.data.postNumber === 'number') {
        setPostNumber(event.data.postNumber);
      }
    };

    window.addEventListener('message', handlePostNumber);
    return () => window.removeEventListener('message', handlePostNumber);
  }, []);

  useEffect(() => {
    const sendHeight = () => {
      const height = document.documentElement.scrollHeight;
      const finalHeight = selectedRationaleId ? height : height;
      window.parent.postMessage({
        source: 'negation-game-embed',
        type: 'resize',
        height: finalHeight
      }, '*');
    };

    // Send immediately and after a delay to ensure proper measurement
    sendHeight();
    const timer = setTimeout(sendHeight, 500);

    return () => clearTimeout(timer);
  }, [selectedRationaleId, isRationaleLoading]);

  // Spinner animation
  useEffect(() => {
    let animationFrame: number;
    if (isRationaleLoading) {
      const animate = () => {
        setSpinnerRotation(prev => (prev + 8) % 360);
        animationFrame = requestAnimationFrame(animate);
      };
      animationFrame = requestAnimationFrame(animate);
    }
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isRationaleLoading]);

  // Always use relative URLs to avoid hydration mismatch
  const getFullUrl = (path: string) => path;

  const handleLinkClick = (e: React.MouseEvent, url: string) => {
    e.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleViewRationale = (rationale: Rationale, e: React.MouseEvent) => {
    e.preventDefault();
    setIsRationaleLoading(true);
    setSelectedRationaleId(rationale.id);
  };

  const handleBackToList = () => {
    setIsRationaleLoading(true);
    setTimeout(() => {
      setSelectedRationaleId(null);
      setIsRationaleLoading(false);
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

  // Only show topic list embed on post 1 (first post in frame)
  if (postNumber !== 1 && !selectedRationaleId) {
    return (
      <div style={containerStyle}>
        <div style={{
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '12px',
          textAlign: 'center',
          backgroundColor: '#f8f8f8',
          fontSize: '12px',
          color: '#666'
        }}>
          Topic embeds only available on the first post
        </div>
      </div>
    );
  }

  // If a rationale is selected, show the inline preview  
  if (selectedRationaleId) {
    return (
      <div style={containerStyle}>
        <div style={{ marginBottom: '12px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
          <button
            onClick={handleBackToList}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #ddd',
              padding: '4px 8px',
              borderRadius: '3px',
              fontSize: '12px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: '#666'
            }}
          >
            ← Back to {topic.name}
          </button>
        </div>

        {/* Loading state */}
        {isRationaleLoading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: '#f9f9f9',
            marginBottom: '8px'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid #ddd',
              borderTop: '2px solid #0088cc',
              borderRadius: '50%',
              transform: `rotate(${spinnerRotation}deg)`,
              transition: 'transform 0.1s linear'
            }} />
            <span style={{ marginLeft: '8px', fontSize: '13px', color: '#666' }}>
              Loading rationale...
            </span>
          </div>
        )}

        <iframe
          src={`/embed/rationale/${selectedRationaleId}`}
          style={{
            width: '100%',
            height: isRationaleLoading ? '0px' : '450px',
            border: 'none',
            borderRadius: '4px',
            display: isRationaleLoading ? 'none' : 'block'
          }}
          title="Rationale Preview"
          onLoad={(e) => {
            setIsRationaleLoading(false);

            const handleNestedHeight = (event: MessageEvent) => {
              if (event.data?.source === 'negation-game-embed' && event.data?.type === 'resize') {
                const iframe = e.target as HTMLIFrameElement;
                iframe.style.height = `${event.data.height}px`;

                setTimeout(() => {
                  const totalHeight = document.documentElement.scrollHeight;
                  window.parent.postMessage({
                    source: 'negation-game-embed',
                    type: 'resize',
                    height: totalHeight + 20
                  }, '*');
                }, 100);
              }
            };

            window.addEventListener('message', handleNestedHeight);
            return () => window.removeEventListener('message', handleNestedHeight);
          }}
        />
      </div>
    );
  }

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
        <div style={{ fontSize: '12px', color: '#888', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{rationales.length} rationale{rationales.length !== 1 ? 's' : ''}</span>
          <span style={{ color: '#bbb', fontSize: '10px' }}>via Negation Game</span>
        </div>
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
        {rationales.slice(0, 6).map((rationale) => (
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
                  by {rationale.authorUsername} • {rationale.statistics.views} views • {rationale.statistics.copies} copies • {rationale.statistics.totalCred} cred • {rationale.statistics.averageFavor.toFixed(0)} favor
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
                  href={`/s/${topic.space}/rationale/${rationale.id}`}
                  target="_blank"
                  rel="noopener,noreferrer"
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

      {rationales.length > 6 && (
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


    </div>
  );
}