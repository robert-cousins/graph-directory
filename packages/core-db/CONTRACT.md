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
