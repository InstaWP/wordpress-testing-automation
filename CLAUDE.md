# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Build
```bash
npm run build
```
Compiles `src/action.js` into `dist/index.js` using @vercel/ncc. The dist file must be committed for the GitHub Action to work.

### Install Dependencies
```bash
npm install
```

### Testing
Currently no tests are implemented. The test script exits with error.

## Architecture

This is a GitHub Action for WordPress testing automation that integrates with InstaWP's API. The entire action logic lives in a single file: `src/action.js`.

### Key Components

1. **Action Entry Point** (`src/action.js`):
   - Validates inputs (GitHub token, InstaWP credentials)
   - Switches between `create-site-template` and `destroy-site` actions
   - Handles API interactions with InstaWP (v1 and v2 endpoints)
   - Manages GitHub PR comments

2. **Build Output** (`dist/index.js`):
   - Bundled version of the action for GitHub Actions runtime
   - Must be rebuilt and committed after any changes to `src/action.js`

### API Integration Points

- **InstaWP API v2**: Site creation from templates (`/api/v2/sites/git`)
- **InstaWP API v1**: Site status checking and deletion
- **GitHub API**: PR comment creation/updates via @actions/github

### Key Behaviors

- Polls InstaWP API for site creation status (max 25 attempts, 3-second intervals)
- Creates or updates PR comments with site URLs and magic login links
- Supports both pooled sites and on-demand creation
- Outputs site URL, magic login URL, and WordPress credentials
- Accepts both INSTAWP_TEMPLATE_SLUG and INSTAWP_SNAPSHOT_SLUG (as an alias) for template identification

### Development Notes

- The code uses mixed module syntax (ES6 imports + CommonJS require)
- No linting configuration exists
- Error handling is basic - mainly catches and logs errors
- All logic is in a single file with switch-case pattern for different actions