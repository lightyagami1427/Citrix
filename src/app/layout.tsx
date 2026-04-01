import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Citrix Troubleshooting Copilot | AI-Powered Support Assistant',
  description:
    'AI-powered support assistant for Citrix engineers. Get real-time troubleshooting help with root cause analysis, action plans, and verified sources from trusted Citrix documentation.',
  keywords: [
    'Citrix',
    'troubleshooting',
    'CVAD',
    'NetScaler',
    'StoreFront',
    'VDA',
    'HDX',
    'support',
    'copilot',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
