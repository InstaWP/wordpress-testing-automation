
// require('dotenv').config();
import fetch from 'node-fetch';
import { http } from "http";

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


	const url = `https://s.instawp.io/v1/api/sites`

	console.log(`Creating InstaWP site : ${url}`)

	data = { "pr_num": pull_request.number, "template_slug" : INSTAWP_TEMPLATE_SLUG, "git_deployment" : true, repo_id: REPO_ID };

	console.log(data);

	const config = {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    }
    const response = await fetch(url, config)

	const { results } = await response.json();
	const results_url = results.url;
	const results_login = results.access_login;
	
	console.log(response);

	await octokit.rest.issues.createComment({
	  ...context.repo,
	  issue_number: pull_request.number,
	  body: `WordPress Instance Deployed.\n\nURL: [${results_url}](${results_url})testing11.us1.instawp.xyz\nMagic Login: [${results_login}](${results_login})`
	});

}

run().catch(e => core.setFailed(e.message));