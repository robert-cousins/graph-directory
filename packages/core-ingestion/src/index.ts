/**
 * Core Ingestion Package
 * Main entry point for the ingestion pipeline
 */

export * from './types';
export * from './service-role';
export * from './applyLead';

// Re-export for convenience
export { getIngestionServiceRoleClient } from './service-role';
export { applyLead, createIngestionRun, completeIngestionRun, failIngestionRun } from './applyLead';
export type {
  IngestionSource,
  IngestionStatus,
  IngestionRun,
  RawLead,
  LeadEvidence,
  ClaimType,
  NormalizedLead,
  MatchStrategy,
  LeadMatch,
  SuggestedUpdate,
  UpdateStatus,
  IngestionAction,
  IngestionResult,
  DataForSEOTaskResponse,
  IngestionConfig,
  ValidatedNormalizedLead
} from './types';
