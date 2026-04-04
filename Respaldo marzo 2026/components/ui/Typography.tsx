/* ===================== */
/* TYPOGRAPHY SYSTEM */
/* ===================== */

export const PageTitle = ({ children }: { children: React.ReactNode }) => (
    <h1
      style={{
        fontSize: 26,
        fontWeight: 600,
        color: '#111827',
        marginBottom: 24,
      }}
    >
      {children}
    </h1>
  );
  
  export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h2
      style={{
        fontSize: 18,
        fontWeight: 600,
        color: '#111827',
        marginBottom: 12,
      }}
    >
      {children}
    </h2>
  );
  
  export const SubtleText = ({ children }: { children: React.ReactNode }) => (
    <p
      style={{
        fontSize: 13,
        color: '#6b7280',
      }}
    >
      {children}
    </p>
  );
  