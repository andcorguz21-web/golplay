export default function Loader({
    label,
  }: {
    label?: string;
  }) {
    return (
      <div
        style={{
          minHeight: 180,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            border: '4px solid #e5e7eb',
            borderTopColor: '#16a34a',
            animation: 'spin 1s linear infinite',
          }}
        />
  
        {label && (
          <span
            style={{
              fontSize: 13,
              color: '#6b7280',
            }}
          >
            {label}
          </span>
        )}
  
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }
  