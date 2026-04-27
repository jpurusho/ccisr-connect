<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# No code duplication
Shared logic (interpolation, var builders, type helpers, etc.) must live in a common utility file. Never copy the same logic into multiple pages or components — extract it first, then import it everywhere.
