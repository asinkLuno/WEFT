# WEFT Release Procedure

Use GitHub CLI (`gh`) for all GitHub and remote Git operations. Local `git`
commands may be used to inspect, stage, and manage the working tree, but do not
run `git commit`. Use `gh api` for remote branch refs, commits, comparisons,
tags, and other Git data that do not have a dedicated high-level `gh` command.
Use `gh release`, `gh workflow`, and `gh run` for their corresponding
operations.

Do not modify or delete published releases unless the user explicitly names
them. Do not reproduce CI release builds locally; inspect the GitHub Actions
run and report its URL instead.

## Publish `main` to `release`

1. Verify the repository and authentication:

   ```bash
   gh repo view asinkLuno/WEFT
   gh auth status
   ```

2. Read the current `main` and `release` SHAs, then use the compare API to
   confirm that updating `release` is a fast-forward. Do not force-update it.

   ```bash
   gh api repos/asinkLuno/WEFT/branches/main --jq '.commit.sha'
   gh api repos/asinkLuno/WEFT/branches/release --jq '.commit.sha'
   gh api repos/asinkLuno/WEFT/compare/release...main \
     --jq '{status, ahead_by, behind_by}'
   ```

3. List releases and identify stale drafts before changing anything:

   ```bash
   gh release list \
     --repo asinkLuno/WEFT \
     --limit 100 \
     --json name,tagName,isDraft,isPrerelease,createdAt
   ```

4. Update `release` to the current `main` SHA without forcing:

   ```bash
   main_sha=$(gh api repos/asinkLuno/WEFT/branches/main --jq '.commit.sha')
   gh api \
     --method PATCH \
     repos/asinkLuno/WEFT/git/refs/heads/release \
     -f sha="$main_sha" \
     -F force=false
   ```

   Updating `release` triggers `.github/workflows/release.yml`, which performs
   packaging and release creation.

5. Delete only stale draft releases that were explicitly confirmed. Use their
   exact tag names. Preserve all published releases.

   ```bash
   gh release delete <draft-tag> --repo asinkLuno/WEFT --yes
   ```

   Add `--cleanup-tag` only when the draft has an existing stale tag. Check the
   tag first:

   ```bash
   gh api repos/asinkLuno/WEFT/git/ref/tags/<draft-tag>
   ```

6. Verify the final branch SHA, absence of stale drafts, and the new workflow:

   ```bash
   gh api repos/asinkLuno/WEFT/branches/release --jq '.commit.sha'
   gh release list \
     --repo asinkLuno/WEFT \
     --limit 100 \
     --json name,tagName,isDraft
   gh run list \
     --repo asinkLuno/WEFT \
     --branch release \
     --workflow release.yml \
     --limit 3 \
     --json databaseId,headSha,status,conclusion,createdAt,url
   ```

Report the resulting `release` SHA, every deleted draft, and the URL and status
of the newly triggered workflow.

## Packaging expectations

The Linux job must publish `deb`, `rpm`, and `appimage` bundles. Validate MCP
and desktop startup after packaging changes.
