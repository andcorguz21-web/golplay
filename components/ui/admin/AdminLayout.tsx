import { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';

export default function AdminLayout({ children }: { children: any }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={layout}>
      {/* DESKTOP SIDEBAR */}
      <div style={desktopOnly}>
        <AdminSidebar />
      </div>

      {/* MOBILE DRAWER */}
      {open && (
        <div style={overlay} onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <AdminSidebar onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* MAIN */}
      <div style={main}>
        <div style={mobileOnly}>
          <AdminTopbar onMenu={() => setOpen(true)} />
        </div>

        <div style={content}>{children}</div>
      </div>
    </div>
  );
}

/* ================= STYLES ================= */

const layout = {
  display: 'flex',
  minHeight: '100vh',
  background: '#f9fafb',
};

const main = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column' as const,
};

const content = {
  padding: 24,
};

const overlay = {
  position: 'fixed' as const,
  inset: 0,
  background: 'rgba(0,0,0,.4)',
  zIndex: 50,
};

const desktopOnly = {
  display: 'none',
  '@media (min-width: 768px)': {
    display: 'block',
  },
};

const mobileOnly = {
  display: 'block',
  '@media (min-width: 768px)': {
    display: 'none',
  },
};
