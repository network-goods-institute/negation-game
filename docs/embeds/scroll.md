# Negation Game × Scroll Integration

## Overview

Provides a comprehensive technical audit of the Negation Game integration with Scroll.io's Discourse forum. The integration enables embedding Negation Game rationales and topic discussions directly within Discourse forum posts via iframe embeds.

## Discourse Setup

### 1. Create Component
   - Admin → Customize → Themes → Install → Create New → Component
   - Name: "Negation Game Embed"
   - Add to current theme

### 2. Iframe Code

   **Body Section (Common → Body):**
   ```html
<script>
   function addIframeToPost() {
     const post1 = document.getElementById('post_1');
     
     if (post1) {
       const topicBody = post1.querySelector('.topic-body');
       
       if (topicBody) {
         if (topicBody.querySelector('.custom-iframe-container')) {
           return true;
         }
         
         const iframeContainer = document.createElement('div');
         iframeContainer.style.cssText = 'margin: 20px 0; border: 1px solid #ddd; border-radius: 5px; padding: 10px; background: white;';
         const postContent = post1.querySelector('.cooked');
         let sourceParam = '';
         
         if (postContent) {
           const links = postContent.querySelectorAll('a[href*="rationale"]');
           if (links.length > 0) {
             sourceParam = '?source=' + encodeURIComponent(links[0].href);
           } else {
             sourceParam = '?source=' + encodeURIComponent(window.location.href);
           }
         } else {
           sourceParam = '?source=' + encodeURIComponent(window.location.href);
         }

         // this is merely for my benefit, this can be hardcoded to the production url which is the else case
         if (window.location.hostname.includes('localhost')) {
          iframeContainer.innerHTML = '<iframe src="http://localhost:3001/embed/scroll/source' + sourceParam + '" width="100%" height="460" frameborder="0" referrerpolicy="unsafe-url" title="Negation Game Embed"></iframe>';
         } else {
          iframeContainer.innerHTML = '<iframe src="https://play.negationgame.com/embed/scroll/source' + sourceParam + '" width="100%" height="460" frameborder="0" referrerpolicy="unsafe-url" title="Negation Game Embed"></iframe>';
         }
         
         topicBody.appendChild(iframeContainer);
         return true;
       }
     }
     
     return false;
   }

   if (!addIframeToPost()) {
     let attempts = 0;
     const maxAttempts = 20;
     
     const interval = setInterval(() => {
       attempts++;
       
       if (addIframeToPost() || attempts >= maxAttempts) {
         clearInterval(interval);
       }
     }, 500);
   }
   </script>
   ```

### How the Discourse Integration Works

- Iframe Placement: Shows iframe after the first post on every topic page
- Dynamic Loading: Uses polling because Discourse loads posts dynamically - `DOMContentLoaded` fires too early
- Retry Logic: Tries every 500ms for 10 seconds max to handle async loading
- Referrer Policy: Uses `referrerpolicy="unsafe-url"` to pass the full topic URL instead of just the root domain
- Environment Detection: Automatically switches between localhost (development) and production URLs
- Duplicate Prevention: Checks for existing iframe before creating new ones

### What You Get

- Iframe embedded after first post only
- Responsive design: 100% width, 460px height  
- Styled container with border and rounded corners
- Works on all topic pages automatically
- No duplicate iframes (prevents multiple embeds)

# Technical Architecture

## System Overview

The Negation Game embed system provides three types of embeddable content:

1. **Source/Scroll Embed** (`/embed/scroll/source`): Auto-detects and displays appropriate content based on a Discourse forum URL
2. **Topic Embed** (`/embed/topic/[topicId]`): Shows all rationales for a specific topic
3. **Rationale Embed** (`/embed/rationale/[rationaleId]`): Displays a single rationale's argument graph

## Security Architecture

### Content Security Policy (CSP)
The middleware (`src/middleware.ts`) applies specific CSP headers for embed routes:
```
frame-ancestors *; 
default-src 'self'; 
script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
font-src 'self' https://fonts.gstatic.com; 
img-src 'self' data: blob: https:; 
connect-src 'self' https://auth.privy.io https://*.rpc.privy.systems https://explorer-api.walletconnect.com https://api.web3modal.org https://pulse.walletconnect.org https://privy.play.negationgame.com https://privy.negationgame.com https://www.googletagmanager.com https://www.google-analytics.com https://va.vercel-analytics.com https://va.vercel-scripts.com https://vitals.vercel-insights.com wss://relay.walletconnect.com wss://relay.walletconnect.org wss://www.walletlink.org;
```

### CORS Configuration
- **Allowed Origins**: `forum.scroll.io`, `negationgame.com`, `play.negationgame.com`, `scroll.negationgame.com`, localhost URLs
- **Methods**: GET, POST, OPTIONS
- **Headers**: Content-Type
- **Origin Validation**: Implemented in `isValidOrigin()` function

### URL Validation
The `isValidScrollUrl()` function in `topic-detector` API validates source URLs:
- **Production**: Only `forum.scroll.io` allowed
- **Development**: `localhost` and `127.0.0.1` allowed
- **Protocol**: Only HTTP/HTTPS permitted

## API Endpoints

### 1. Topic Detector API (`/api/embed/topic-detector`)
**Purpose**: Main entry point that determines what content to display for a given source URL

