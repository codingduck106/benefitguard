/**
 * Data Access Layer for the official sources knowledge base.
 * Modular interface to allow future PostgreSQL migration.
 */

import type { KnowledgeBase, OfficialSource, DomainDatabase, ApprovedDomain, SampleMessage } from './types';
import officialSourcesData from '../../data/official-sources.json';
import knownDomainsData from '../../data/known-domains.json';
import sampleMessagesData from '../../data/sample-messages.json';

// ─── Knowledge Base Access ───────────────────────────────────────────────────

const knowledgeBase: KnowledgeBase = officialSourcesData as KnowledgeBase;
const domainDatabase: DomainDatabase = knownDomainsData as DomainDatabase;

export function getAllSources(): OfficialSource[] {
  return knowledgeBase.sources;
}

export function getSourceById(id: string): OfficialSource | undefined {
  return knowledgeBase.sources.find((s) => s.id === id);
}

export function getSourcesByTopic(topic: string): OfficialSource[] {
  return knowledgeBase.sources.filter(
    (s) => s.topic.toLowerCase().includes(topic.toLowerCase())
  );
}

export function searchSources(query: string): OfficialSource[] {
  const lowerQuery = query.toLowerCase();
  return knowledgeBase.sources.filter(
    (s) =>
      s.policyStatement.toLowerCase().includes(lowerQuery) ||
      s.topic.toLowerCase().includes(lowerQuery) ||
      s.agency.toLowerCase().includes(lowerQuery) ||
      s.keywords.some((k) => k.toLowerCase().includes(lowerQuery))
  );
}

export function getKnowledgeBaseVersion(): string {
  return knowledgeBase.version;
}

export function getKnowledgeBaseLastUpdated(): string {
  return knowledgeBase.lastUpdated;
}

// ─── Domain Access ───────────────────────────────────────────────────────────

export function getApprovedDomains(): ApprovedDomain[] {
  return domainDatabase.approvedDomains;
}

export function getUrlShorteners(): string[] {
  return domainDatabase.urlShorteners;
}

// ─── Sample Messages ─────────────────────────────────────────────────────────

export function getSampleMessages(): SampleMessage[] {
  return (sampleMessagesData as { samples: SampleMessage[] }).samples;
}

export function getSampleMessageById(id: string): SampleMessage | undefined {
  return (sampleMessagesData as { samples: SampleMessage[] }).samples.find(
    (s) => s.id === id
  );
}
