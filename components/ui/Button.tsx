type Props = {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  };
  
  export function Button({ children, onClick, disabled }: Props) {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          backgroundColor: disabled ? '#064e3b' : '#16a34a',
          color: '#ffffff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 16px',
          fontWeight: 500,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {children}
      </button>
    );
  }
  