**Security Features**:
- URL validation via `isValidScrollUrl()`
- CORS origin checking
- Input sanitization
- Error message sanitization in production

**Request Flow**:
1. Validates source URL parameter
2. Checks for existing rationale match in URL path
3. Validates source URL domain
4. Queries database for existing topic
5. Returns found content or "not found" response

**Response Types**:
- Rationale found: `{found: true, type: "rationale", rationaleId: string}`
- Topic found: `{found: true, type: "topic", topicId: string, hasRationales: boolean}`
- Not found: `{found: false, type: "topic", topicId: null, hasRationales: false}`

### 2. Create Topic API (`/api/embed/create-topic`)
**Purpose**: Creates new topics when content doesn't exist

**Security Features**:
- Rate limiting via `checkRateLimit()` (20 requests per hour per IP)
- URL validation
- Title sanitization (removes HTML/JS injection, limits length)
- Input validation

**Request Flow**:
1. Validates CORS origin
2. Applies rate limiting
3. Validates and sanitizes source URL and title
4. Creates topic in database
5. Returns new topic ID

### 3. Auth API (`/api/embed/auth`)
**Purpose**: Authentication for embed test page (development only)

**Security Features**:
- Environment variable password (`EMBED_TEST_PASSWORD`)
- Origin validation
- POST-only endpoint

### 4. Rationales API (`/api/embed/rationales/[topicId]`)
**Purpose**: Returns all rationales for a specific topic

**Security Features**:
- CORS validation
- Topic ID validation
- Public data only (no user-specific information)

## File Architecture

### 1. API Layer (`src/app/api/embed/`)
- **`auth/route.ts`**: Test authentication endpoint
- **`topic-detector/route.ts`**: Main content detection logic
- **`create-topic/route.ts`**: Topic creation with rate limiting
- **`rationales/[topicId]/route.ts`**: Topic-specific rationale data

### 2. Page Components (`src/app/embed/`)
- **`scroll/source/page.tsx`**: Entry point for auto-detection embed
- **`topic/[topicId]/page.tsx`**: Topic list embed page
- **`rationale/[rationaleId]/page.tsx`**: Single rationale embed page
- **`test/page.tsx`**: Development testing interface
- **`layout.tsx`**: Shared embed layout (removes main navigation)

### 3. Client Components
- **`ScrollSourceEmbedClient.tsx`**: Handles auto-detection flow and topic creation
- **`TopicEmbedClient.tsx`**: Displays topic rationales and handles selection
- **`RationaleEmbedClient.tsx`**: Renders argument graph with interactions
- **`EmbedTestClient.tsx`**: Development testing interface with authentication

### 4. Server Actions (`src/actions/`)
- **`viewpoints/fetchViewpoint.ts`**: Contains `fetchViewpointForEmbed()`
- **`topics/fetchTopicById.ts`**: Topic data retrieval
- **`viewpoints/fetchViewpointsByTopic.ts`**: Topic-associated rationales
- **`points/fetchPoints.ts`**: Argument graph node data
- **`viewpoints/trackViewpointView.ts`**: Analytics tracking

### 5. Database Schema
- **`topicsTable.ts`**: Topics with `discourseUrl` field for linking
- **`viewpointsTable.ts`**: Rationales (internally called viewpoints)
- **`pointsTable.ts`**: Individual argument points
- **`rateLimitsTable.ts`**: Rate limiting storage
- **`viewpointInteractionsTable.ts`**: View/copy tracking

### 6. Security & Utilities
- **`src/lib/security/headers.ts`**: Secure error response generation
- **`src/lib/rateLimit.ts`**: Rate limiting implementation
- **`src/middleware.ts`**: CSP headers and iframe permissions for embeds

## Data Flow

### Source/Scroll Embed Flow
1. **Discourse Forum**: JavaScript injects iframe with source URL
2. **Page Load**: `scroll/source/page.tsx` extracts source from params or referer
3. **Client Component**: `ScrollSourceEmbedClient.tsx` calls topic-detector API
4. **Topic Detection**: API checks database for existing content
5. **Content Display**: 
   - If rationale exists: Redirect to rationale embed
   - If topic exists: Redirect to topic embed  
   - If nothing exists: Show "Create Topic" prompt
6. **Topic Creation**: User can create new topic via create-topic API

### Topic Embed Flow
1. **Load Topic**: Fetch topic data and associated rationales
2. **Display List**: Show rationales with thumbnails and stats
3. **User Selection**: Click loads rationale in nested iframe
4. **Analytics**: Track views and interactions

### Rationale Embed Flow
1. **Load Rationale**: Fetch complete argument graph data
2. **Render Graph**: Display points and connections visually
3. **Interactions**: Hover shows point content, click for details
4. **Share Features**: Generate embed codes and links

## Rate Limiting

**Implementation**: IP-based rate limiting using database storage
**Limits**: 20 requests per hour for topic creation
**Cleanup**: Automatic cleanup job removes expired rate limit entries
**Bypass**: No authentication bypass - applies to all users

## Error Handling

**Client-Side**: 
- Network error detection and retry logic
- Graceful fallbacks for API failures
- User-friendly error messages

**Server-Side**:
- Input validation with clear error responses
- Rate limit exceeded notifications
- Database error handling with fallbacks