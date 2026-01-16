# Phase 6 - Ingestion Plane

## Overview

The Ingestion Plane provides a safe, isolated pipeline for populating the Graph Directory with business data from various sources. It follows strict lifecycle management rules and maintains comprehensive audit trails.

## Architecture

### Core Principles

1. **Isolation**: Ingestion code is completely separate from runtime/public-facing code
2. **Safety**: All ingested data defaults to `draft` or `pending_review` lifecycle states
3. **Auditability**: Complete evidence trail for every ingested record
4. **Idempotency**: Safe to re-run ingestion without creating duplicates
5. **Boundary Enforcement**: No runtime dependencies on ingestion components

### Package Structure

```
packages/core-ingestion/
├── src/
│   ├── types.ts              # Type definitions
│   ├── service-role.ts       # Lazy-initialized Supabase client
│   ├── applyLead.ts          # Core ingestion logic
│   └── index.ts              # Main exports
└── package.json
```

### Database Schema

The ingestion plane adds 5 new tables:

1. **`ingestion_runs`**: Tracks each ingestion execution with metadata and status
2. **`raw_leads`**: Stores immutable raw data from external sources
3. **`lead_evidence`**: Structured claims with confidence scoring
4. **`lead_matches`**: Deduplication and matching results
5. **`suggested_updates`**: Proposed updates for admin review

## Usage

### CLI Commands

#### Seed Demo Data

```bash
# Basic usage (100 businesses, 5% fault rate)
npm run seed:demo

# Custom configuration
npm run seed:demo -- --count 200 --fault-rate 0.1 --seed 42 --instance plumbers-perth

# Dry run (no database changes)
npm run seed:demo -- --dry-run

# Verbose output
npm run seed:demo -- --verbose
```

**Options:**
- `--count, -c`: Number of businesses to generate (default: 100)
- `--fault-rate, -f`: Percentage of faulty records for testing (default: 0.05)
- `--seed, -s`: RNG seed for deterministic output (default: 42)
- `--instance, -i`: Instance key (default: "plumbers-perth")
- `--dry-run, -d`: Show what would be done without database changes
- `--verbose, -v`: Detailed output

#### DataForSEO Ingestion

```bash
# Google Maps SERP ingestion
export DATAFORSEO_LOGIN="your_login"
export DATAFORSEO_PASSWORD="your_password"
npm run ingest:dataforseo:maps -- --keywords "plumber,emergency plumber" --locations "Perth WA,Fremantle WA" --depth 20

# Business Listings ingestion
export DATAFORSEO_LOGIN="your_login"
export DATAFORSEO_PASSWORD="your_password"
npm run ingest:dataforseo:listings -- --categories "plumber" --locations "Perth WA" --limit 50
```

### Programmatic Usage

```typescript
import { applyLead, createIngestionRun, completeIngestionRun } from '@graph-directory/core-ingestion';

// Create ingestion run
const runId = await createIngestionRun(
  'dataforseo_serp_maps',
  'plumbers-perth',
  {
    keywords: ['plumber', 'emergency plumber'],
    locations: ['Perth WA', 'Fremantle WA'],
    depth: 20
  },
  'automated-script'
);

// Process leads
const normalizedLead = {
  source: 'dataforseo_serp_maps',
  sourceUrl: 'https://api.dataforseo.com/v3/serp/google/maps/...',
  sourceExternalId: 'place_12345',
  rawPayload: { /* raw API response */ },
  payloadHash: 'a1b2c3...',
  fetchedAt: new Date().toISOString(),
  name: 'Perth Emergency Plumbing',
  phone: '08 9345 6789',
  website: 'https://perthemergencyplumbing.com.au',
  // ... other normalized fields
  evidence: [
    { type: 'name', value: 'Perth Emergency Plumbing', confidence: 1.0, provenance: 'api_title', observedAt: new Date().toISOString() },
    { type: 'phone', value: '08 9345 6789', confidence: 0.95, provenance: 'api_phone', observedAt: new Date().toISOString() }
  ]
};

const result = await applyLead(normalizedLead, runId);

// Complete ingestion
await completeIngestionRun(runId, {
  totalLeads: 1,
  successCount: result.success ? 1 : 0,
  failureCount: result.success ? 0 : 1
});
```

## Safety Features

### Lifecycle Enforcement

- **Never publishes directly**: All ingested businesses start as `draft` or generate `suggested_updates`
- **Admin review required**: Low-confidence matches create suggestions, not direct updates
- **High-confidence updates**: Only update `draft` businesses, never published ones

### Deduplication Strategy (MVP)

1. **External ID match** (confidence: 1.0) - Highest priority
2. **Website domain match** (confidence: 0.95)
3. **Phone number match** (confidence: 0.90)
4. **Name + suburb match** (confidence: 0.60) - Requires review

### Audit Trail

Every ingestion operation creates:
- **Raw lead record**: Complete original payload with hash
- **Evidence claims**: Individual data points with confidence scores
- **Match records**: Deduplication results and strategies
- **Suggested updates**: Proposed changes for admin review

## Development

### Testing

```bash
# Run unit tests
npm test

# Run integration tests (requires DB credentials)
RUN_INTEGRATION=1 npm test
```

### Environment Variables

```env
# Required for ingestion operations
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATAFORSEO_LOGIN=your_login
DATAFORSEO_PASSWORD=your_password

# Optional for Google Places (future)
GOOGLE_MAPS_API_KEY=your_api_key
```

### Fault Injection

The seeder supports deterministic fault injection for testing:

- **Invalid phone formats**: `INVALID_PHONE`
- **Invalid URLs**: `not-a-valid-url`
- **Out-of-bounds ratings**: `6.0` (max should be 5.0)
- **Missing required fields**: Omitted name field

Fault rate is configurable via `--fault-rate` parameter.

## Deployment

### Migration

```bash
# Apply database migration
npm run db:migrate
```

### Rollback

```bash
# Revert migration (if needed)
npm run db:revert 20260117_phase6_ingestion_tables

# Clean up ingestion data (optional)
npm run ingestion:cleanup
```

## Monitoring

### Database Views

- **`ingestion_statistics`**: Aggregated metrics for each ingestion run
- **`recent_ingestion_activity`**: Recent ingestion operations (last 30 days)

### Query Examples

```sql
-- Get all ingestion runs
SELECT * FROM ingestion_runs ORDER BY started_at DESC;

-- Get statistics for a specific run
SELECT * FROM ingestion_statistics WHERE ingestion_run_id = '...';

-- Find leads that generated suggestions
SELECT * FROM suggested_updates WHERE status = 'pending';
```

## Best Practices

1. **Start with seed data**: Use `npm run seed:demo` for initial testing
2. **Small batches first**: Test with small datasets before large ingestions
3. **Monitor admin queue**: Review suggested updates regularly
4. **Use deterministic seeds**: For reproducible testing and demos
5. **Validate data quality**: Check fault injection results

## Future Enhancements

- **Google Places API integration**: Direct API connector
- **Bulk CSV import**: For offline data sources
- **Advanced deduplication**: Machine learning-based matching
- **Automated review**: Rules-based auto-approval for high-confidence updates
- **Webhook notifications**: Real-time alerts for ingestion events
