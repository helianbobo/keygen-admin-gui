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
1. **Auth Flow**: Login with Account ID + Token.
2. **Dashboard**: Basic metric cards.
3. **License Management**: Listing and viewing licenses (crucial for support).
4. **License Issuance**: Creating new licenses for developers.
5. **Metadata Support**: Implementing the UI for `senzeBand2Limit` in the license creation/edit forms.

## 4. Design Guidelines (Project Soul)
- **Minimalist**: Focus on data clarity.
- **Responsive**: Tailwind CSS for mobile/desktop compatibility.
- **Interactive**: React Query for real-time status updates without full page reloads.
