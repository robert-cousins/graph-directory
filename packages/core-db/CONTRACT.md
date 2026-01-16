# Database Contract

This document specifies the stable database objects and contracts that applications can rely on. These objects are guaranteed to maintain their interface and semantics across versions.

## Public Query Contracts

### Views

#### `public.published_businesses`
Primary query contract for public-facing directory listings.

**Purpose**: Returns only published businesses with aggregated service/area data.

**Schema**:
```sql
id UUID PRIMARY KEY,
slug VARCHAR(255) UNIQUE,
legal_name VARCHAR(255),
trading_name VARCHAR(255),
description TEXT,
phone VARCHAR(20),
email VARCHAR(255),
website VARCHAR(255),
street_address TEXT,
rating DECIMAL(3,2),
review_count INTEGER,
years_experience INTEGER,
hero_image TEXT,
published_at TIMESTAMP WITH TIME ZONE,
created_at TIMESTAMP WITH TIME ZONE,
services TEXT[], -- Aggregated service names
service_areas TEXT[], -- Aggregated area names
emergency_available BOOLEAN, -- Derived from availability_windows
is_verified BOOLEAN, -- verified_at IS NOT NULL
verified_credentials_count INTEGER -- COUNT of verified credentials
```

**Semantics**:
- Only returns businesses with `status = 'published'`
- Services and service_areas are aggregated arrays of names
- emergency_available is true if business has any emergency availability windows
- is_verified indicates manual credential verification
- verified_credentials_count shows number of verified credentials

### Functions

#### `public.get_businesses_by_service(p_service_slug VARCHAR(100))`
Query contract for businesses offering a specific service.

**Returns**: TABLE of published businesses filtered by service slug
**Parameters**:
- `p_service_slug`: Service type slug to filter by

**Return Schema**:
```sql
id UUID,
slug VARCHAR(255),
trading_name VARCHAR(255),
description TEXT,
phone VARCHAR(20),
email VARCHAR(255),
rating DECIMAL(3,2),
review_count INTEGER,
emergency_available BOOLEAN,
hero_image TEXT,
service_areas TEXT[]
```

**Semantics**:
- Returns only published businesses offering the specified service
- Ordered by rating DESC, then review_count DESC

#### `public.get_businesses_by_area(p_area_slug VARCHAR(100))`
Query contract for businesses serving a specific area.

**Returns**: TABLE of published businesses filtered by service area slug
**Parameters**:
- `p_area_slug`: Service area slug to filter by

**Return Schema**:
```sql
id UUID,
slug VARCHAR(255),
trading_name VARCHAR(255),
description TEXT,
phone VARCHAR(20),
email VARCHAR(255),
rating DECIMAL(3,2),
review_count INTEGER,
emergency_available BOOLEAN,
hero_image TEXT,
services TEXT[]
```

**Semantics**:
- Returns only published businesses serving the specified area
- Ordered by rating DESC, then review_count DESC

## Stability Guarantees

- **Interface Stability**: Column names, types, and function signatures will not change
- **Semantic Stability**: Query results and filtering logic will maintain expected behavior
- **Performance**: Reasonable performance is guaranteed; significant regressions will be addressed
- **Backwards Compatibility**: New columns may be added but existing ones will not be removed

## Version History

- **v1.0**: Initial stable contracts (published_businesses view, service/area query functions)

---

## Publication Model (Phase 5)

Authoritative publication lifecycle and visibility rules are defined in:

- `docs/architecture/phase-5-publication-model.md`

### Phase 5 Lifecycle Implementation

Phase 5 implements a publication lifecycle using the existing `status` field with the following mapping:

- **draft** → `status = 'draft'`
- **review** → `status = 'pending_review'`
- **published** → `status = 'published'`

### Contract Semantics (Implemented)

#### Public Read Surfaces
- `public.published_businesses` view: Returns ONLY businesses with `status = 'published'`
- `public.get_businesses_by_service()` function: Returns ONLY published businesses
- `public.get_businesses_by_area()` function: Returns ONLY published businesses

#### Admin/Editor Read Surfaces
- `public.pending_review_queue` view: Returns businesses with `status IN ('draft', 'pending_review')` for editorial workflow
- `public.editorial_businesses` view: Comprehensive admin view for businesses with `status IN ('draft', 'pending_review', 'published')`

#### Lifecycle Transition Functions
- `public.submit_for_review(p_business_id UUID, p_submitted_by UUID)`: Transitions `draft → pending_review`
- `public.request_changes(p_business_id UUID, p_requested_by UUID)`: Transitions `pending_review → draft` (admin only)
- `public.publish_business(p_business_id UUID, p_published_by UUID)`: Transitions `pending_review → published` (admin only)
- `public.unpublish_business(p_business_id UUID, p_unpublished_by UUID)`: Transitions `published → draft` (admin only)

### Audit Fields

Phase 5 adds the following audit fields to the `businesses` table:

- `review_submitted_at`: Timestamp when submitted for review
- `review_submitted_by`: User ID who submitted for review
- `published_at`: Timestamp when published (existing field)
- `published_by`: User ID who published the business

### Visibility Enforcement

- **Public visibility**: Enforced at DB level via `published_businesses` view and RLS policies
- **Admin visibility**: Access to draft/review content via `editorial_businesses` view (service_role only)
- **Transition gating**: All lifecycle changes occur through SECURITY DEFINER functions accessible only via `core-mutators`

### Stability Guarantees

- All existing public contracts (`published_businesses`, `get_businesses_by_service`, `get_businesses_by_area`) maintain their interfaces and semantics
- New admin surfaces are additive and do not affect existing functionality
- Lifecycle transitions are atomic and audited
