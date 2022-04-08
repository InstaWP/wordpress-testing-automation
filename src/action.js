
// require('dotenv').config();
import fetch from 'node-fetch';

const core = require('@actions/core');
const github = require('@actions/github');




async function run() {
  	//console.log('Hello, world!');

  	const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');
  	const INSTAWP_TOKEN = core.getInput('INSTAWP_TOKEN');
  	const INSTAWP_TEMPLATE_SLUG = core.getInput('INSTAWP_TEMPLATE_SLUG');
  	const REPO_ID = core.getInput('REPO_ID');

  	if ( typeof GITHUB_TOKEN !== 'string' ) {
		throw new Error('Invalid GITHUB_TOKEN: did you forget to set it in your action config?');
	}

	if ( typeof INSTAWP_TOKEN !== 'string' ) {
		throw new Error('Invalid INSTAWP_TOKEN: did you forget to set it in your action config?');
	}

	const octokit = github.getOctokit(GITHUB_TOKEN);

	const { context = {} } = github;
	const { pull_request } = context.payload;

	if ( !pull_request ) {
  		throw new Error('Could not find pull request!')
	};

	const domain = 's.instawp.io'

	const url = `https://${domain}/api/v1/site`

	console.log(`Creating InstaWP site : ${url}`)

	const data = { "pr_num": pull_request.number, "template_slug" : INSTAWP_TEMPLATE_SLUG, "git_deployment" : true, repo_id: REPO_ID };

	console.log(data);

	const config = {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${INSTAWP_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    }
    const response = await fetch(url, config)

	const results = await response.json();

	// console.log(results);

	const results_url = results.data.link;
	const results_login = `https://${domain}/wordpress-auto-login?site=${results.data.s_hash}`;
	
	

	await octokit.rest.issues.createComment({
	  ...context.repo,
	  issue_number: pull_request.number,
	  body: `WordPress Instance Deployed.\n\nURL: [${results_url}](${results_url})\nMagic Login: [${results_login}](${results_login})`
	});

}

run().catch(e => core.setFailed(e.message));