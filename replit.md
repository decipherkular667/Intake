# Overview

IntakeAI is a health-focused mobile web application that helps users track their food intake, manage health conditions, and receive personalized nutritional insights. The app provides a comprehensive system for logging dietary information, analyzing potential conflicts with medications or medical conditions, and delivering AI-powered health recommendations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client application is built as a single-page React application using modern web technologies:
- **React 18** with TypeScript for component development
- **Vite** as the build tool and development server
- **Wouter** for client-side routing (lightweight alternative to React Router)
- **Tailwind CSS** with custom design system for styling
- **shadcn/ui** component library built on Radix UI primitives
- **TanStack Query** for server state management and API caching
- **React Hook Form** with Zod validation for form handling

The application follows a mobile-first responsive design pattern, optimized for mobile devices with a maximum width container and bottom navigation.

## Backend Architecture
The server implements a REST API using Node.js with Express:
- **Express.js** server with TypeScript
- **RESTful API** design with proper HTTP methods and status codes
- **Middleware-based architecture** for request logging and error handling
- **Development/Production environment** support with different configurations
- **In-memory storage** implementation with interfaces for future database migration

## Data Storage Solutions
Currently uses an in-memory storage system with well-defined interfaces:
- **IStorage interface** defining contracts for all data operations
- **MemStorage implementation** for development and testing
- **Database schema** defined using Drizzle ORM with PostgreSQL dialect
- **Ready for migration** to PostgreSQL with minimal code changes
- **Drizzle Kit** configuration for database migrations

## Database Schema Design
Three main entities with clear relationships:
- **Health Profiles**: User demographic and medical information
- **Food Entries**: Daily food intake logs with nutritional data
- **Insights**: AI-generated recommendations and conflict analysis

## API Architecture
Structured REST endpoints organized by domain:
- `/api/health-profile/*` - User health management
- `/api/food-entries/*` - Food logging and retrieval
- `/api/food/search` - Food database search
- `/api/insights/*` - Health insights and recommendations
- `/api/medical-conditions` - Medical condition lookup
- `/api/nutrients/*` - Nutritional information

## State Management Strategy
- **TanStack Query** for server state with automatic caching and invalidation
- **React Hook Form** for local form state management
- **Custom hooks** for domain-specific logic (useHealthProfile, useFoodDiary, useInsights)
- **React Context** for global UI state (toast notifications, tooltips)

## Component Architecture
- **Atomic design principles** with reusable UI components
- **Custom hook pattern** for business logic separation
- **Modal/dialog system** for detailed information display
- **Responsive navigation** with bottom tab bar for mobile optimization

# External Dependencies

## UI and Styling
- **@radix-ui/***: Accessible, unstyled UI primitives for complex components
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide React**: Consistent icon library
- **shadcn/ui**: Pre-built component library following design system

## Data Management
- **Drizzle ORM**: Type-safe database ORM with PostgreSQL support
- **@neondatabase/serverless**: Serverless PostgreSQL database driver
- **TanStack React Query**: Server state management and caching
- **Zod**: Runtime type validation and schema definition

## Development Tools
- **TypeScript**: Static type checking across the entire codebase
- **Vite**: Fast development server and optimized production builds
- **ESBuild**: Fast JavaScript bundling for server-side code

## External APIs
- **Food Database**: Local JSON-based food and nutrition database
- **Medical Conditions**: Comprehensive medical conditions reference data
- **Nutrient Information**: Detailed nutritional information with health benefits

## Authentication and Sessions
- **connect-pg-simple**: PostgreSQL session storage (configured but not actively used)
- **Express sessions**: Server-side session management setup

The application is designed with production scalability in mind, featuring proper error handling, logging, and database migration capabilities while maintaining a clean separation of concerns between client and server code.