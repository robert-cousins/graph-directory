#!/usr/bin/env node
/**
 * Ingestion CLI: Seed Demo Data
 * Generates deterministic mock data for testing and demo purposes
 *
 * Usage:
 *   npm run seed:demo -- --count 200 --fault-rate 0.1 --seed 42 --instance plumbers-perth
 */

// Mock imports for demonstration
// In a real implementation, these would be proper imports from the built package
const { createIngestionRun, completeIngestionRun, failIngestionRun, applyLead } = {
  createIngestionRun: async (source, instanceKey, params, createdBy) => {
    console.log(`[MOCK] Created ingestion run for ${source} - ${instanceKey}`);
    return 'mock-run-id-' + Math.random().toString(36).substring(2, 11);
  },
  completeIngestionRun: async (runId, stats) => {
    console.log(`[MOCK] Completed ingestion run ${runId} with stats:`, stats);
  },
  failIngestionRun: async (runId, errorMessage) => {
    console.log(`[MOCK] Failed ingestion run ${runId}: ${errorMessage}`);
  },
  applyLead: async (lead, runId) => {
    console.log(`[MOCK] Processing lead: ${lead.name}`);
    // Simulate some failures for demonstration
    if (Math.random() < 0.1) {
      return {
        success: false,
        action: 'skipped_published',
        businessId: null,
        lifecycleState: 'unknown',
        rawLeadId: 'mock-lead-id',
        error: 'Simulated processing error'
      };
    }
    return {
      success: true,
      action: Math.random() < 0.3 ? 'suggested_updates' : 'created',
      businessId: 'mock-business-id-' + Math.random().toString(36).substring(2, 9),
      lifecycleState: 'draft',
      rawLeadId: 'mock-lead-id-' + Math.random().toString(36).substring(2, 9),
      suggestionsCount: Math.random() < 0.3 ? 1 : 0
    };
  }
};

