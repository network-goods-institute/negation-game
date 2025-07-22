export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{
      margin: 0,
      padding: '16px',
      background: '#fff',
      color: '#333',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      lineHeight: '1.4'
    }}>
      {children}
    </div>
  );
}