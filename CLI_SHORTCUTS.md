# FIR CLI Shortcuts

Quick reference for CLI commands. All commands can be run from the project root.

## Available Commands

### Basic IR command

```bash
pnpm ir --help              # Show all available commands
pnpm ir --version           # Show CLI version
```

### Validate IR

```bash
pnpm validate <input-file>

# Example:
pnpm validate examples/agency-dashboard/app.ir.json
```

### Canonicalize IR

```bash
pnpm canonicalize <input-file> <output-file>

# Example:
pnpm canonicalize examples/agency-dashboard/app.ir.json examples/agency-dashboard/app.canonical.ir.json
```

### Lint for Compatibility

```bash
pnpm lint-compat <input-file>

# Example:
pnpm lint-compat examples/agency-dashboard/app.ir.json
```

### Prove IR (Strict Mode Checks)

```bash
pnpm prove <input-file>

# Example:
pnpm prove examples/agency-dashboard/app.ir.json
```

### Render to Voice

```bash
pnpm render <input-file>

# Example:
pnpm render examples/agency-dashboard/app.ir.json
```

### Serve (Browser Preview)

```bash
pnpm serve <input-file>

# Example:
pnpm serve examples/agency-dashboard/app.ir.json
# Opens http://localhost:8080
```

## Long Form (if you need other adapters or options)

For full control, use the `ir` command directly:

```bash
pnpm ir <command> [options] <args>

# Example with different adapter:
pnpm ir render --adapter=someother examples/agency-dashboard/app.ir.json

# Serve with custom port:
pnpm ir serve --port 3000 examples/agency-dashboard/app.ir.json
```
