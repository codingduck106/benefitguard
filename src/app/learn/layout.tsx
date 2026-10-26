import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'How to spot benefits scams' };

export default function LearnLayout({ children }: LayoutProps<'/learn'>) {
  return children;
}
