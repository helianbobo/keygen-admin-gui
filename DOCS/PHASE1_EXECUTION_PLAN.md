# Phase 1 Execution Plan: Keygen Admin GUI

This document breaks down Phase 1 into specific, executable tasks for the development of the Keygen Admin GUI.

## Roadmap Overview

Phase 1 focuses on the **Core Data Flow**, establishing the foundation from authentication to machine management.

---

## Task 1: Foundation & Project Setup
*Goal: Initialize the codebase and core layout.*

- [ ] **1.1 Next.js Setup**: Initialize Next.js 14+ (App Router) with TypeScript.
- [ ] **1.2 UI Components**: Install Shadcn UI and configure Tailwind CSS themes (based on AGENTS.md).
- [ ] **1.3 Layout Infrastructure**: Create the `RootLayout` with a persistent Sidebar and Header.
- [ ] **1.4 API Client (Axios/Fetch)**: Set up a base API client that handles the Keygen Account ID and Admin Token.

## Task 2: Authentication (The Gateway)
*Goal: Secure access to the admin dashboard.*

- [ ] **2.1 Login Page**: Implement the login interface (Account ID, Admin Token, Custom URL).
- [ ] **2.2 Session Persistence**: Implement secure storage (Session/LocalStorage) for credentials.
- [ ] **2.3 Auth Middleware/Guard**: Redirect unauthenticated users to the login page.
- [ ] **2.4 Connection Test**: Add a "Validate Connection" logic to verify credentials upon login.

## Task 3: Product & Policy Management (The Blueprint)
*Goal: Manage the hierarchy of licenses.*

- [ ] **3.1 Product List**: Build the page to list all products (`/v1/accounts/{id}/products`).
- [ ] **3.2 Policy List**: Build the page to list policies, grouped or filtered by product.
- [ ] **3.3 Policy Detail/Editor**: Create a form to view and edit policy attributes (`maxMachines`, `duration`, `requireCheckin`).
- [ ] **3.4 Product Detail**: Basic view showing metadata and associated policies.

## Task 4: User Management (The Recipient)
*Goal: Manage developer accounts.*

- [ ] **4.1 User List**: Implement a searchable/paginated list of users.
- [ ] **4.2 Create User**: Modal/Page for adding new users to the account.
- [ ] **4.3 User Profile**: View showing user details and a list of licenses they currently hold.

## Task 5: License Management (The Core)
*Goal: Full lifecycle management of licenses.*

- [ ] **5.1 License Dashboard**: List all licenses with status filters (Active, Expired, Suspended).
- [ ] **5.2 License Issuance Flow**: Multi-step flow to select User -> Policy -> Metadata -> Generate.
- [ ] **5.3 License Detail View**: 
    - Adjust expiration date.
    - Toggle status (Suspend/Resume).
    - Manage entitlements.
    - View linked machines.

## Task 6: Machine Management (The Edge)
*Goal: Visibility and control over activated hardware.*

- [ ] **6.1 Machine List**: Global view of all activated machines.
- [ ] **6.2 Machine Detail**: View platform info and hardware fingerprints.
- [ ] **6.3 Remote Deactivation**: Ability to deactivate/delete a machine instance.

---

## Dependencies & Priority
1. **P0 (Critical)**: Task 1 (Setup) & Task 2 (Auth). No work can proceed without these.
2. **P1 (High)**: Task 3 (Products/Policies) & Task 5 (Licenses). These are the core value drivers.
3. **P2 (Medium)**: Task 4 (Users) & Task 6 (Machines). Necessary for complete lifecycle management.

## Confirmation Criteria
- [ ] All API calls use the Admin Token.
- [ ] Navigation is functional across all modules.
- [ ] UI follows the Shadcn/Minimalist aesthetic defined in `AGENTS.md`.
