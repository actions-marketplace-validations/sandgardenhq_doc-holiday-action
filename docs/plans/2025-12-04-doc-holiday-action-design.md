# Doc Holiday GitHub Action - Design Document

**Date:** 2025-12-04
**Status:** Approved

## Overview

A TypeScript GitHub Action that integrates with the doc.holiday API to automatically generate release notes and documentation updates. The action supports both smart event-aware modes (for releases and PR merges) and flexible manual configuration for custom scenarios.

## Goals

1. Enable automated documentation generation triggered by GitHub events (releases, PR merges)
2. Provide flexible manual control for custom documentation workflows
3. Support all doc.holiday API changeset specification types
4. Maintain fast, non-blocking workflow execution (fire-and-forget pattern)

## Architecture

### Hybrid Approach: Smart Defaults + Full Control

The action operates in two modes:

**Smart Mode:** Auto-detects GitHub events and generates appropriate doc.holiday requests with minimal configuration.

**Manual Mode:** Exposes all doc.holiday API fields as inputs for complete customization.

## Inputs

### Required Inputs

- `api-token` (required): Doc.holiday API token from GitHub secrets

### Mode Selection

- `event-type` (optional): Set to `release`, `merge`, or `custom` (default: `custom`)

### Manual Mode Inputs

- `title` (required in manual mode): Job title
- `body` (required in manual mode): Natural language request or commit specification
- `publications` (optional): Comma-separated publication names/IDs
- `source-connection` (optional): Connection name/ID (defaults to `owner/repo`)
- `labels` (optional): Comma-separated labels
- `comments` (optional): Additional instructions (multiline supported)
- `relevant-links` (optional): Comma-separated URLs

### Changeset Specification Inputs (Optional)

All changeset inputs are mutually exclusive - only one type can be specified:

- `releases-count`: Number of recent releases
- `time-range-start` / `time-range-end`: ISO 8601 timestamps
- `commits-count`: Number of recent commits
- `commits-since-sha`: Start from specific commit SHA
- `commits-shas`: Comma-separated list of specific commit SHAs
- `commits-start-sha` / `commits-end-sha` / `commits-include-start`: Commit range
- `tags-start` / `tags-end`: Tag range

## Outputs

- `job-id`: The doc.holiday job ID
- `job-state`: Job state from creation response (typically `requested`)
- `job-url`: URL to view job in doc.holiday UI (`https://app.doc.holiday/jobs/{job-id}`)

## Event Detection and Smart Defaults

### Release Mode (`event-type: release`)

Triggered on GitHub release events:
- **Title:** `"Release notes for {tag_name}"`
- **Body:** Release description from `github.context.payload.release.body`
- **Changes:** Determined from release's target commitish and previous release
- **API eventType:** `"release"`

### Merge Mode (`event-type: merge`)

Triggered on PR merge events:
- **Title:** `"Documentation for PR #{number}: {pr_title}"`
- **Body:** PR description from `github.context.payload.pull_request.body`
- **Changes:** PR commit range (base to head SHA)
- **API eventType:** `"merge"`

### Source Connection Inference

When `source-connection` is not provided:
- Constructs from GitHub context: `{owner}/{repo}`
- Example: `octocat/hello-world`

## API Request Construction

### Request Flow

1. Parse and validate inputs
2. Detect event type and generate smart defaults (if applicable)
3. Build doc.holiday API request object
4. POST to `https://api.doc.holiday/api/v1/jobs`
5. Return immediately with job ID (fire-and-forget)

### Request Object Structure

```json
{
  "docRequest": {
    "title": "string (required)",
    "body": "string (required)",
    "sourceConnection": "string (required)",
    "publications": ["string", "..."] (optional),
    "labels": ["string", "..."] (optional),
    "comments": ["string", "..."] (optional),
    "relevantLinks": ["string", "..."] (optional),
    "eventType": "release|merge" (optional),
    "changes": [{}] (optional)
  }
}
```

### Changes Array Mapping

Changeset inputs map to doc.holiday API format:

- `releases-count` → `{"releases": {"count": N}}`
- `time-range-start` + `time-range-end` → `{"timeRange": {"start": "...", "end": "..."}}`
- `commits-count` → `{"commits": {"count": N}}`
- `commits-since-sha` → `{"commits": {"startSha": "..."}}`
- `commits-shas` → `{"commits": {"shas": ["...", "..."]}}`
- `commits-start-sha` + `commits-end-sha` → `{"commits": {"startSha": "...", "endSha": "...", "includeStartCommit": bool}}`
- `tags-start` + optional `tags-end` → `{"tags": {"start": "...", "end": "..."}}`

### Headers

- `Authorization: Bearer {api-token}`
- `Content-Type: application/json`

