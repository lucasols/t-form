# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

T-State Form is a React form library built on top of t-state. It provides strongly typed form management with validation, derived configurations, and array field support.

## Core Architecture

- **Main entry**: `src/main.ts` - exports the primary `useForm` hook and related utilities
- **Form state management**: `src/useFormState.ts` - provides the `useFormState` hook for consuming form data
- **Utilities**: `src/utils/` - contains helper functions for assertions, arrays, objects, hooks, and typing
- **Core dependencies**: Built on t-state for state management, uses immer for immutable updates

## Key Concepts

- **Typed Forms**: Forms are strongly typed based on initial configuration
- **Field States**: Each field tracks value, validation, touched state, loading state, and metadata
- **Dynamic Forms**: Support for dynamically adding/removing fields via `useDynamicForm`
- **Array Fields**: Special handling for array-type form fields with add/remove/toggle operations
- **Validation**: Supports simple field validation, advanced cross-field validation, and derived configurations

## Common Commands

### Development
- `pnpm test` - Run tests
- `pnpm test:ui` - Run tests with UI
- `pnpm test:update` - Update test snapshots
- `pnpm lint` - Run TypeScript check and ESLint
- `pnpm tsc` - Run TypeScript compiler
- `pnpm eslint` - Run ESLint only
- `pnpm eslint:fix` - Fix ESLint issues

### Build
- `pnpm build` - Full build (test + lint + build)
- `pnpm build:no-test` - Build without running tests
- `pnpm build-test` - Build test configuration

## Testing

- **Framework**: Vitest with React Testing Library
- **Test files**: Located in `tests/` directory
- **Coverage**: Tests cover form hooks, field validation, array operations, and configuration updates
- **Run single test**: `pnpm test <test-name>`

## Package Management

- Uses `pnpm` as package manager
- ESM module with TypeScript
- Peer dependencies: React 18.2.0+
- Main dependencies: t-state, immer

## Type Safety

- Strict TypeScript configuration with `noUncheckedIndexedAccess`
- Strong typing throughout the form system
- Type inference from initial form configuration
- No `any` types in implementation code