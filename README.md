[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=24219588&assignment_repo_type=AssignmentRepo)


# Community Library Management System

## System Overview
The **Community Library Management System** is an interactive web application designed to manage catalog items, handle user reservations, track book copy availability, and process search filtering. Built using modern JavaScript (ES Modules) and rendered dynamically via DOM manipulation, the application supports client-side data persistence with `localStorage` and includes an automated Jest test suite.

---

## Critical Errors Found

| # | Bug Description | Severity |
|---|---|---|
| 1 | `SyntaxError`: Export statements nested inside `DOMContentLoaded` | Critical |
| 2 | `ReferenceError`: `renderBookCatalogue` undefined in unit test exports | Critical |
| 3 | `ReferenceError`: `tabs` variable referenced before declaration in `setupEventListeners` | Critical |
| 4 | Unhandled DOM selection returning `null` when search inputs were absent | Critical |
| 5 | Missing event handling on form submission resulting in unexpected page refreshes | High |
| 6 | Unhandled JSON parsing syntax errors on corrupted `localStorage` records | High |
| 7 | Global variable scope pollution using undeclared `var` bindings | High |
| 8 | Broken category filter logic when selecting default option `"all"` | High |
| 9 | Mutation of original `books` array references during array search operations | High |
| 10 | Unhandled `QuotaExceededError` during `localStorage.setItem` execution | High |
| 11 | `TypeError` thrown when passing `null` or `undefined` arrays into rendering functions | Medium |
| 12 | Case-sensitive search matching causing exact string failure on input queries | Medium |
| 13 | Missing ISBN data validation when creating dynamic DOM elements | Medium |
| 14 | Dynamic event listeners failing on newly appended DOM elements | Medium |
| 15 | Duplicate event listeners attached on re-render triggers | Medium |
| 16 | Missing fallback handling for missing book author/title properties | Low |
| 17 | Synchronous blocking loop operations on catalog filtering | Low |
| 18 | `beforeEach` Jest hook placed inside empty `describe` test suite | Low |
| 19 | Missing `preventDefault()` on tab navigation links | Low |
| 20 | Incomplete test coverage on edge cases and failure scenarios | Low |

---

## Fixes Implemented

### 1. Module Scoping & Lifecycle Decoupling
* Extracted functions from `DOMContentLoaded` to top-level named exports (`export function ...`), resolving ES Module syntax errors.
* Wrapped initialization routines inside `DOMContentLoaded` listeners to prevent null DOM references during load.

### 2. Defensive Programming & Error Handling
* Added `try...catch` blocks around `JSON.parse` and `localStorage` state operations.
* Added fallback parameter defaults (`bookList = []`) to prevent `TypeError` exceptions during array operations.

### 3. Event Handling & Filtering
* Implemented lower-case query normalization (`.toLowerCase().trim()`) for non-sensitive case matching.
* Attached unified event handlers for form submit events and category dropdown updates.

---

## Modern Features Added (ES6+)

* **ES Modules:** Explicit `import` / `export` named bindings for browser and Jest modularity.
* **Destructuring & Default Parameters:** Extracted keys directly (`const { title, author, isbn } = book`) with safe defaults.
* **Template Literals:** Multi-line HTML dynamic card string interpolations.
* **Array Iteration Methods:** Modern high-order functions (`.filter()`, `.forEach()`, `.some()`).
* **Block-Scoped Variables:** Migrated legacy `var` declarations entirely to `let` and `const`.

---

## Architecture Improvements

* **Top-Level Export Pattern:** Decoupled pure rendering logic from DOM execution hooks, enabling headless unit testing in JSDOM.
* **Event Delegation:** Streamlined dynamically created event targets without duplicating memory bindings.
* **Separation of Concerns:** Separated business logic (`src/library.js`) from UI manipulation handlers (`src/ui.js`).

---

## Installation and Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/library-system.git](https://github.com/your-username/library-system.git)
   cd library-system