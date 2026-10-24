import { getAllSources, getApprovedDomains } from '@/lib/data-access';
import ResourcesList from '@/components/ResourcesList';

export default function ResourcesPage() {
  return <ResourcesList sources={getAllSources()} domains={getApprovedDomains()} />;
}
