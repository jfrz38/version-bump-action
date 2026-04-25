# version-bump-action

Reusable GitHub Action that bumps a simple SemVer version, commits the change to a bump branch, pushes it, and opens a draft pull request.

It is designed for release-preparation workflows where a maintainer reviews and merges the version bump before a separate release workflow creates tags, GitHub Releases, or publishes artifacts.

## What it does

- Reads the current version from a supported project file.
- Validates simple SemVer: `MAJOR.MINOR.PATCH`.
- Calculates a `patch`, `minor`, or `major` bump.
- Updates the version file.
- Fails if the target tag or GitHub Release already exists, unless disabled.
- Creates and pushes `chore/bump-version-{next-version}` by default.
- Opens a GitHub pull request, draft by default.
- Reuses an existing open PR for the same branch/base instead of creating a duplicate.

## What it does not do

- It does not create a git tag.
- It does not create a GitHub Release.
- It does not publish packages or artifacts.
- It does not merge the pull request.

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `bump` | Yes | | Version component to bump: `patch`, `minor`, or `major`. |
| `strategy` | Yes | | Version file strategy: `gradle-kts`, `npm`, or `regex`. |
| `version-file` | Yes | | Path to the file that contains the version. |
| `version-pattern` | For `regex` | | Regex with exactly one capture group containing the current version. |
| `version-replacement` | For `regex` | | Replacement template. Use `{version}` for the next version. |
| `base-branch` | No | current/default branch | Base branch for the pull request. |
| `branch-prefix` | No | `chore/bump-version-` | Prefix for the bump branch. |
| `tag-prefix` | No | `v` | Prefix used for tag/release existence checks. |
| `draft` | No | `true` | Whether to create the pull request as a draft. |
| `github-token` | No | `${{ github.token }}` | Token used for checks and PR creation. |
| `commit-message` | No | `Bump version to {version}` | Commit message template. |
| `pr-title` | No | `Bump version to {version}` | Pull request title template. |
| `pr-body` | No | `Bumps version from {current-version} to {next-version} using a {bump} release bump.` | Pull request body template. |
| `fail-if-tag-exists` | No | `true` | Fail if `${tag-prefix}${next-version}` already exists as a tag. |
| `fail-if-release-exists` | No | `true` | Fail if a GitHub Release already exists for the tag. |

Template inputs support:

- `{version}` and `{next-version}`
- `{current-version}`
- `{bump}`

## Outputs

| Output | Description |
| --- | --- |
| `current-version` | Version read before applying the bump. |
| `next-version` | Version written by the action. |
| `tag` | Tag name associated with the next version. |
| `branch` | Branch pushed by the action. |
| `pr-url` | Created or reused pull request URL. |
| `changed-files` | Newline-separated list of files changed by the bump. |

## Permissions

The workflow using this action needs:

```yaml
permissions:
  contents: write
  pull-requests: write
```

Use `actions/checkout` with the target base branch and `fetch-depth: 0`.

## Gradle Kotlin DSL

Supports files such as `build.gradle.kts` with one version assignment:

```kotlin
version = "0.1.2"
```

Workflow:

```yaml
name: Bump Version

on:
  workflow_dispatch:
    inputs:
      bump:
        type: choice
        required: true
        options: [patch, minor, major]
      base_branch:
        type: choice
        required: true
        default: develop
        options: [develop, main]

permissions:
  contents: write
  pull-requests: write

jobs:
  bump:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ inputs.base_branch }}
          fetch-depth: 0

      - id: bump
        uses: OWNER/version-bump-action@v1
        with:
          bump: ${{ inputs.bump }}
          base-branch: ${{ inputs.base_branch }}
          strategy: gradle-kts
          version-file: mockguard/build.gradle.kts
```

## npm

For `package.json`, the action reads and updates the `version` field.

If a same-directory `package-lock.json` exists, the action runs:

```bash
npm version <next-version> --no-git-tag-version --allow-same-version
```

Example:

```yaml
- uses: actions/checkout@v4
  with:
    ref: ${{ inputs.base_branch }}
    fetch-depth: 0

- id: bump
  uses: OWNER/version-bump-action@v1
  with:
    bump: ${{ inputs.bump }}
    base-branch: ${{ inputs.base_branch }}
    strategy: npm
    version-file: package.json
```

## Regex

Use `regex` for files that are not covered by a built-in strategy.

`version-pattern` must match the text to replace and include exactly one capture group containing the current version. `version-replacement` replaces the whole match; put `{version}` where the next version should be written.

Example file:

```txt
releaseVersion=1.2.3
```

Example workflow step:

```yaml
- id: bump
  uses: OWNER/version-bump-action@v1
  with:
    bump: minor
    strategy: regex
    version-file: VERSION.txt
    version-pattern: 'releaseVersion=(\d+\.\d+\.\d+)'
    version-replacement: 'releaseVersion={version}'
```

## Release flow

This action intentionally stops at the pull request. A separate workflow can create the tag and GitHub Release after the bump PR is merged into the release branch.

That keeps the release boundary explicit:

1. Run this action manually.
2. Review and merge the bump PR.
3. Let a release workflow create `v{version}` from the merged branch.
