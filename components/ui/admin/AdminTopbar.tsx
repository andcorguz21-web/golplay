export default function AdminTopbar({ onMenu }: { onMenu: () => void }) {
    return (
      <header style={topbar}>
        <button onClick={onMenu} style={menuBtn}>
          ☰
        </button>
        <span style={{ fontWeight: 600 }}>Admin</span>
      </header>
    );
  }
  
  const topbar = {
    height: 56,
    background: '#fff',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    gap: 12,
  };
  
  const menuBtn = {
    fontSize: 20,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  };
  