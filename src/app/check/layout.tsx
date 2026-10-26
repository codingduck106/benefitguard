import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Check a message' };

export default function CheckLayout({ children }: LayoutProps<'/check'>) {
  return children;
}
