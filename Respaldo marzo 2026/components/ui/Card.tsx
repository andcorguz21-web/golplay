type Props = {
    children: React.ReactNode;
  };
  
  export function Card({ children }: Props) {
    return (
      <div
        style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: 12,
          padding: 20,
        }}
      >
        {children}
      </div>
    );
  }
  