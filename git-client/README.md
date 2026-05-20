# Git Client

A desktop Git client built with Tauri + Vue 3 + TypeScript.

## Features

- **Commit Graph** - Visual commit history with branch visualization
- **Commit Graph Algorithms** - Straight/curved branch drawing algorithms (see [Commit Graph Drawing Algorithms](#commit-graph-drawing-algorithms))
- **Diff View** - Side-by-side file diff with syntax highlighting
- **Branch Management** - Create, switch, and manage branches
- **Remote Operations** - Pull, push, fetch with remote repositories
- **Dark/Light Theme** - Built-in theme support
- **Internationalization** - Multi-language support (EN/CN)

## Tech Stack

- **Frontend**: Vue 3, TypeScript, Vite, UnoCSS, Naive UI
- **Backend**: Rust, Tauri 2
- **State Management**: Pinia

## Development

### Prerequisites

- Node.js 18+
- Rust 1.70+
- pnpm (or npm/yarn)

### Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm tauri dev
```

### Build

```bash
# Build for production
pnpm tauri build
```

### Testing

```bash
pnpm test        # Run tests
pnpm test:watch  # Watch mode
pnpm test:ui     # UI mode
```

## Project Structure

```
git-client/
├── src/                    # Vue frontend
│   ├── components/         # UI components
│   ├── composables/       # Vue composables
│   ├── stores/            # Pinia stores
│   └── utils/             # Utilities
├── src-tauri/             # Rust backend
│   └── src/
│       ├── commands/      # Tauri commands
│       ├── services/      # Business logic
│       └── models/        # Data models
└── docs/                  # Documentation
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+L | Pull from remote |
| Ctrl+Shift+P | Push to remote |
| F5 | Refresh |

## Commit Graph Drawing Algorithms

This section documents the algorithms used for drawing commit graphs in this client.

### Overview

Drawing graphs is a complex topic, but commit graphs have several properties that simplify the problem:
- The graph is **directed and acyclic**
- Commits have **timestamps**

### Types of Graph Drawing Algorithms

Git clients use different approaches for drawing commit graphs:

| Client | One commit by row | Straight branches |
|--------|-------------------|-------------------|
| Git Cola | No | No |
| Git Extensions | Yes | No |
| Gitk | Yes | No |
| GitKraken | Yes | Yes |
| SmartGit | Yes | No |
| SourceTree | Yes | No |

This client uses **straight branches** for better branch visualization.

### Commit Sorting Algorithms

#### By Date

Simple sorting by author/committer date may fail when:
- `rebase` or `cherrypick` operations place older commits as children of newer ones
- Clocks are not synchronized across machines
- Dates are manually set

#### Topological Sort

Standard algorithm that ensures edges always go upward. Guarantees drawable graphs but may not preserve date order.

#### Temporal Topological Sort (Used in this project)

Combines topological sorting with committer dates:

```
procedure temporal_topological_sort(C)
    function dfs(c)
        if not c.explored
            c.explored = true
            for d in c.children
                dfs(d)
            c.i = i
            i = i + 1

    i = 0
    for c in C sorted from newest committer date to oldest
        dfs(c)
```

Properties:
- Outputs topological order
- Consistent results across runs
- Preserves committer date order when valid
- Time complexity: O(n log n + m)

### Placing Commits

Children are categorized as:
- **Branch children**: Continue or create branches (`d.parents[0] = c`)
- **Merge children**: End branches by merging (`d.parents[0] != c`)

#### Straight Branches Algorithm

Draws all commits of the same branch on the same column for easier branch visualization.

## License

ISC
