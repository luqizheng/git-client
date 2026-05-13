# Git Client

A desktop Git client built with Tauri + Vue 3 + TypeScript.

## Features

- **Commit Graph** - Visual commit history with branch visualization
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

## License

ISC
