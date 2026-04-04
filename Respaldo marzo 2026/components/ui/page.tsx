type Props = {
    title?: string;
    children: React.ReactNode;
  };
  
  export function Page({ title, children }: Props) {
    return (
      <main
        style={{
          minHeight: '100vh',
          backgroundColor: '#020617',
          color: '#f9fafb',
          padding: '40px 20px',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
          }}
        >
          {title && (
            <h1
              style={{
                fontSize: 28,
                fontWeight: 600,
                marginBottom: 24,
              }}
            >
              {title}
            </h1>
          )}
  
          {children}
        </div>
      </main>
    );
  }
  