function generatePayloadHash(payload) {
  // Simple hash function for demo
  return require('crypto').createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

// Parse command line arguments
const args = require('minimist')(process.argv.slice(2));

// Configuration with defaults
const config = {
  count: parseInt(args.count || args.c || '100', 10),
  faultRate: parseFloat(args['fault-rate'] || args.f || '0.05'),
  seed: parseInt(args.seed || args.s || '42', 10),
  instance: args.instance || args.i || 'plumbers-perth',
  dryRun: args['dry-run'] || args.d || false,
  verbose: args.verbose || args.v || false
};

// Log configuration
console.log('=== Graph Directory Ingestion: Seed Demo Data ===');
console.log('Config:', JSON.stringify(config, null, 2));

// Initialize random number generator with fixed seed for determinism
const seedrandom = require('seedrandom');
const rng = seedrandom(config.seed);

// Business data templates
const businessTemplates = [
  {
    name: '{{prefix}} Plumbing Services',
    services: ['general-plumbing', 'emergency-plumbing', 'drain-cleaning'],
    description: '{{prefix}} Plumbing Services offers 24/7 emergency plumbing solutions with {{years}} years of experience.',
    website: '{{prefix}}-plumbing.com.au',
    phone: '0{{area}}{{random}}',
    address: '{{street}} {{suburb}}, WA {{postcode}}',
    rating: 4.5,
    emergencyAvailable: true
  },
  {
    name: '{{prefix}} Hot Water Specialists',
    services: ['hot-water-systems', 'gas-fitting'],
    description: 'Specializing in hot water system installation and repair. Serving {{suburb}} for over {{years}} years.',
    website: '{{prefix}}-hotwater.com.au',
    phone: '0{{area}}{{random}}',
    address: '{{street}} {{suburb}}, WA {{postcode}}',
    rating: 4.7,
    emergencyAvailable: false
  },
  {
    name: '{{prefix}} Drain Masters',
    services: ['drain-cleaning', 'blocked-drains', 'sewer-repairs'],
    description: 'Expert drain cleaning and sewer repair services. Available 24/7 for emergencies in {{suburb}}.',
    website: '{{prefix}}-drains.com.au',
    phone: '0{{area}}{{random}}',
    address: '{{street}} {{suburb}}, WA {{postcode}}',
    rating: 4.3,
    emergencyAvailable: true
  }
];

// Perth suburbs
const perthSuburbs = [
  'Perth', 'Fremantle', 'Joondalup', 'Midland', 'Armadale', 'Rockingham',
  'Mandurah', 'Bunbury', 'Geraldton', 'Albany', 'Kalgoorlie', 'Esperance'
];

// Street names
const streets = [
  'Main', 'High', 'King', 'Queen', 'Church', 'Market', 'Bridge', 'River',
  'Lake', 'Park', 'Garden', 'Ocean', 'Beach', 'Hill', 'Valley', 'Forest'
];

// Generate random business data
function generateBusinessData(index) {
  const template = businessTemplates[index % businessTemplates.length];
  const suburb = perthSuburbs[index % perthSuburbs.length];
  const street = streets[index % streets.length];
  const postcode = 6000 + (index % 200);
  const areaCode = 8 + (index % 2); // 8 or 9
  const randomDigits = Math.floor(rng() * 10000000).toString().padStart(7, '0');

  // Apply faults based on fault rate
  const shouldFault = rng() < config.faultRate;
  const faultType = shouldFault ? Math.floor(rng() * 4) : null;

  const business = {
    ...template,
    name: template.name.replace('{{prefix}}', suburb),
    description: template.description
      .replace('{{prefix}}', suburb)
      .replace('{{suburb}}', suburb)
      .replace('{{years}}', Math.floor(5 + rng() * 20)),
    website: template.website.replace('{{prefix}}', suburb.toLowerCase()),
    phone: template.phone
      .replace('{{area}}', areaCode)
      .replace('{{random}}', randomDigits.substring(0, 7)),
    address: template.address
      .replace('{{street}}', `${index + 1} ${street} St`)
      .replace('{{suburb}}', suburb)
      .replace('{{postcode}}', postcode.toString()),
    suburb,
    postcode,
    state: 'WA',
    lat: -31.95 + (rng() * 2 - 1) * 0.5,
    lng: 115.85 + (rng() * 2 - 1) * 0.5,
    yearsExperience: Math.floor(5 + rng() * 25),
    rating: template.rating + (rng() * 0.5 - 0.25), // Small variation
    reviewCount: Math.floor(10 + rng() * 190)
  };

  // Apply faults
  if (faultType === 0) {
    business.phone = 'INVALID_PHONE'; // Invalid phone format
  } else if (faultType === 1) {
    business.website = 'not-a-valid-url'; // Invalid URL
  } else if (faultType === 2) {
    business.rating = 6.0; // Rating out of bounds
  } else if (faultType === 3) {
    delete business.name; // Missing required field
  }

  return business;
}

// Generate normalized lead from business data
function generateNormalizedLead(business, index) {
  const timestamp = new Date().toISOString();
  const payload = {
    generated: true,
    business,
    index,
    timestamp,
    seed: config.seed
  };

  const payloadHash = generatePayloadHash(payload);

  // Build evidence trail
  const evidence = [
    { type: 'name', value: business.name, confidence: 1.0, provenance: 'seed_generator', observedAt: timestamp },
    { type: 'phone', value: business.phone, confidence: 0.9, provenance: 'seed_generator', observedAt: timestamp },
    { type: 'address', value: business.address, confidence: 0.8, provenance: 'seed_generator', observedAt: timestamp },
    { type: 'website', value: business.website, confidence: 0.95, provenance: 'seed_generator', observedAt: timestamp },
    { type: 'rating', value: business.rating.toString(), confidence: 0.7, provenance: 'seed_generator', observedAt: timestamp },
    { type: 'emergency_available', value: business.emergencyAvailable ? 'true' : 'false', confidence: 1.0, provenance: 'seed_generator', observedAt: timestamp }
  ];

  return {
    source: 'seed',
    sourceUrl: null,
    sourceExternalId: null,
    rawPayload: payload,
    payloadHash,
    fetchedAt: timestamp,

    name: business.name,
    legalName: `${business.name} Pty Ltd`,
    phone: business.phone,
    email: `contact@${business.website}`,
    website: `https://${business.website}`,
    address: business.address,
    suburb: business.suburb,
    state: business.state,
    postcode: business.postcode.toString(),
    lat: business.lat,
    lng: business.lng,
    description: business.description,
    services: business.services,
    serviceAreas: [business.suburb.toLowerCase().replace(' ', '-')],
    businessHours: business.emergencyAvailable
      ? { '24/7': 'Emergency service available 24 hours' }
      : { 'mon-fri': '8:00 AM - 5:00 PM' },
    yearsExperience: business.yearsExperience,
    emergencyAvailable: business.emergencyAvailable,
    rating: business.rating,
    reviewCount: business.reviewCount,

    evidence
  };
}

// Main execution
async function main() {
  try {
    console.log(`Starting ingestion run for ${config.count} businesses...`);

    // Create ingestion run
    const runId = await createIngestionRun(
      'seed',
      config.instance,
      {
        count: config.count,
        faultRate: config.faultRate,
        seed: config.seed,
        instance: config.instance
      },
      'cli-seed-script'
    );

    console.log(`Created ingestion run: ${runId}`);

    // Process businesses in batches
    const batchSize = 20;
    let successCount = 0;
    let failureCount = 0;
    let faultCount = 0;

    for (let i = 0; i < config.count; i += batchSize) {
      const batchEnd = Math.min(i + batchSize, config.count);
      const batch = [];

      for (let j = i; j < batchEnd; j++) {
        try {
          const business = generateBusinessData(j);
          const lead = generateNormalizedLead(business, j);

          if (config.dryRun) {
            console.log(`[DRY RUN] Would process lead ${j + 1}: ${lead.name}`);
            successCount++;
            continue;
          }

          const result = await applyLead(lead, runId);

          if (result.success) {
            successCount++;
            if (result.action === 'suggested_updates') {
              faultCount++;
            }
            if (config.verbose) {
              console.log(`✅ Processed lead ${j + 1}: ${lead.name} (${result.action})`);
            }
          } else {
            failureCount++;
            console.log(`❌ Failed lead ${j + 1}: ${lead.name} - ${result.error}`);
          }
        } catch (error) {
          failureCount++;
          console.log(`💥 Error processing lead ${j + 1}:`, error.message);
        }
      }

      if (config.verbose || (i + batchSize) % 100 === 0) {
        console.log(`Processed ${Math.min(batchEnd, config.count)}/${config.count} leads...`);
      }
    }

    // Complete ingestion run
    const stats = {
      totalLeads: config.count,
      successCount,
      failureCount,
      faultCount,
      durationMs: Date.now() - startTime,
      leadsCreated: successCount - faultCount,
      leadsUpdated: faultCount,
      leadsSkipped: failureCount
    };

    await completeIngestionRun(runId, stats);

    console.log('=== Ingestion Complete ===');
    console.log('Stats:', JSON.stringify(stats, null, 2));
    console.log('✅ Successfully processed', successCount, 'leads');
    console.log('❌ Failed to process', failureCount, 'leads');
    console.log('🔧 Generated', faultCount, 'faulty records for testing');

  } catch (error) {
    console.error('💥 Ingestion failed:', error);
    process.exit(1);
  }
}

// Start timer
const startTime = Date.now();

// Run main function
main();
