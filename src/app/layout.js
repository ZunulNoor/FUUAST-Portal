import './globals.css';
import AppPortalGuard from '@/components/AppPortalGuard';
import ConfirmProvider from '@/components/providers/ConfirmProvider';
import Toaster from '@/components/ui/Toaster';

export const metadata = {
  title: 'FUUAST Attendance Portal',
  description: 'University attendance management — subject-wise, role-based, mobile-first.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ConfirmProvider>
          <AppPortalGuard>{children}</AppPortalGuard>
          <Toaster />
        </ConfirmProvider>
      </body>
    </html>
  );
}
