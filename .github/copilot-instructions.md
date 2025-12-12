# Copilot Instructions for Safari Connector

Safari Connector is an AI-powered marketplace for safari trips connecting travellers with tour operators in Tanzania and East Africa.

## Architecture Overview

**Tech Stack**: Next.js 16 (React 19), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth), OpenAI, Resend (email)

**Key Separation**: 
- Three user roles with distinct workflows: **Traveller** (client), **Operator** (vendor), **Admin** (moderation)
- Server components & pages use `supabaseServer()` from `src/lib/supabaseServer.ts` 
- Client components use `supabase` (browser client) from `src/lib/supabaseClient.ts`
- API routes use `supabaseAdmin` for elevated permissions (service role)

**Database Views & Tables**:
- Core tables: `trips`, `operators`, `operator_quotes`, `quote_requests`, `messages`, `leads`, `profiles`
- Views: `trips_view`, `operators_view`, `operator_inbox_view`, `operator_quotes` (join-based)
- Role checking: stored in user metadata (`app_metadata.role`) or `profiles.role` table

## Critical Developer Workflows

**Dev Server**: `npm run dev` (localhost:3000)
**Build**: `npm run build` (outputs standalone for DirectAdmin deployment)
**Lint**: `eslint` (basic config in `eslint.config.mjs`)

**Environment Setup**:
- `.env.local` must have: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_OPENAI_API_KEY`

## Project-Specific Patterns

### Authentication & Authorization
- **Client-side role check**: Load from `app_metadata.role` (Supabase auth) via `supabase.auth.getUser()`
- **Server-side role check**: `getSessionAndRole()` in `src/lib/auth.ts` queries `profiles.role` 
- **Admin identification**: Check email (`admin@safariconnector.com`) OR `app_metadata.role === "admin"`
- **Key function**: `requireUser()` in `src/lib/authServer.ts` — validates session before API operations

### Data Fetching Patterns
- **Server components**: Use `supabaseServer()` directly in async page/component bodies
- **Client components**: Use `useEffect` with `supabase.from().select()` + state management (see `src/app/traveller/quotes/[id]/page.tsx`)
- **Parallel queries**: Wrap multiple `.select()` calls in `Promise.all()` for better performance (see `src/app/page.tsx:50`)
- **Error logging**: Always log errors with context (table name, query details) for debugging

### Real-time Messaging
- **Pattern**: `supabase.channel(name).on('postgres_changes', {...}).subscribe()`
- **Examples**: `src/app/traveller/quotes/[id]/page.tsx`, `src/app/operators/inbox/page.tsx`
- **Cleanup**: Always unsubscribe on unmount via `supabase.removeChannel()`
- **Filter syntax**: Use `filter: "column=eq.value"` for targeted subscriptions

### API Routes (src/app/api/)
- **Structure**: Each route uses `requireUser()` for auth, returns `NextResponse.json()`
- **Email sending**: Use `Resend` client; check `RESEND_API_KEY` before instantiating
- **Error responses**: Return `{ error: "message" }` with appropriate status codes
- **Common endpoints**:
  - `/api/leads` — create/list leads (travellers & operators)
  - `/api/quotes/route.ts` — create quotes, list operator quotes
  - `/api/messages/[threadId]` — load and send messages in quote conversation threads
  - `/api/quote-requests` — traveller enquiries linked to trips

### Trip Management
- **Tables**: `trips` (main marketplace table), `operator_trips` (legacy, mostly unused)
- **Status flow**: Draft → Approved → Published (visible) 
- **Operator view**: `src/app/operators/trips/page.tsx` lists trips, `/operators/trips/[id]` edits
- **Image storage**: Hero image + 4 additional images; stored as URLs (likely Supabase Storage)

### Quote & Message Workflow
- **Quote Request**: Traveller submits `quote_requests` → Operator receives in inbox
- **Operator Response**: Creates `operator_quotes` with pricing, details → triggers message thread
- **Messaging**: `messages` table with `thread_id` (equals `quote_id`), `sender_role` (traveller/operator), real-time subscriptions
- **Status**: quote_requests have `status` (open/closed); operator_quotes have `status` (pending/accepted/declined)

### Component Conventions
- **Brand tokens**: Use `src/lib/brand.ts` for colors — primary: `#0B7A53` (jungle green), accent: `#F4A01C` (amber)
- **UI components**: `/src/components/ui/` has reusable `Button`, `Badge` etc. (check `src/components/` for imports)
- **Layout**: All pages wrapped by `src/app/layout.tsx` which loads `AuthProvider`, `Nav`, `Footer`
- **Styling**: Tailwind CSS + inline styles; CSS modules for page-specific styling (e.g., `home.module.css`)

## Integration Points

**Email**: Resend API sends quote notifications, welcome emails; check `RESEND_API_KEY` env var
**AI Features**: OpenAI integration for trip builder (see `src/app/ai-trip-builder/`); requires `NEXT_PUBLIC_OPENAI_API_KEY`
**Image Hosting**: Supabase Storage + Unsplash fallback (configured in `next.config.js`)
**Deployment**: Standalone Next.js build for DirectAdmin; set `output: "standalone"` in config

## Debugging Tips

- **Supabase RLS issues**: Check `src/lib/supabaseAdmin.ts` — uses service role for elevated queries
- **Auth redirect loops**: Verify `NEXT_PUBLIC_SUPABASE_URL` and keys are set correctly
- **Realtime not updating**: Ensure table has `publication: "realtime"` in Supabase dashboard
- **Type errors**: Check `src/types/` for shared types (`Operator`, `OperatorInboxItem`); casting with `as` is common for safety
- **Browser client vs Server**: Never use `supabaseServer()` in client components (no auth context); never import `supabaseAdmin` outside API routes
