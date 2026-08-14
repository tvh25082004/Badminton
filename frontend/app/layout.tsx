import type { Metadata } from 'next';
import { Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-bv',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Cầu Lông — Ghép trận & Xếp hạng',
  description:
    'Nền tảng ghép người chơi, tổ chức trận và xếp hạng Elo cho cầu lông phong trào tại Việt Nam.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className={beVietnam.variable} style={{ fontFamily: 'var(--font-bv), sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
