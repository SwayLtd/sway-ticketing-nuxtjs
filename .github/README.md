# GitHub Copilot Configuration

This directory contains all GitHub Copilot configuration files for the Sway Ticketing project.

## Configuration Files

### Core Instructions

- **`copilot-instructions.md`** - Main repository instructions (Nuxt 3 + Tailwind + daisyUI)
- **`general-coding.instructions.md`** - General coding standards and naming conventions
- **`typescript-vue-nuxt.instructions.md`** - TypeScript, Vue, and Nuxt specific guidelines
- **`.instructions.md`** - Advanced TypeScript patterns and standards

### Prompts Directory (`./prompts/`)

- **`api-security-review.prompt.md`** - Security review template for REST APIs
- **`README.md`** - Documentation for all prompt files

## How It Works

### Automatic Detection

GitHub Copilot automatically detects and applies:

- Repository instructions from `copilot-instructions.md`
- File-pattern-specific instructions from `*.instructions.md` files
- Coding standards based on file extensions

### Manual Usage

Use prompts manually in chat:

```text
#api-security-review
#codebase
/explain @workspace
```

### File Patterns

| File | Applies To | Purpose |
|------|------------|---------|
| `copilot-instructions.md` | All conversations | Project context and preferences |
| `general-coding.instructions.md` | `**` (all files) | Naming conventions, error handling |
| `typescript-vue-nuxt.instructions.md` | `**/*.ts,**/*.tsx,**/*.vue` | Framework-specific patterns |
| `.instructions.md` | `**/*.ts,**/*.tsx` | Advanced TypeScript only |

## VS Code Configuration

Required settings in `.vscode/settings.json`:

```json
{
  "github.copilot.chat.codeGeneration.useInstructionFiles": true,
  "github.copilot.chat.codesearch.enabled": true,
  "github.copilot.chat.instructionFiles.patterns": [
    ".github/**/*.instructions.md",
    ".github/prompts/**/*.md"
  ]
}
```

## Stack Context

Copilot knows this project uses:

- **Framework:** Nuxt 3 (Vue 3)
- **Styling:** Tailwind CSS v4 + daisyUI
- **Language:** TypeScript
- **Database:** Supabase
- **Payments:** Stripe
- **Deployment:** Netlify
