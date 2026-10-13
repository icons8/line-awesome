# Releasing

Releases go to npm from the **Publish** workflow (`.github/workflows/publish.yml`), started by hand. It authenticates with npm Trusted Publishing, so no npm token is stored anywhere, and the package gets a provenance statement.

A published version can never be replaced, and unversioned CDN URLs (`cdn.jsdelivr.net/npm/line-awesome/...`) follow the `latest` tag. So every release goes out under `next` first and moves to `latest` only after it is checked.

## One-time setup

1. **GitHub:** a repository admin creates the environment `npm-publish` (Settings → Environments). Adding required reviewers there makes every publish wait for approval.
2. **npm:** a package owner adds a trusted publisher (package Settings → Trusted publishing): GitHub Actions, organization `icons8`, repository `line-awesome`, workflow `publish.yml`, environment `npm-publish`.

Publishing through OIDC needs npm 11, which the workflow gets from Node 24 (`.nvmrc`).

## Release steps

1. **Prepare a pull request.** Set the version without tagging: `npm version 2.1.0-rc.0 --no-git-tag-version`. Describe the changes in `CHANGELOG.md` under the final version. Merge after CI passes.
2. **Dry run.** Actions → Publish → Run workflow, with `dry_run` on and `dist_tag` `next`. The log lists every file that would ship; check the list. The workflow stops if the version is already on npm.
3. **Publish the release candidate.** Run it again with `dry_run` off and `dist_tag` `next`. `latest` does not move, so existing sites see nothing.
4. **Check the candidate.** Install `line-awesome@next` in the examples, and open `https://cdn.jsdelivr.net/npm/line-awesome@next/dist/line-awesome/css/line-awesome.min.css` and the same path on unpkg. A problem means a fix and the next candidate (`-rc.1`), not a new try of the same number.
5. **Publish the release.** Set the final version (`npm version 2.1.0 --no-git-tag-version`) in a pull request, merge it, and run Publish with `dist_tag` `latest`, after a dry run as in step 2.
6. **Check what moved.** The CDN URL from the README (`line-awesome@2/...`), the unversioned URL, and [cdnjs](https://cdnjs.com/libraries/line-awesome), which picks up npm releases by itself.
7. **Tag it.** `git tag v2.1.0` on the merged commit, push the tag, and create a GitHub release with the changelog entry.

## If `latest` points at a broken release

Point it back at the previous version, which puts unversioned CDN URLs back too:

```shell
npm dist-tag add line-awesome@<previous version> latest
```

This needs a package owner's npm login. Then release a fixed version the usual way. npm allows unpublishing only within 72 hours and with restrictions, so do not rely on it.
