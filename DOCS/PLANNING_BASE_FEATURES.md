# Planning: Keygen Admin GUI Base Features

This document outlines the functional modules and UI interfaces for the Keygen Admin GUI, specifically addressing the requirements for selling SDKs to developers with machine and device restrictions.

## 1. Requirement Mapping (Keygen.sh Implementation)

| Requirement | Keygen.sh Implementation | Details |
|-------------|--------------------------|---------|
| **License Developers** | `licenses` resource | Core resource for granting access. |
| **Restrict Machine Counts** | `maxMachines` attribute | Set on `policies` (default) or overridden on `licenses`. |
| **Restrict Usage Duration** | `duration` or `expiry` | `duration` on `policies` (relative) or `expiry` on `licenses` (absolute). |
| **Restrict SenzeBand2 Count** | `metadata` + `entitlements` | Use `metadata` (e.g., `senzeBand2Limit: 5`) for numeric limits and `entitlements` (e.g., `feature:senzeband2`) for access control. |

## 2. Proposed UI Modules

### 2.1 Authentication & Connection
- **Login Page**: 
  - Fields: Keygen Account ID, Admin API Token.
  - Option to specify custom API URL (for self-hosted/enterprise Keygen).
  - Secure session management (persist token in memory/session storage).

### 2.2 Dashboard (Overview)
- Health metrics for the licensing ecosystem.
- Charts for:
  - Total Active vs. Expired Licenses.
  - Recent Machine Activations.
  - User growth.
- Quick action buttons (Issue License, Create Product).

### 2.3 Product Management
- **Product List**: Overview of all SDK products.
- **Product Detail**:
  - Configuration (Name, Code, Platforms).
  - Associated Policies.
  - Linked Licenses.
- **Create/Edit Product**: Form for product attributes.

### 2.4 Policy Management (The "Plan" Definition)
- **Policy List**: Grouped by Product.
- **Policy Editor**:
  - Name (e.g., "Standard SDK Plan", "Enterprise Plan").
  - **Machine Limit**: Input for `maxMachines`.
  - **Duration**: Input for `duration` (in seconds/days).
  - **Entitlements**: Multi-select for features (including `SenzeBand2 Access`).
  - **Expiration Strategy**: (RENEW, RESTRICT, etc.).

### 2.5 License Management (Issuance & Lifecycle)
- **License List**: Searchable by key, user email, or metadata.
- **License Issuance**:
  - Select User.
  - Select Policy.
  - Set custom `metadata` (e.g., `senzeBand2Limit`).
- **License Detail**:
  - Status management (Active, Suspended, Revoked).
  - Manual expiry adjustment.
  - List of activated Machines.
  - Edit Metadata/Entitlements.

### 2.6 User Management
- **User List**: All developers registered in the system.
- **User Detail**:
  - Personal info.
  - List of owned licenses.
  - Quick "Issue License" to this user.

### 2.7 Machine Management
- **Machine List**: Global view of all activated SDK installations.
- **Machine Detail**:
  - Fingerprint and Platform info.
  - Linked License/User.
  - Remote Deactivation.

## 3. Implementation Priorities (Phase 1)

Phase 1 focuses on establishing the core data flow, following the strict resource hierarchy of Keygen.sh. Each step serves as a dependency for the next, ensuring a stable and logical development path.

1. **Authentication (Foundation)**: Implement secure credential management using Keygen Account ID and Admin API Token. This layer is the gateway for all subsequent interactions with the Keygen API.
2. **Products & Policies**: Establish the product catalog and policy definitions. Policies act as the "blueprints" for licenses; defining them first ensures that license issuance has the necessary constraints (machine limits, durations, and entitlements) to reference.
3. **User Management**: Develop the interface for managing developer accounts. Since every license must be attributed to a user for tracking and support, user management is a critical prerequisite for the issuance flow.
4. **License Management & Issuance**: Implement the central resource of the system. This module enables the issuance of licenses tied to specific Users and Policies, including the configuration of custom metadata for granular control (e.g., `senzeBand2Limit`).
5. **Machine Management**: Complete the lifecycle by providing visibility into activated hardware. This allows for the verification of license usage and the ability to remotely manage or deactivate specific machine instances.

## 4. Design Guidelines (Project Soul)
- **Minimalist**: Focus on data clarity.
- **Responsive**: Tailwind CSS for mobile/desktop compatibility.
- **Interactive**: React Query for real-time status updates without full page reloads.
