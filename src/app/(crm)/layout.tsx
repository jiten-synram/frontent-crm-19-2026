// src/app/(crm)/layout.tsx
import Shell from '@/components/layout/Shell';
import { Toaster } from 'react-hot-toast';

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Shell>{children}</Shell>
      <Toaster position="bottom-right" toastOptions={{
        duration: 3000,
        style: { background: '#162B20', color: '#fff', fontSize: '13px', fontFamily: 'Plus Jakarta Sans, sans-serif' },
        success: { iconTheme: { primary: '#4ade80', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#f87171', secondary: '#fff' } },
      }} />
    </>
  );
}
