---
project_name: 'frontend_react'
user_name: 'Mr_Quiz'
date: '2026-02-07T07:21:42Z'
sections_completed: ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'style_rules', 'workflow_rules', 'anti_patterns']
status: 'complete'
rule_count: 22
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Core**: React 18.2.0, React-DOM 18.2.0
- **Routing**: React Router DOM 6.3.0
- **Styling**: 
    - Styled Components 5.3.5
    - Sass 1.54.0 (compiled from `src/assets/scss/index.scss` to `src/assets/index.css`)
- **State/Auth**: Custom `AuthProvider` in `src/utils/auth/index.jsx`
- **Build Tool**: React Scripts 5.0.1 (Create React App)

## Critical Implementation Rules

### Language-Specific Rules (JavaScript)

- **Extensions**: Use `.jsx` for all files containing React components.
- **Syntax**: Use ES6+ syntax (arrow functions, destructuring, template literals).
- **Type Checking**: Use `prop-types` for component property validation.
- **Imports**: Use ESM `import`/`export`. Component imports are typically done without the `.jsx` extension.
- **Async**: Use `async`/`await` for asynchronous operations; fallback to `.then()` only when necessary for specific patterns.

### Framework-Specific Rules (React)

- **Component Patterns**: 
    - Use Functional Components with Hooks.
    - **Self-Contained Folders**: Both Pages and complex Components must live in their own folder (e.g., `src/pages/Home/index.jsx` or `src/components/Header/index.jsx`).
- **Styling Boundary**:
    - **Sass**: Reserved for global variables, reset, and layout-level styling (grid/flex containers).
    - **Styled Components**: Used for component-specific styling and logic-driven styles (e.g., dynamic colors based on props).
- **State & Hooks**:
    - Use the Context API (via `AuthProvider`) for shared global state.
    - **Effect Safety**: Always provide an explicit dependency array to `useEffect`. Be extremely cautious with Context dependencies to avoid infinite re-render loops.
    - Standardize custom hooks naming: `use[Name]`.
- **Routage**: Managed centrally in `src/index.js` using React Router v6.

### Testing Rules

- **Framework**: Jest & React Testing Library.
- **File Naming**: Use `[FileName].test.js` or `[FileName].test.jsx`.
- **Organization**: Co-locate test files with the component they test.
- **Approach**: Focus on testing user behavior and accessibility over implementation details. Use `user-event` for interactions.

### Code Quality & Style Rules

- **Naming Conventions**: 
    - Use **PascalCase** for React components and pages (e.g., `Header.jsx`).
    - Use **camelCase** for variables, functions, and non-component files.
    - Use **kebab-case** for asset files and SCSS partials.
- **Documentation**:
    - Use JSDoc for complex utility functions.
    - Focus comments on the "Why" rather than the "How".
- **Structure**:
    - Keep components focused and small (ideally < 200 lines).
    - Separate complex logic into custom hooks or utility functions.

### Development Workflow Rules

- **Commits**: Use descriptive, prefixed commit messages (e.g., `feat:`, `fix:`, `refactor:`).
- **Verification**: Always run `npm run build` and `npm test` before considering a task complete.
- **Routing Integrity**: Ensure all new pages are correctly integrated into the central routing in `src/index.js`.
- **Project Structure**:
    - `src/components/`: Reusable UI components.
    - `src/pages/`: Page components, each in its own subfolder.
    - `src/assets/scss/`: Global and theme styles.
    - `src/utils/`: Shared utilities and logic.

### Critical Don't-Miss Rules

- **Anti-Patterns**: Avoid using `index` as a key in lists unless the list is static and has no unique IDs.
- **Security**: Never commit sensitive information (API keys, etc.) to the repository.
- **Performance**: Avoid unnecessary re-renders by memoizing expensive components or calculations if needed, but prioritize simple code first.

---

## Usage Guidelines

**For AI Agents:**

- Read this file before implementing any code
- Follow ALL rules exactly as documented
- When in doubt, prefer the more restrictive option
- Update this file if new patterns emerge

**For Humans:**

- Keep this file lean and focused on agent needs
- Update when technology stack changes
- Review quarterly for outdated rules
- Remove rules that become obvious over time

Last Updated: 2026-02-07T07:21:42Z
