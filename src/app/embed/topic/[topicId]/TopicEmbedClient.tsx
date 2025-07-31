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
      const postNum = parseInt(postParam);
      if (!isNaN(postNum) && postNum > 0 && postNum <= 10000) {
        setPostNumber(postNum);
      } else {
        setPostNumber(1);
      }
    }

    // Alternative: listen for post number from parent frame
    const handlePostNumber = (event: MessageEvent) => {
      if (event.data?.type === 'post-number' && typeof event.data.postNumber === 'number') {
        const postNum = event.data.postNumber;
        if (!isNaN(postNum) && postNum > 0 && postNum <= 10000) {
          setPostNumber(postNum);
        }
      }
    };

    window.addEventListener('message', handlePostNumber);
    return () => window.removeEventListener('message', handlePostNumber);
  }, []);


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
    setSelectedRationaleId(null);
  };


  const containerStyle = {
    padding: '12px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
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

        {/* Fixed-height wrapper so the embed is ALWAYS 460px tall */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '460px'
          }}
          aria-busy={isRationaleLoading}
        >
          <iframe
            src={`/embed/rationale/${selectedRationaleId}`}
            scrolling="no"
            title="Rationale Preview"
            onLoad={() => setIsRationaleLoading(false)}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '4px',
              display: 'block',
              overflow: 'hidden'
            }}
          />

          {/* Loading overlay does NOT add heigh i think */}
          {isRationaleLoading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(249, 249, 249, 0.9)',
                borderRadius: '4px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid #ddd',
                    borderTop: '2px solid #0088cc',
                    borderRadius: '50%',
                    transform: `rotate(${spinnerRotation}deg)`,
                    marginRight: '8px'
                  }}
                />
                <span style={{ fontSize: '13px', color: '#666' }}>Loading rationale...</span>
              </div>
            </div>
          )}
        </div>
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
            No rationale link found in post.
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
            Create one
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
        <h3 style={{ margin: '0', fontSize: '15px', color: '#333', fontWeight: '600' }}>
          Negation Game × Scroll
        </h3>
        <div style={{ fontSize: '14px', fontWeight: '600', color: '#111' }}>
          {topic.name}
        </div>
        <div style={{ fontSize: '12px', color: '#888', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{rationales.length} rationale{rationales.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div style={{ marginBottom: '8px', textAlign: 'center', padding: '12px 16px' }}>
        <p style={{ margin: '0 0 12px', color: '#666', fontSize: '14px', fontWeight: '500' }}>
          No rationale link found in post.
        </p>
        <a
          href={getFullUrl(`/s/${topic.space}/topic/${encodeId(topic.id)}`)}
          onClick={(e) => handleLinkClick(e, `/s/${topic.space}/topic/${encodeId(topic.id)}`)}
          style={{
            display: 'inline-block',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            fontSize: '14px',
            textDecoration: 'none',
            fontWeight: '600',
            boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#059669';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.4)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#10b981';
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.3)';
          }}
        >
          Create one
        </a>
      </div>

      {rationales.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#333', marginBottom: '8px' }}>
            Existing rationales:
          </div>
          {rationales.slice(0, 3).map((rationale) => (
            <div key={rationale.id} style={{
              border: '1px solid #ddd',
              borderRadius: '3px',
              padding: '8px',
              marginBottom: '4px',
              backgroundColor: '#fafafa'
            }}>
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{
                    margin: '0 0 2px',
                    fontSize: '12px',
                    fontWeight: '500',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: '#333'
                  }}>
                    {rationale.title}
                  </h4>
                  <div style={{ fontSize: '10px', color: '#888' }}>
                    by {rationale.authorUsername} • {rationale.statistics.views} views • {rationale.statistics.copies} copies
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                  <button
                    onClick={(e) => handleViewRationale(rationale, e)}
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#0088cc',
                      color: 'white',
                      border: 'none',
                      padding: '3px 6px',
                      borderRadius: '2px',
                      fontSize: '10px',
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
                      padding: '3px 6px',
                      borderRadius: '2px',
                      fontSize: '10px',
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

          {rationales.length > 3 && (
            <div style={{
              border: '1px solid #ddd',
              borderRadius: '3px',
              padding: '12px',
              marginBottom: '6px',
              backgroundColor: '#fafafa',
              textAlign: 'center'
            }}>
              <a
                href={getFullUrl(`/s/${topic.space}/topic/${encodeId(topic.id)}`)}
                onClick={(e) => handleLinkClick(e, `/s/${topic.space}/topic/${encodeId(topic.id)}`)}
                style={{
                  color: '#0088cc',
                  fontSize: '13px',
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
              >
                See all {rationales.length} rationales →
              </a>
            </div>
          )}
        </div>
      )}

    </div>
  );
}