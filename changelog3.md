# Changelog - Deployment & Stabilization Sprint

## 🚀 Deployment Success
We have successfully deployed the application to Render! This sprint focused on resolving complex build-time errors and stabilizing the application for production.

### 🔧 Core Infrastructure Updates
*   **Next.js Downgrade (v16 → v14)**: We identified a critical bug in Next.js 15/16 related to static generation of error pages (`InvariantError: Expected workUnitAsyncStorage to have a store`). We downgraded to the stable **Next.js 14.2.18** to resolve this.
*   **React Downgrade (v19 → v18)**: Aligned React version with Next.js 14 requirements.
*   **Build Configuration**:
    *   Converted `next.config.ts` to `next.config.mjs` for better build compatibility.
    *   Enabled `output: 'standalone'` to optimize the app for containerized deployment on Render.
    *   Configured `package.json` scripts to correctly use the local Next.js binary via `npx`.

### Hz Client-Side Rendering Fixes
*   **NoSSR AppShell**: Created a `NoSSRAppShell` wrapper component. This ensures that the main application shell (which contains client-side authentication logic) is only rendered on the client, preventing crashes during the server-side build process.
*   **Dynamic Rendering**: Enforced `export const dynamic = 'force-dynamic'` in the root layout to opt-out of static optimization for authenticated routes, ensuring fresh data is always fetched.

### 🧹 Cleanup
*   Removed experimental `global-error.tsx` and `not-found.tsx` pages that were conflicting with the build process.
*   Resolved dependency conflicts with ESLint.

The application is now running on a stable, production-ready foundation! 🎉
