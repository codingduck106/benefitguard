import { getAllSources, getApprovedDomains } from '@/lib/data-access';
import type { Metadata } from 'next';
import ResourcesList from '@/components/ResourcesList';

export const metadata: Metadata = { title: 'Official resources' };

export default function ResourcesPage() {
  return <ResourcesList sources={getAllSources()} domains={getApprovedDomains()} />;
}
