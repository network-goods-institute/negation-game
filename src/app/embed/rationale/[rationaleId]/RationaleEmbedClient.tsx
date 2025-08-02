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
  const [hoveredNodeId, setHoveredNodeId] = React.useState<string | null>(null);
  const [nodePreview, setNodePreview] = React.useState<{
    id: string,
    content: string,
    x: number,
    y: number,
    position: 'top' | 'bottom' | 'left' | 'right'
  } | null>(null);
  const [containerWidth, setContainerWidth] = React.useState<number>(400);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevOverscroll = html.style.overscrollBehavior;

    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';

    return () => {
      html.style.overflow = prevHtmlOverflow;
      html.style.overscrollBehavior = prevOverscroll;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);


  const calculateTooltipPosition = (nodeX: number, nodeY: number) => {
    const tooltipHeight = 40;
    const gap = 10;
    const margin = 5;

    const canFitTop = nodeY - tooltipHeight - gap > margin;
    const canFitBottom = nodeY + tooltipHeight + gap < minimapHeight - margin;
    const canFitLeft = nodeX - tooltipMaxWidth - gap > margin;
    const canFitRight = nodeX + tooltipMaxWidth + gap < containerWidth - margin;

    let position: 'top' | 'bottom' | 'left' | 'right' = 'top';

    if (canFitTop) {
      position = 'top';
    } else if (canFitBottom) {
      position = 'bottom';
    } else if (canFitRight) {
      position = 'right';
    } else if (canFitLeft) {
      position = 'left';
    }

    return {
      position,
      nodeX,
      nodeY
    };
  };

  const containerStyle = {
    padding: '10px 12px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '12px',
    lineHeight: '1.3',
    color: '#1a202c',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    margin: '0',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    height: '420px',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden'
  };

  const minimapHeight = 200;
  const tooltipMaxWidth = 150;

  const minimapStyle = {
    width: '100%',
    height: `${minimapHeight}px`,
    backgroundColor: 'rgba(31, 41, 55, 0.03)',
    border: '1px solid rgba(226, 232, 240, 0.8)',
    borderRadius: '8px',
    marginBottom: '8px',
    flex: '0 0 auto',
    position: 'relative' as const,
    overflow: 'hidden',
    boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)'
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

    const maxNodeWidth = Math.max(36, Math.min(60, containerWidth * 0.15));
    const maxNodeHeight = 24;


    const horizontalMargin = (maxNodeWidth / containerWidth) * 100;
    const verticalMargin = (maxNodeHeight / minimapHeight) * 100;

    const availableHorizontal = 100 - (horizontalMargin * 2);
    const availableVertical = 100 - (verticalMargin * 2);

    return nodes.map((node, i) => {
      const x = ((node.position.x - minX) / width) * availableHorizontal + horizontalMargin;
      const y = ((node.position.y - minY) / height) * availableVertical + verticalMargin;

      // Check if this is the statement node (usually has type 'statement' or is the first node)
      const isStatement = (node as any).type === 'statement' ||
        (node as any).data?.type === 'statement' ||
        i === 0;

      const nodeContent = isStatement
        ? rationale.title
        : (node as any).data?.content || (node as any).data?.initialPointData?.content || 'Point content';

      const isHovered = hoveredNodeId === node.id;

      const statementWidth = Math.max(36, Math.min(60, containerWidth * 0.15));
      const pointWidth = Math.max(24, Math.min(36, containerWidth * 0.09));
      const nodeHeight = 24;

      return (
        <div
          key={node.id}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: isStatement ? `${statementWidth}px` : `${pointWidth}px`,
            height: `${nodeHeight}px`,
            backgroundColor: isHovered
              ? (isStatement ? 'rgba(107, 114, 128, 1)' : 'rgba(107, 114, 128, 0.8)')
              : (isStatement ? 'rgba(107, 114, 128, 0.8)' : 'rgba(107, 114, 128, 0.6)'),
            borderRadius: isStatement ? '6px' : '4px',
            border: `2px solid ${isStatement ? 'rgba(75, 85, 99, 0.9)' : 'rgba(75, 85, 99, 0.7)'}`,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            transform: isHovered ? 'scale(1.1)' : 'scale(1)',
            zIndex: isHovered ? 10 : 1
          }}
          onMouseEnter={(e) => {
            e.stopPropagation();
            setHoveredNodeId(node.id);
            const rect = e.currentTarget.getBoundingClientRect();
            const minimapRect = e.currentTarget.parentElement?.getBoundingClientRect();
            if (minimapRect) {
              const nodeX = rect.left - minimapRect.left + rect.width / 2;
              const nodeY = rect.top - minimapRect.top + rect.height / 2;
              const tooltipPos = calculateTooltipPosition(nodeX, nodeY);

              setNodePreview({
                id: node.id,
                content: nodeContent,
                x: tooltipPos.nodeX,
                y: tooltipPos.nodeY,
                position: tooltipPos.position
              });
            }
          }}
          onMouseLeave={(e) => {
            e.stopPropagation();
            setHoveredNodeId(null);
            setNodePreview(null);
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setHoveredNodeId(node.id);
            const rect = e.currentTarget.getBoundingClientRect();
            const minimapRect = e.currentTarget.parentElement?.getBoundingClientRect();
            if (minimapRect) {
              const nodeX = rect.left - minimapRect.left + rect.width / 2;
              const nodeY = rect.top - minimapRect.top + rect.height / 2;
              const tooltipPos = calculateTooltipPosition(nodeX, nodeY);

              setNodePreview({
                id: node.id,
                content: nodeContent,
                x: tooltipPos.nodeX,
                y: tooltipPos.nodeY,
                position: tooltipPos.position
              });
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
        />
      );
    });
  };


  return (
    <div
      data-rationale-container
      style={containerStyle}
      onClick={() => {
        const safeSpace = (rationale.space || 'scroll').replace(/[^a-zA-Z0-9-]/g, '');
        const safeId = rationale.id.replace(/[^a-zA-Z0-9_-]/g, '');
        if (safeSpace && safeId) {
          window.open(`/s/${safeSpace}/rationale/${safeId}`, '_blank', 'noopener,noreferrer');
        }
      }}
    >
      {/* MiniMap Section */}
      <div style={minimapStyle}>
        {renderNodes()}
      </div>

      {/* Node Preview Tooltip - Discourse Style */}
      {nodePreview && (() => {
        const gap = 10;
        const containerPadding = 10;
        const minimapTop = 8;
        let tooltipStyle = {};
        let arrowStyle = {};

        switch (nodePreview.position) {
          case 'top':
            tooltipStyle = {
              left: `${containerPadding + nodePreview.x}px`,
              top: `${minimapTop + nodePreview.y - gap}px`,
              transform: 'translateX(-50%) translateY(-100%)'
            };
            arrowStyle = {
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #333'
            };
            break;
          case 'bottom':
            tooltipStyle = {
              left: `${containerPadding + nodePreview.x}px`,
              top: `${minimapTop + nodePreview.y + gap}px`,
              transform: 'translateX(-50%) translateY(0%)'
            };
            arrowStyle = {
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderBottom: '5px solid #333'
            };
            break;
          case 'left':
            tooltipStyle = {
              left: `${containerPadding + nodePreview.x - gap}px`,
              top: `${minimapTop + nodePreview.y}px`,
              transform: 'translateX(-100%) translateY(-50%)'
            };
            arrowStyle = {
              left: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderLeft: '5px solid #333'
            };
            break;
          case 'right':
            tooltipStyle = {
              left: `${containerPadding + nodePreview.x + gap}px`,
              top: `${minimapTop + nodePreview.y}px`,
              transform: 'translateX(0%) translateY(-50%)'
            };
            arrowStyle = {
              right: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderRight: '5px solid #333'
            };
            break;
        }

        return (
          <div
            style={{
              position: 'absolute',
              ...tooltipStyle,
              backgroundColor: '#333',
              color: '#fff',
              padding: '6px 8px',
              fontSize: '11px',
              fontWeight: '400',
              borderRadius: '3px',
              maxWidth: `${tooltipMaxWidth}px`,
              wordWrap: 'break-word',
              zIndex: 20,
              pointerEvents: 'none',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
              border: '1px solid #444',
              fontFamily: 'inherit'
            }}
          >
            {nodePreview.content.length > 80
              ? nodePreview.content.substring(0, 80) + '...'
              : nodePreview.content
            }
            {/* Arrow */}
            <div
              style={{
                position: 'absolute',
                ...arrowStyle,
                width: 0,
                height: 0
              }}
            />
          </div>
        );
      })()}

      {/* Content Section */}
      <div style={{ display: 'flex', gap: '10px', flex: '1 1 auto' }}>
        <div style={{ flex: 1 }}>
          {/* Title and Author */}
          <div style={{ marginBottom: '4px' }}>
            <div style={{ fontSize: '13px', color: '#3b82f6', fontWeight: '600', marginBottom: '2px' }}>
              {rationale.authorUsername}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
              <h3 style={{
                margin: '0 0 3px',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1e293b',
                lineHeight: '1.3',
                letterSpacing: '-0.025em',
                flex: 1
              }}>
                {rationale.title}
              </h3>

              <a
                href={`/s/${rationale.space || 'scroll'}/rationale/${rationale.id}`}
                target="_blank"
                rel="noopener,noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
                  minWidth: '56px',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 3px 6px rgba(59, 130, 246, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
                }}
              >
                Open
              </a>
            </div>
          </div>

          {/* Description - show if exists */}
          {rationale.description && (
            <p style={{
              margin: '0 0 6px',
              fontSize: '11px',
              color: '#64748b',
              lineHeight: '1.4',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {rationale.description.length > 120
                ? rationale.description.substring(0, 120) + '...'
                : rationale.description
              }
            </p>
          )}

          {/* Stats Row */}
          <div style={{
            display: 'flex',
            gap: '8px',
            fontSize: '10px',
            color: '#64748b',
            fontWeight: '500'
          }}>
            <span style={{ color: '#059669' }}><strong>{Math.floor(rationale.statistics.totalCred)}</strong> cred</span>
            <span style={{ color: '#f59e0b' }}><strong>{rationale.statistics.averageFavor?.toFixed(1) || '0.0'}</strong> favor</span>
            <span style={{ color: '#0369a1' }}><strong>{rationale.statistics.endorsements || 0}</strong> endorsements</span>
            <span style={{ color: '#7c3aed' }}><strong>{rationale.statistics.pointsCount || 0}</strong> points</span>
            <span style={{ color: '#dc2626' }}><strong>{rationale.statistics.copies}</strong> copies</span>
          </div>
        </div>
      </div>
    </div>
  );
}