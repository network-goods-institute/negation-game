'use client';

import { useEffect, useState } from 'react';

const IFRAME_STYLES = {
  html: {
    scrollbarWidth: 'none' as const,
    msOverflowStyle: 'none' as const,
    overflow: 'hidden' as const,
  },
  body: {
    scrollbarWidth: 'none' as const,
    msOverflowStyle: 'none' as const,
    overflow: 'hidden' as const,
  },
  webkitScrollbar: {
    display: 'none',
  }
} as const;

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isClient, setIsClient] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const inIframe = window !== window.parent;
    setIsInIframe(inIframe);

    if (inIframe) {
      const htmlElement = document.documentElement;
      const bodyElement = document.body;

      const originalHtmlStyles = {
        scrollbarWidth: htmlElement.style.scrollbarWidth,
        msOverflowStyle: (htmlElement.style as any).msOverflowStyle,
        overflow: htmlElement.style.overflow,
      };

      const originalBodyStyles = {
        scrollbarWidth: bodyElement.style.scrollbarWidth,
        msOverflowStyle: (bodyElement.style as any).msOverflowStyle,
        overflow: bodyElement.style.overflow,
      };

      Object.assign(htmlElement.style, IFRAME_STYLES.html);
      Object.assign(bodyElement.style, IFRAME_STYLES.body);

      const styleElement = document.createElement('style');
      styleElement.setAttribute('data-embed-styles', 'true');
      styleElement.textContent = `
        html::-webkit-scrollbar,
        body::-webkit-scrollbar {
          display: none !important;
        }
      `;
      document.head.appendChild(styleElement);

      return () => {
        Object.assign(htmlElement.style, originalHtmlStyles);
        Object.assign(bodyElement.style, originalBodyStyles);

        if (document.head.contains(styleElement)) {
          document.head.removeChild(styleElement);
        }
      };
    }
  }, []);

  return (
    <div
      style={{
        margin: 0,
        padding: '16px',
        background: '#fff',
        color: '#333',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '14px',
        lineHeight: '1.4',
        ...(isInIframe && {
          height: '100vh',
          overflow: 'hidden'
        })
      }}
    >
      {children}
    </div>
  );
}