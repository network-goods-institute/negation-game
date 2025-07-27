'use client';

import React, { useEffect } from 'react';

interface RationaleStats {
  views: number;
  copies: number;
  totalCred: number;
  averageFavor: number;
  endorsements: number;
  pointsCount: number;
}

interface Rationale {
  id: string;
  title: string;
  description?: string;
  createdAt: Date;
  authorUsername: string;
  space: string | null;
  statistics: RationaleStats;
  graph?: {
    nodes: Array<{ id: string; position: { x: number; y: number } }>;
    edges: Array<any>;
  };
}

interface Props {
  rationale: Rationale;
}

export function RationaleEmbedClient({ rationale }: Props) {
  useEffect(() => {
    const sendHeight = () => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({
        source: 'negation-game-embed',
        type: 'resize',
        height: height
      }, '*');
    };

    sendHeight();
    const timer1 = setTimeout(sendHeight, 100);
    const timer2 = setTimeout(sendHeight, 500);
    const timer3 = setTimeout(sendHeight, 1000);
    const timer4 = setTimeout(sendHeight, 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);


  const containerStyle = {
    padding: '12px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
    lineHeight: '1.3',
    color: '#222',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    margin: '0'
  };

  const minimapStyle = {
    width: '100%',
    height: '280px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    marginBottom: '12px',
    position: 'relative' as const,
    overflow: 'hidden'
  };

  const renderNodes = () => {
    const nodes = rationale.graph?.nodes || [];
    if (nodes.length === 0) return null;

    const minX = Math.min(...nodes.map(n => n.position.x));
    const maxX = Math.max(...nodes.map(n => n.position.x));
    const minY = Math.min(...nodes.map(n => n.position.y));
    const maxY = Math.max(...nodes.map(n => n.position.y));

    const width = maxX - minX || 200;
    const height = maxY - minY || 100;

    return nodes.map((node, i) => {
      const x = ((node.position.x - minX) / width) * 90 + 5; // 5% margin
      const y = ((node.position.y - minY) / height) * 90 + 5; // 5% margin

      // Check if this is the statement node (usually has type 'statement' or is the first node)
      const isStatement = (node as any).type === 'statement' ||
        (node as any).data?.type === 'statement' ||
        i === 0;

      return (
        <div
          key={node.id}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: isStatement ? '60px' : '36px',
            height: isStatement ? '24px' : '24px',
            backgroundColor: isStatement ? '#16a34a' : '#3b82f6',
            borderRadius: isStatement ? '8px' : '6px',
            border: `2px solid ${isStatement ? '#15803d' : '#1e40af'}`
          }}
        />
      );
    });
  };


  return (
    <div style={containerStyle}>
      {/* MiniMap Section */}
      <div style={minimapStyle}>
        {renderNodes()}
      </div>

      {/* Content Section */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          {/* Title and Author */}
          <div style={{ marginBottom: '6px' }}>
            <h3 style={{
              margin: '0 0 3px',
              fontSize: '15px',
              fontWeight: '600',
              color: '#1e293b',
              lineHeight: '1.3'
            }}>
              {rationale.title}
            </h3>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              by {rationale.authorUsername}
            </div>
          </div>

          {/* Description */}
          {rationale.description && (
            <p style={{
              margin: '0 0 8px',
              fontSize: '12px',
              color: '#64748b',
              lineHeight: '1.4',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {rationale.description.length > 150
                ? rationale.description.substring(0, 150) + '...'
                : rationale.description
              }
            </p>
          )}

          {/* Stats Row */}
          <div style={{
            display: 'flex',
            gap: '12px',
            fontSize: '11px',
            color: '#64748b'
          }}>
            <span><strong>{Math.floor(rationale.statistics.totalCred)}</strong> cred</span>
            <span><strong>{rationale.statistics.endorsements || 0}</strong> endorsements</span>
            <span><strong>{rationale.statistics.pointsCount || 0}</strong> points</span>
            <span><strong>{rationale.statistics.copies}</strong> copies</span>
          </div>
        </div>

        {/* Open Button */}
        <a
          href={`/s/${rationale.space || 'scroll'}/rationale/${rationale.id}`}
          target="_blank"
          rel="noopener,noreferrer"
          style={{
            display: 'inline-block',
            backgroundColor: '#0088cc',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            fontFamily: 'inherit',
            textDecoration: 'none',
            transition: 'background-color 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#0066aa';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#0088cc';
          }}
        >
          Open
        </a>
      </div>
    </div>
  );
}