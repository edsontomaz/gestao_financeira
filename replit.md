# FinanceApp - Personal Finance Management

## Overview

FinanceApp is a personal finance management application built for tracking income and expenses. Users can record transactions with payment methods, card operators, and categories, then view summaries and reports with visual charts. The application is designed for Portuguese (Brazilian) users with a clean, responsive interface supporting light and dark themes.

## Key Features

- **Multi-Profile Support**: Two profiles (Edson and Taís) with completely separate data storage
- **Transaction Management**: Create, edit, and delete income/expense transactions
- **Payment Methods**: Credit card, debit card, PIX, and cash
- **Card Operators**: Santander, C6, Nubank, Porto, Mercado Pago, Itaú, Bradesco, etc.
- **Categories**: Income (Salary, Freelance, Investments, etc.) and Expense (Food, Transport, Health, etc.)
- **Installment Support**: Credit card purchases can be split into up to 24 monthly installments with automatic future transaction creation
- **Period Filters**: Filter transactions by This Month, Last Month, Last 3 Months, This Year, or Next Month
- **Visual Reports**: Pie charts for payment methods/operators, bar charts for categories
- **Excel Import/Export**: Export transactions to Excel or import from existing files with Portuguese-English label translation and automatic duplicate detection

## App Structure (3 Pages)

The app is organized into three separate pages with bottom navigation:

1. **Resumo** (`/`): Summary cards showing Receitas, Despesas, and Saldo + Visual Reports
2. **Nova Transação** (`/nova-transacao`): Form for adding new transactions
3. **Histórico** (`/historico`): Import/Export, OneDrive sync, and Transaction list

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Zod validation

The frontend follows a component-based architecture with:
- Pages in `client/src/pages/` (dashboard, not-found)
- Reusable components in `client/src/components/`
- UI primitives in `client/src/components/ui/`
- Custom hooks in `client/src/hooks/`
- Utility functions in `client/src/lib/`

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **Language**: TypeScript with ES Modules
- **API Design**: RESTful endpoints under `/api/*`
- **Build Tool**: esbuild for server bundling, Vite for client

The server structure includes:
- `server/index.ts` - Application entry point
- `server/routes.ts` - API route definitions
- `server/storage.ts` - Data storage abstraction layer
- `server/static.ts` - Static file serving for production
- `server/vite.ts` - Vite dev server integration

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in `shared/schema.ts` using Drizzle schema syntax
- **Validation**: Zod schemas generated from Drizzle schemas via drizzle-zod
- **Current Storage**: In-memory storage (`MemStorage` class) with interface for database migration

The storage layer uses an interface pattern (`IStorage`) allowing easy swap between in-memory and database implementations.

### Shared Code
The `shared/` directory contains code shared between client and server:
- Database schema definitions
- Type exports (User, Transaction, InsertTransaction)
- Enum definitions (payment methods, card operators, categories)
- Label mappings for UI display

### Build System
- Development: Vite with HMR for frontend, tsx for backend
- Production: Vite builds frontend to `dist/public`, esbuild bundles server to `dist/index.cjs`
- Database: Drizzle Kit for migrations (`npm run db:push`)

## PWA (Progressive Web App)

The application is configured as a PWA, allowing users to install it on mobile devices (Android and iOS) directly from the browser:

- **manifest.json**: App metadata, icons, and display settings
- **Service Worker (sw.js)**: Caches static assets and API responses for offline support
- **Install Prompt**: Shows installation banner for Android users; iOS users see instructions for "Add to Home Screen"

### Installation:
- **Android**: Users will see an "Install" button or browser prompt
- **iOS**: Users tap Share > "Add to Home Screen"

### Offline Support:
- Cached static assets (HTML, CSS, JS, icons)
- API responses cached with network-first strategy
- Navigation fallback to cached index.html for SPA routing

## Multi-Profile System

The application supports two user profiles (Edson and Taís) with complete data isolation:

- **Profile Selection**: Dropdown in header allows switching between profiles
- **Data Isolation**: Each profile has separate transactions, summaries, and reports
- **Profile Persistence**: Active profile stored in localStorage (default: "edson")
- **Security**: All API operations validate profile to prevent cross-profile data access

### Implementation:
- `client/src/contexts/profile-context.tsx` - React context for profile state
- `client/src/components/profile-selector.tsx` - UI component for profile switching
- Profile passed as query parameter in all API calls (`?profile=edson` or `?profile=tais`)

## OneDrive Integration

The application integrates with Microsoft OneDrive via the Replit connector for cloud backup and restore:

- **Backup**: Saves transactions to a JSON file in profile-specific folder (FinanceApp/Edson or FinanceApp/Tais)
- **Restore**: Downloads transactions from profile-specific OneDrive folder and replaces local data
- **Status Check**: Displays connection status and user info
- **Profile Isolation**: Each profile has its own backup file in OneDrive

### API Endpoints:
- `GET /api/onedrive/status` - Check connection status
- `POST /api/onedrive/backup?profile={profile}` - Backup transactions to OneDrive (profile-specific)
- `POST /api/onedrive/restore?profile={profile}` - Restore transactions from OneDrive (profile-specific)

### Files:
- `server/onedrive.ts` - OneDrive client with Microsoft Graph API
- `client/src/components/onedrive-sync.tsx` - UI component for backup/restore

## External Dependencies

### Database
- **PostgreSQL**: Primary database (configured via `DATABASE_URL` environment variable)
- **Drizzle Kit**: Schema migrations and database management
- **connect-pg-simple**: Session storage (available but not currently used)

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Recharts**: Chart library for financial reports
- **Embla Carousel**: Carousel functionality
- **date-fns**: Date formatting and manipulation
- **Lucide React**: Icon library

### Build & Development Tools
- **Vite**: Frontend build tool with React plugin
- **esbuild**: Server bundling
- **Tailwind CSS**: Utility-first CSS framework
- **TypeScript**: Type checking across the codebase

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Error overlay in development
- **@replit/vite-plugin-cartographer**: Replit integration
- **@replit/vite-plugin-dev-banner**: Development banner