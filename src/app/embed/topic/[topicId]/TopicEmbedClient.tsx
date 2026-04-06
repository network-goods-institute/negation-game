'use client';

import { useEffect, useRef, useState } from 'react';
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
  preferredRationaleId?: string | null;
}

export function TopicEmbedClient({ topic, rationales, preferredRationaleId }: Props) {
  const [selectedRationaleId, setSelectedRationaleId] = useState<string | null>(null);
  const [isRationaleLoading, setIsRationaleLoading] = useState<boolean>(false);
  const [spinnerRotation, setSpinnerRotation] = useState<number>(0);
  const [postNumber, setPostNumber] = useState<number>(1);
  const hasAutoSelected = useRef(false);

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

  useEffect(() => {
    if (!hasAutoSelected.current && preferredRationaleId) {
      hasAutoSelected.current = true;
      setIsRationaleLoading(true);
      setSelectedRationaleId(preferredRationaleId);
    }
  }, [preferredRationaleId]);


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
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleViewRationale = (rationale: Rationale, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    color: '#3A3835',
    backgroundColor: '#FDF9F2',
    borderRadius: '4px',
    border: '1px solid #EAE8E5',
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
          border: '1px solid #EAE8E5',
          borderRadius: '4px',
          padding: '8px',
          textAlign: 'center',
          backgroundColor: '#FBF4EA',
          fontSize: '9px',
          color: '#6B6A68'
        }}>
          <div style={{ marginBottom: '6px' }}>Topic embeds only available on the first post</div>
          <a
            href={getFullUrl(`/s/${topic.space}/topic/${encodeId(topic.id)}`)}
            onClick={(e) => handleLinkClick(e, `/s/${topic.space}/topic/${encodeId(topic.id)}`)}
            style={{
              display: 'inline-block',
              backgroundColor: '#ED7153',
              color: '#FFFFFF',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '3px',
              fontSize: '11px',
              textDecoration: 'none',
              fontWeight: '500',
              boxShadow: '0 1px 2px rgba(237, 113, 83, 0.2)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#D85F43';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(237, 113, 83, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#ED7153';
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(237, 113, 83, 0.2)';
            }}
          >
            Open Topic
          </a>
        </div>
      </div>
    );
  }

  // If a rationale is selected, show the inline preview
  if (selectedRationaleId) {
    return (
      <div style={{ ...containerStyle }}>
        <div style={{ marginBottom: 0, paddingBottom: 0, borderBottom: '1px solid #EAE8E5', flex: '0 0 auto' }}>
          <button
            onClick={handleBackToList}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #D7D4CF',
              padding: '4px 8px',
              borderRadius: '3px',
              fontSize: '10px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: '#3A3835',
              transition: 'all 0.2s ease',
              fontWeight: '500'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#EAE8E5';
              e.currentTarget.style.borderColor = '#BDB9B3';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = '#D7D4CF';
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
              borderRadius: '4px',
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
                backgroundColor: 'rgba(253, 249, 242, 0.95)',
                borderRadius: '4px',
                backdropFilter: 'blur(2px)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', gap: '12px' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    border: '3px solid #EAE8E5',
                    borderTop: '3px solid #ED7153',
                    borderRadius: '50%',
                    transform: `rotate(${spinnerRotation}deg)`
                  }}
                />
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Loading rationale...</span>
              </div>
            </div>
          )}
        </div>

        {/* back button moved above card */}
      </div>
    );
  }

  if (rationales.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={{
          border: '1px solid #EAE8E5',
          borderRadius: '4px',
          padding: '12px',
          textAlign: 'center',
          backgroundColor: '#FBF4EA'
        }}>
          <div style={{ fontSize: '16px', marginBottom: '6px', opacity: 0.7 }}>🔍</div>
          <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#1e293b', fontWeight: '700', letterSpacing: '-0.015em' }}>
            No rationales yet
          </h3>
          <div style={{ fontSize: '13px', color: '#334155', marginBottom: '10px', fontWeight: 600 }}>
            {topic.name}
          </div>
          <p style={{ margin: '0 0 14px', color: '#475569', fontSize: '12px', lineHeight: 1.4 }}>
            Create the first rationale to map arguments and help the Scroll community decide faster.
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <a
              href={getFullUrl(`/s/${topic.space}/rationale/new?topicId=${encodeId(topic.id)}`)}
              onClick={(e) => handleLinkClick(e, `/s/${topic.space}/rationale/new?topicId=${encodeId(topic.id)}`)}
              style={{
                display: 'inline-block',
                backgroundColor: '#ED7153',
                color: '#FFFFFF',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '5px',
                fontSize: '12px',
                textDecoration: 'none',
                fontWeight: '700',
                boxShadow: '0 2px 6px rgba(237, 113, 83, 0.25)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#D85F43';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 10px rgba(237, 113, 83, 0.35)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#ED7153';
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(237, 113, 83, 0.25)';
              }}
            >
              Create Rationale
            </a>
            <a
              href={getFullUrl(`/s/${topic.space}/topic/${encodeId(topic.id)}`)}
              onClick={(e) => handleLinkClick(e, `/s/${topic.space}/topic/${encodeId(topic.id)}`)}
              style={{
                display: 'inline-block',
                backgroundColor: '#EAE8E5',
                color: '#3A3835',
                border: '1px solid #D7D4CF',
                padding: '8px 14px',
                borderRadius: '5px',
                fontSize: '12px',
                textDecoration: 'none',
                fontWeight: '700',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#E2DFDA';
                e.currentTarget.style.borderColor = '#BDB9B3';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#EAE8E5';
                e.currentTarget.style.borderColor = '#D7D4CF';
              }}
            >
              Learn More
            </a>
          </div>
        </div>
      </div>
    );
  }

  let displayRationales = rationales;
  if (preferredRationaleId && rationales.length > 0) {
    const idx = rationales.findIndex(r => r.id === preferredRationaleId);
    if (idx > -1) {
      const picked = rationales[idx];
      const rest = rationales.filter((_, i) => i !== idx);
      displayRationales = [picked, ...rest];
    }
  }

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', borderBottom: '1px solid #EAE8E5', paddingBottom: '2px' }}>
        <h3 style={{ margin: '0', fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>
          Negation Game × Scroll
        </h3>
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#3A3835' }}>
          {topic.name}
        </div>
        <div style={{ fontSize: '10px', color: '#3A3835', display: 'flex', alignItems: 'center', gap: '4px', background: '#EAE8E5', padding: '2px 6px', borderRadius: '6px' }}>
          <span>{rationales.length} rationale{rationales.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {!preferredRationaleId && (
        <div style={{ marginBottom: '4px', textAlign: 'center', padding: '4px', background: '#FBF4EA', borderRadius: '3px', border: '1px solid #EAE8E5' }}>
          <div style={{ fontSize: '16px', marginBottom: '6px', opacity: 0.6 }}>💭</div>
          <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: '11px', fontWeight: '500' }}>
            No rationale link found in post.
          </p>
          <a
            href={getFullUrl(`/s/${topic.space}/topic/${encodeId(topic.id)}`)}
            onClick={(e) => handleLinkClick(e, `/s/${topic.space}/topic/${encodeId(topic.id)}`)}
            style={{
              display: 'inline-block',
              backgroundColor: '#ED7153',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '3px',
              fontSize: '11px',
              textDecoration: 'none',
              fontWeight: '500',
              boxShadow: '0 1px 2px rgba(237, 113, 83, 0.2)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#D85F43';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(237, 113, 83, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#ED7153';
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = '0 1px 2px rgba(237, 113, 83, 0.2)';
            }}
          >
            Create Rationale
          </a>
        </div>)}

      {rationales.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '12px', letterSpacing: '-0.025em' }}>
            Existing rationales:
          </div>
          {displayRationales.slice(0, 3).map((rationale) => {
            const isPreferred = preferredRationaleId === rationale.id;
            return (
              <div key={rationale.id} style={{
                border: isPreferred ? '2px solid #ED7153' : '1px solid #EAE8E5',
                borderRadius: '4px',
                padding: '8px',
                marginBottom: '6px',
                backgroundColor: isPreferred ? '#FFEAE3' : '#FFFFFF',
                boxShadow: isPreferred ? '0 0 0 2px rgba(237, 113, 83, 0.18), 0 4px 10px rgba(0, 0, 0, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                position: 'relative'
              }}
                onClick={(e) => handleViewRationale(rationale, e)}
                onMouseOver={(e) => {
                  if (!isPreferred) {
                    e.currentTarget.style.borderColor = '#D7D4CF';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.1)';
                  } else {
                    e.currentTarget.style.borderColor = '#ED7153';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(237, 113, 83, 0.22), 0 6px 12px rgba(0, 0, 0, 0.12)';
                  }
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  if (!isPreferred) {
                    e.currentTarget.style.borderColor = '#EAE8E5';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                  } else {
                    e.currentTarget.style.borderColor = '#ED7153';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(237, 113, 83, 0.18), 0 4px 10px rgba(0, 0, 0, 0.08)';
                  }
                  e.currentTarget.style.transform = 'translateY(0px)';
                }}>
                {isPreferred && (
                  <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '3px', backgroundColor: '#ED7153', borderTopLeftRadius: '4px', borderBottomLeftRadius: '4px' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: '#ED7153', fontWeight: '600', marginBottom: '2px' }}>
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
                        backgroundColor: '#ED7153',
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
                        e.currentTarget.style.backgroundColor = '#D85F43';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#ED7153';
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
                        backgroundColor: '#EAE8E5',
                        color: '#3A3835',
                        border: '1px solid #D7D4CF',
                        padding: '4px 8px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        textDecoration: 'none',
                        fontFamily: 'inherit',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={(e) => handleLinkClick(e, `/s/${topic.space}/rationale/${rationale.id}`)}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#E2DFDA';
                        e.currentTarget.style.borderColor = '#BDB9B3';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#EAE8E5';
                        e.currentTarget.style.borderColor = '#D7D4CF';
                      }}
                    >
                      Open
                    </a>
                  </div>
                </div>
              </div>
            )
          })}

          {rationales.length > 3 && (
            <div style={{
              border: '1px solid #EAE8E5',
              borderRadius: '3px',
              padding: '12px',
              marginBottom: '6px',
              backgroundColor: '#FBF4EA',
              textAlign: 'center'
            }}>
              <a
                href={getFullUrl(`/s/${topic.space}/topic/${encodeId(topic.id)}`)}
                onClick={(e) => handleLinkClick(e, `/s/${topic.space}/topic/${encodeId(topic.id)}`)}
                style={{
                  color: '#ED7153',
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