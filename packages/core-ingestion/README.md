# @graph-directory/core-ingestion

**Safe, Isolated Data Ingestion Pipeline for Graph Directory**

## Overview

The `@graph-directory/core-ingestion` package provides a robust ingestion pipeline that safely populates the Graph Directory with business data while maintaining strict lifecycle management and comprehensive audit trails.

## Features

✅ **Safe Lifecycle Management** - Never publishes directly, always creates drafts or suggestions
✅ **Comprehensive Audit Trails** - Complete evidence chain for every ingested record
✅ **Idempotent Operations** - Safe to re-run ingestion without creating duplicates
✅ **Deterministic Deduplication** - Clear matching hierarchy with confidence scoring
✅ **Lazy Initialization** - No import-time side effects, CI-friendly
✅ **Boundary Isolation** - No runtime dependencies on ingestion code

## Installation

This package is part of the Graph Directory monorepo and should be used within the workspace.

## Usage

### Basic Import

```typescript
import {
  applyLead,
  createIngestionRun,
  completeIngestionRun,
  failIngestionRun,
  getIngestionServiceRoleClient
} from '@graph-directory/core-ingestion';
```

### Core Workflow

```typescript
// 1. Create ingestion run
const runId = await createIngestionRun(
  'dataforseo_serp_maps',
  'plumbers-perth',
  { keywords: ['plumber'], locations: ['Perth WA'] },
  'automated-script'
);

// 2. Process leads
const result = await applyLead(normalizedLead, runId);

// 3. Complete ingestion
await completeIngestionRun(runId, {
  totalLeads: 100,
  successCount: 95,
  failureCount: 5
});
```

## API Reference

### Functions

#### `createIngestionRun(source, instanceKey, params, createdBy)`
Creates a new ingestion run record

#### `applyLead(normalizedLead, ingestionRunId)`
Main ingestion function - processes a normalized lead

#### `completeIngestionRun(runId, stats)`
Marks ingestion run as completed with statistics

#### `failIngestionRun(runId, errorMessage)`
Marks ingestion run as failed

#### `getIngestionServiceRoleClient()`
Lazy-initialized Supabase client (no side effects on import)

### Types

#### `NormalizedLead`
```typescript
{
  source: 'seed' | 'dataforseo_serp_maps' | 'dataforseo_business_listings' | 'google_places';
  sourceUrl: string | null;
  sourceExternalId: string | null;
  rawPayload: any;
  payloadHash: string;
  fetchedAt: string;
  name: string;
  // ... other business fields
  evidence: Array<{
    type: ClaimType;
    value: string;
    confidence: number;
    provenance: string;
    observedAt: string;
  }>;
}
```

#### `IngestionResult`
```typescript
{
  success: boolean;
  action: 'created' | 'updated_draft' | 'suggested_updates' | 'skipped_published';
  businessId: string | null;
  lifecycleState: string;
  rawLeadId: string;
  suggestionsCount?: number;
  error?: string;
}
```

## Safety Features

### Lifecycle Enforcement

- **New businesses**: Created as `draft`
- **Existing businesses**: Only updated if already `draft`
- **Low-confidence matches**: Create `suggested_updates` for admin review
- **Published businesses**: Never modified directly

### Deduplication Strategy

1. **External ID match** (confidence: 1.0)
2. **Website domain match** (confidence: 0.95)
3. **Phone number match** (confidence: 0.90)
4. **Name + suburb match** (confidence: 0.60)

### Error Handling

- **Graceful degradation**: Failed leads don't stop entire ingestion
- **Comprehensive logging**: Detailed error information
- **Recovery support**: Resume from failed runs

## Development

### Testing

```bash
# Run unit tests
npm test

# Run integration tests
RUN_INTEGRATION=1 npm test
```

### Environment Variables

```env
SUPABASE_SERVICE_ROLE_KEY=required_for_ingestion
DATAFORSEO_LOGIN=required_for_dataforseo
DATAFORSEO_PASSWORD=required_for_dataforseo
```

## Architecture

### Package Structure

```
src/
├── types.ts          # Type definitions and validation
├── service-role.ts    # Lazy Supabase client
├── applyLead.ts       # Core ingestion logic
└── index.ts          # Main exports
```

### Database Integration

The package works with these database tables:
- `ingestion_runs` - Execution tracking
- `raw_leads` - Immutable raw data
- `lead_evidence` - Structured claims
- `lead_matches` - Deduplication results
- `suggested_updates` - Admin review queue

## Best Practices

1. **Start small**: Test with small datasets first
2. **Monitor results**: Check admin queue regularly
3. **Use dry runs**: Validate before real ingestion
4. **Batch processing**: Process in manageable batches
5. **Error monitoring**: Set up alerts for failed runs

## Examples

See the [CLI scripts](../../scripts/ingestion/) for complete usage examples.

## License

MIT © Graph Directory
