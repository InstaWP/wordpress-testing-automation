# wordpress-testing-automation
This custom action can automate your WordPress product testing by 10x. Integrate it with your InstaWP account and get going within minutes.

# Usage

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
          INSTAWP_TEMPLATE_SLUG: gutenademonew
```