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
    padding: '6px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '11px',
    lineHeight: '1.2',
    color: '#1a202c',
    backgroundColor: '#ffffff',
    borderRadius: '4px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    height: '420px',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden'
  };

  // Only show topic list embed on post 1 (first post in frame)
  if (postNumber !== 1 && !selectedRationaleId) {
    return (
      <div style={containerStyle}>
        <div style={{
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
          padding: '8px',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          fontSize: '9px',
          color: '#64748b'
        }}>
          Topic embeds only available on the first post
        </div>
      </div>
    );
  }

  // If a rationale is selected, show the inline preview
  if (selectedRationaleId) {
    return (
      <div style={{...containerStyle}}>
        <div style={{ marginBottom: '4px', borderBottom: '1px solid #e5e7eb', paddingBottom: '3px', flex: '0 0 auto' }}>
          <button
            onClick={handleBackToList}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #d1d5db',
              padding: '4px 8px',
              borderRadius: '3px',
              fontSize: '10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: '#4b5563',
              transition: 'all 0.2s ease',
              fontWeight: '500'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.borderColor = '#9ca3af';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          >
            ← Back to {topic.name}
          </button>
        </div>

        {/* Flexible wrapper that fills remaining space */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            flex: '1 1 auto',
            minHeight: '250px',
            overflow: 'hidden'
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
              borderRadius: '8px',
              display: 'block',
              overflow: 'hidden'
            }}
          />

          {/* Loading overlay */}
          {isRationaleLoading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(248, 250, 252, 0.95)',
                borderRadius: '8px',
                backdropFilter: 'blur(2px)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    border: '3px solid #e2e8f0',
                    borderTop: '3px solid #3b82f6',
                    borderRadius: '50%',
                    transform: `rotate(${spinnerRotation}deg)`
                  }}
                />
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Loading rationale...</span>
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
          border: '1px solid #e2e8f0',
          borderRadius: '4px',
          padding: '8px',
          textAlign: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ fontSize: '14px', marginBottom: '4px', opacity: 0.6 }}>🔍</div>
          <h3 style={{ margin: '0 0 4px', fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>
            Negation Game × Scroll
          </h3>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
            {topic.name}
          </div>
          <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: '11px' }}>
            Create argument
          </p>
          <a
            href={getFullUrl(`/s/${topic.space}/topic/${encodeId(topic.id)}`)}
            onClick={(e) => handleLinkClick(e, `/s/${topic.space}/topic/${encodeId(topic.id)}`)}
            style={{
              display: 'inline-block',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '11px',
              textDecoration: 'none',
              fontWeight: '500',
              boxShadow: '0 1px 2px rgba(59, 130, 246, 0.2)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(59, 130, 246, 0.2)';
            }}
          >
            Create Rationale
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', borderBottom: '1px solid #e5e7eb', paddingBottom: '2px' }}>
        <h3 style={{ margin: '0', fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>
          Negation Game × Scroll
        </h3>
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#334155' }}>
          {topic.name}
        </div>
        <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '8px' }}>
          <span>{rationales.length} rationale{rationales.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div style={{ marginBottom: '4px', textAlign: 'center', padding: '4px', background: '#f8fafc', borderRadius: '3px', border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '16px', marginBottom: '6px', opacity: 0.6 }}>💭</div>
        <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: '11px', fontWeight: '500' }}>
          No rationale link found in post.
        </p>
        <a
          href={getFullUrl(`/s/${topic.space}/topic/${encodeId(topic.id)}`)}
          onClick={(e) => handleLinkClick(e, `/s/${topic.space}/topic/${encodeId(topic.id)}`)}
          style={{
            display: 'inline-block',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '11px',
            textDecoration: 'none',
            fontWeight: '500',
            boxShadow: '0 1px 2px rgba(59, 130, 246, 0.2)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#2563eb';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(59, 130, 246, 0.2)';
          }}
        >
          Create Rationale
        </a>
      </div>

      {rationales.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '12px', letterSpacing: '-0.025em' }}>
            Existing rationales:
          </div>
          {rationales.slice(0, 3).map((rationale) => (
            <div key={rationale.id} style={{
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '8px',
              marginBottom: '6px',
              backgroundColor: '#ffffff',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
              e.currentTarget.style.transform = 'translateY(0px)';
            }}>
              <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600', marginBottom: '2px' }}>
                    {rationale.authorUsername}
                  </div>
                  <h4 style={{
                    margin: '0 0 2px',
                    fontSize: '11px',
                    fontWeight: '500',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: '#1e293b'
                  }}>
                    {rationale.title}
                  </h4>
                  <div style={{ fontSize: '9px', color: '#64748b' }}>
                    {rationale.statistics.views} views • {rationale.statistics.copies} copies
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                  <button
                    onClick={(e) => handleViewRationale(rationale, e)}
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
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
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      fontSize: '10px',
                      textDecoration: 'none',
                      fontFamily: 'inherit',
                      fontWeight: '500',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#e2e8f0';
                      e.currentTarget.style.borderColor = '#94a3b8';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                      e.currentTarget.style.borderColor = '#cbd5e1';
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