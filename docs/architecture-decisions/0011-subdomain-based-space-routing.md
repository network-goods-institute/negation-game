# ADR-011: Subdomain-Based Space Routing

## Date: 2025-03-17

## Status

Accepted

## Context

As the Negation Game platform evolved to support multiple communities (spaces), we needed an intuitive way for users to access these spaces. The traditional approach of using path-based routing like `/s/[space]` works for general navigation but lacks branding potential and user-friendly URLs for sharing.

Spaces in the Negation Game are distinct communities, each with their own discussions and content. Providing a dedicated subdomain for each space (e.g., `scroll.negationgame.com`) offers several advantages:

1. Brand identity - Each space gets its own identifiable URL
2. Improved sharing - Shorter, more memorable URLs for sharing
3. SEO benefits - Potential for better search engine visibility
4. Clear context - Users immediately know which space they're in
5. Future extensibility - Potential for space-specific customizations

However, implementing subdomain routing comes with technical challenges:

1. Additional DNS configuration requirements
2. Middleware complexity for routing logic
3. Extra handling for cookies and authentication across subdomains
4. Need for maintaining a list of valid spaces
5. Edge runtime limitations for database access

## Decision

We've implemented a subdomain-based routing system with the following characteristics:

1. **Space-specific subdomains**: Each space can be accessed via its own subdomain (e.g., `scroll.negationgame.com`)

2. **Centralized routing**: All space subdomains redirect to the main application at `play.negationgame.com/s/[space]`

3. **Static space validation**: A pre-generated list of valid spaces (`VALID_SPACE_IDS`) is used to validate subdomains without requiring database access in the middleware

4. **Reserved subdomains**: Certain subdomains like "www", "api", "play", and "admin" are blacklisted from space routing

5. **Query parameter preservation**: URL query parameters are preserved during subdomain redirects

6. **Space header propagation**: The current space is propagated via a custom header (`SPACE_HEADER`) throughout the request lifecycle

7. **Default space handling**: Paths without explicit space context are automatically routed to a default space

## Implementation

The implementation relies on Next.js middleware with these key components:

1. A matcher configuration that captures all relevant routes
2. A subdomain detection mechanism that identifies space-specific subdomains
3. Routing logic that redirects to the appropriate path with preserved parameters
4. A static list of valid spaces that's updated via a script when spaces are added/removed
5. Special handling for profile routes and other non-space-specific paths

## Consequences

### Positive

- Users can access spaces via intuitive, branded URLs
- Sharing links to specific spaces is more user-friendly
- Space context is clearly communicated through the URL
- The implementation works with Next.js Edge runtime
- Flexible routing allows for special cases and future extensions

### Negative

- Additional DNS configuration required for each new space
- Need to maintain a static list of valid spaces
- Potential cookie/authentication issues across subdomains
- More complex routing logic to test and maintain
- All traffic still ultimately routes through the main application

## Mitigation Strategy

1. **Space List Maintenance**: A script (`scripts/update-spaces-list.ts`) automatically updates the static spaces list
2. **Comprehensive Testing**: Unit tests for the middleware cover various routing scenarios
3. **Fallback Mechanism**: Invalid subdomains gracefully redirect to the main site
4. **Documentation**: Clear documentation for adding new spaces

## Future Considerations

As the platform grows, we may consider:

1. Space-specific configurations or customizations per subdomain
2. Performance optimizations like edge caching for space-specific content
3. Custom domains for spaces beyond subdomains
4. More sophisticated routing based on user preferences or history 