# InstaWP WordPress Testing Automation
This custom action automates your WordPress testing. Integrate it with your InstaWP account and get going within minutes.

## 🧪 Testing GitHub Artifacts Support (Dev Branch)

**NEW:** GitHub Artifacts support is now available for testing! To use the latest GitHub Artifacts feature, please use the `dev` branch until it's fully tested and merged:

```yaml
- uses: instawp/wordpress-testing-automation@dev
```

This new feature allows you to use artifacts from previous jobs without uploading to third-party services. See the [GitHub Artifacts Support](#github-artifacts-support) section below for details.

# Pre-req

- Register an account at [instawp.com](https://instawp.com)
- Create a site and upload your plugin/theme (download a zip from github and upload)
- Save the site as Template, give a unique slug
- Go to Deployment, enter the details of your WordPress plugin/theme repo. 
- Go back to Templates, connect the git repo to the template. 
- Paste this Yaml file into your repo as shown below.

# Yaml File

Paste this code in your `.github/workflows/instawp.yml` file

```
name: InstaWP WordPress Testing

on:
  pull_request:
    types: [opened]

jobs:
  create-wp-for-testing:
    runs-on: ubuntu-latest
    steps:
      - uses: instawp/wordpress-testing-automation@latest
        with:
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
          INSTAWP_TOKEN: ${{secrets.INSTAWP_TOKEN}}
          EXPIRY_HOURS: 24 //optional
          INSTAWP_TEMPLATE_SLUG: gutenademonew //instawp template slug
          REPO_ID: 123 //instawp repo ID
          ARTIFACT_URL: https://yoursite.com/url.zip //optional
```

- INSTAWP_TOKEN can be obtained from your "API Tokens" screen inside the InstaWP interface. 
- INSTAWP_TEMPLATE_SLUG is shown on the "Templates" screen. You can also use INSTAWP_SNAPSHOT_SLUG as an alias.
- REPO_ID is shown in the "Deployment" screen.
- EXPIRY_HOURS is the number of hours the site will be active. 
- ARTIFACT_URL is the URL of the artifact to download. This is useful if you have a custom build process and generated a zip file. Supports both public URLs and GitHub artifacts (see GitHub Artifacts section below).

# GitHub Artifacts Support

The action now supports GitHub artifacts directly without requiring uploads to third-party services. When you use `actions/upload-artifact` in a previous job, you can reference the artifact URL directly.

## Example with GitHub Artifacts

```yaml
name: InstaWP WordPress Testing

on:
  pull_request:
    types: [opened]

jobs:
  build-artifact:
    runs-on: ubuntu-latest
    outputs:
      artifact-url: ${{ steps.upload.outputs.artifact-url }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Build plugin
        run: |
          # Your build process here
          zip -r my-plugin.zip . -x "*.git*" "node_modules/*"
      
      - name: Upload Artifact
        id: upload
        uses: actions/upload-artifact@v4
        with:
          name: "my-plugin"
          path: ./my-plugin.zip

  create-wp-for-testing:
    needs: build-artifact
    runs-on: ubuntu-latest
    steps:
      - name: Start InstaWP
        uses: instawp/wordpress-testing-automation@latest
        with:
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
          INSTAWP_TOKEN: ${{secrets.INSTAWP_TOKEN}}
          INSTAWP_TEMPLATE_SLUG: your-template-slug
          REPO_ID: 123
          ARTIFACT_URL: ${{ needs.build-artifact.outputs.artifact-url }}
```

## How GitHub Artifacts Work

- The action automatically detects GitHub artifact URLs
- Uses your `GITHUB_TOKEN` to securely download the artifact
- Sends the artifact data directly to InstaWP API
- Works with private repositories (respects GitHub permissions)
- No third-party file uploads required

## Supported URL Formats

The action supports these GitHub artifact URL formats:
- `https://github.com/owner/repo/actions/runs/123456/artifacts/789012`
- `https://api.github.com/repos/owner/repo/actions/artifacts/123456/zip`
- Regular public URLs (backward compatibility)

# Changelog

- 1.0.3 - Added GitHub Artifacts support - directly download and use artifacts from previous jobs without third-party uploads (resolves issue #18)
- 1.0.2 - Updated to use the new InstaWP API v2 and updated the Node version to 16
- 1.0.1 - Added support for expiry hours
- 1.0.0 - Initial release