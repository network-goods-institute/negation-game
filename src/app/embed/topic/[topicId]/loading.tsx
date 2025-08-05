export default function TopicEmbedLoading() {
  const containerStyle = {
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '14px',
    lineHeight: '1.4',
    color: '#222',
    backgroundColor: '#fff',
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center'
  };

  return (
    <div style={containerStyle}>
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '4px solid #e2e8f0',
          borderTop: '4px solid #0088cc',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '16px'
        }}
      />
      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px', color: '#1e293b' }}>
        Loading Topic
      </div>
      <div style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', maxWidth: '250px' }}>
        Fetching rationales and building discussion framework
      </div>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}