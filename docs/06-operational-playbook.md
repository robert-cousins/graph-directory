# Operational Playbook

## Publishing a Business

1. Insert or migrate business
2. Status = pending_review
3. Verify credential (set verified=true)
4. Run `check_publication_requirements`
5. Set status = published

## Debugging Checklist

- Is the business published?
- Does it appear in `published_businesses`?
- Are services and areas attached?
- Is credential verified?

## Common Failure Modes

- Missing service area
- Unverified license
- Filtering on legacy columns
- Client-side state divergence

All are intentional guardrails.
