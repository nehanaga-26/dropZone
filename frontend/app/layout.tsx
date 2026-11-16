import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../lib/auth';
import { ZoneProvider } from '../lib/zone-context';
import { ToastProvider } from '../components/ui/Toast';
import { AuthGate } from '../components/auth/AuthGate';

export const metadata: Metadata = {
  title: 'DropZone — Spatial Network // Geofenced Social Platform',
  description:
    'Connect. Collaborate. Discover. Privacy-conscious, zone-based social platform for campuses and hackathons with automatic content expiry.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#EEF4FF] text-[#172B4D] min-h-screen antialiased selection:bg-[#248BFF]/20 selection:text-[#248BFF]">
        <ToastProvider>
          <AuthProvider>
            <ZoneProvider>
              <AuthGate>{children}</AuthGate>
            </ZoneProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
