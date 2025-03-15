# ADR-010: Viewpoints to Rationales Client-Side Renaming

## Date: 2025-03-14

## Status: Accepted

## Context:

The application initially used the term "viewpoints" throughout both the user interface and internal code structure. However, user and client feedback indicated that this term was not as intuitive or descriptive as it could be for the feature's actual purpose. 

"Rationales" was determined to be a more user-friendly and accurate description of what these entities represent - a structured explanation of reasoning or arguments. This term better conveys the purpose of the feature to users and aligns with its function within the negation game.

However, a complete renaming across the entire codebase would require:
1. Changing database table names
2. Refactoring multiple server actions and queries
3. Updating backend logic and schema definitions
4. Modifying numerous internal API endpoints
5. Making extensive changes to type definitions

This scale of refactoring would introduce significant risk and require substantial development resources that could otherwise be used for new features.

## Decision:

We have decided to:

1. Rename "viewpoints" to "rationales" in all client-facing parts of the application:
   - User interface components and text
   - URL paths visible to users
   - Documentation and user guides
   - Public API specifications

2. Preserve the term "viewpoints" in internal code structures:
   - Database table names (viewpointsTable)
   - Internal type definitions and interfaces
   - Server-side code and business logic
   - Internal API implementations

3. Implement a middleware layer that handles URL path translation:
   - Automatically redirect paths containing "/viewpoint/" to "/rationale/"
   - Ensure bookmarks and shared links continue to work
   - Maintain backward compatibility with existing integrations

4. Apply consistent naming standards in new code:
   - Use "rationale" in all new user-facing features and documentation
   - Maintain "viewpoint" terminology when extending existing internal code

## Consequences:

### Positive:
- Improved user experience with more intuitive terminology
- No disruption to database schema or existing data
- Minimal risk compared to a full codebase refactor
- Ability to make the change incrementally
- Continued compatibility with existing links and bookmarks
- Preserved development velocity for new features

### Negative:
- Cognitive overhead for developers who must maintain awareness of the dual terminology
- Some inconsistency in the codebase between client and server code
- Additional middleware complexity to handle path translation
- Need for documentation to clarify the terminology difference for new developers
- Potential confusion in logging or debugging when tracing issues across the stack

### Mitigation:
- Clear code comments and documentation explaining the terminology difference
- Consistent test coverage for the middleware translation layer
- Standardized patterns for handling the terminology difference in new code
- Comments in server-side code noting the client-facing terminology

## Future Considerations:

While this approach allows us to make the change with minimal disruption, we may consider a more comprehensive refactoring as part of a future major version update. This would be evaluated based on:

1. Development resources available
2. Stability of the schema and related components
3. Whether the dual terminology continues to cause any significant developer friction

Until then, this solution provides an effective balance between user experience improvements and development practicality. 