## Job Handling

### Fire-and-Forget Pattern

- Action completes immediately after successful job creation
- No polling or waiting for job completion
- Doc.holiday processes jobs asynchronously
- Users monitor progress in doc.holiday UI via job URL output

### Rationale

- Keeps GitHub Actions workflows fast
- Prevents workflow timeouts
- Documentation generation can take minutes
- GitHub Actions should trigger work, not wait for it

## Error Handling

### API Errors

- **401 Unauthorized:** Clear message about invalid API token
- **429 Rate Limited:** Retry with exponential backoff (3 attempts)
- **Network Failures:** Retry up to 3 times with backoff
- **Invalid Parameters:** Pass through API error message

### Action Failures

Action fails (exits with error) only if:
- Required inputs are missing in manual mode
- Multiple mutually exclusive changeset types are specified
- Job creation API call fails after retries

Action succeeds if job is created successfully, regardless of eventual job outcome.

## Code Structure

```
src/
├── index.ts           # Entry point, orchestrates the action
├── inputs.ts          # Parse and validate action inputs
├── api.ts             # Doc.holiday API client
├── github-context.ts  # Extract data from GitHub events
├── changes.ts         # Build changes object from inputs
└── types.ts           # TypeScript interfaces
```

### Module Responsibilities

**inputs.ts:**
- Parse all action inputs using `@actions/core`
- Validate required vs optional based on mode
- Split comma-separated strings into arrays
- Return strongly-typed input object

**github-context.ts:**
- Detect event type from `@actions/github.context`
- Extract release/PR data from event payload
- Generate smart default title/body
- Infer source connection from repo

**changes.ts:**
- Validate mutually exclusive changeset inputs
- Build changes array in doc.holiday API format
- Handle all 8 changeset specification types

**api.ts:**
- HTTP client using native fetch API (Node 20)
- Retry logic with exponential backoff
- Error handling and response parsing
- Construct job URL from job ID

**index.ts:**
- Main execution flow
- Coordinate all modules
- Error handling with `core.setFailed()`
- Logging with `core.info()` and `core.warning()`
- Set action outputs

## Dependencies

- `@actions/core`: Input/output handling, logging
- `@actions/github`: GitHub context and event access
- `@vercel/ncc`: Bundle TypeScript to single JavaScript file
- Native fetch API: HTTP requests (no additional HTTP library needed)

## Usage Examples

### Smart Mode: Automatic Release Notes

```yaml
on:
  release:
    types: [published]

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: your-username/doc-holiday-action@v1
        with:
          api-token: ${{ secrets.DOC_HOLIDAY_TOKEN }}
          event-type: release
```

### Smart Mode: PR Merge Documentation

```yaml
on:
  pull_request:
    types: [closed]
    branches: [main]

jobs:
  docs:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: your-username/doc-holiday-action@v1
        with:
          api-token: ${{ secrets.DOC_HOLIDAY_TOKEN }}
          event-type: merge
```

### Manual Mode: Last 10 Commits

```yaml
on:
  schedule:
    - cron: '0 0 * * 0'

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: your-username/doc-holiday-action@v1
        with:
          api-token: ${{ secrets.DOC_HOLIDAY_TOKEN }}
          title: "Weekly docs update"
          body: "Update documentation for user-facing changes"
          commits-count: 10
          labels: weekly,automated
```

### Manual Mode: Specific Commit Range

```yaml
on:
  workflow_dispatch:
    inputs:
      start_sha:
        description: 'Start commit SHA'
        required: true
      end_sha:
        description: 'End commit SHA'
        required: true

jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: your-username/doc-holiday-action@v1
        with:
          api-token: ${{ secrets.DOC_HOLIDAY_TOKEN }}
          title: "Document feature branch changes"
          body: "Create documentation for new feature implementation"
          commits-start-sha: ${{ github.event.inputs.start_sha }}
          commits-end-sha: ${{ github.event.inputs.end_sha }}
          publications: my-api-docs,my-user-guide
```

## Testing Strategy

1. **Unit Tests:** Test each module independently (inputs parsing, changes building, etc.)
2. **Integration Tests:** Mock doc.holiday API, test full request construction
3. **Manual Testing:** Test against real doc.holiday API in test repository
4. **Event Testing:** Trigger actual GitHub events (release, PR merge) to verify context extraction

## Future Enhancements

Potential additions for future versions:
- Support for multiple jobs in a single action run
- Workflow outputs for downstream job dependencies
- Custom polling mode for blocking workflows (opt-in)
- Batch job creation from configuration file

## Security Considerations

- API token must be stored in GitHub secrets, never hardcoded
- No sensitive data logged to action output
- Use only official GitHub Actions toolkit libraries
- Validate all inputs before sending to API
