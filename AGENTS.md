# Project Soul: Keygen Admin GUI

## Vision
A sleek, professional, and high-performance administrative dashboard for managing the Keygen licensing system. It should feel like a first-class citizen of the developer tools ecosystem—minimalist, data-driven, and highly intuitive.

## Vibe
- **Clean & Modern**: White/Light gray background with subtle shadows and rounded corners (following Shadcn UI aesthetic).
- **Security-First**: Clear indications of active sessions and permission scopes.
- **Informative**: The dashboard should provide at-a-glance health metrics of the licensing system.

## Technical Directives
- **Framework**: Next.js (App Router) with TypeScript.
- **Styling**: Tailwind CSS + Shadcn UI components.
- **State Management**: React Query for API data fetching and caching.
- **API Integration**: Communicate with `https://api.keygen.sh/v1` using the Admin Token provided during login.
- **Authentication**: A secure login page that accepts an Account ID and Admin Token (persisted in session/local storage for the session duration).

## Core Dashboard Metrics
- **Licenses**: Total count and status distribution (Active/Expired).
- **Machines**: Current activation count.
- **Users**: Total user base growth.
- **Products**: Overview of managed software products.

## Agent Instructions
- Maintain a consistent design language across all pages.
- Ensure responsive design for both desktop and tablet views.
- Use atomic commits with clear messages.
- Implement error handling for API calls (especially 401/403/429).
- **No Soulless Code**: Every component should be documented and follow the "Clean Code" principles.
