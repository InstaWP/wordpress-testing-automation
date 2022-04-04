
// require('dotenv').config();
// const fetch = require('node-fetch');

const core = require('@actions/core');
const github = require('@actions/github');




async function run() {
  	console.log('Hello, world!');

  	const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');

  	if ( typeof GITHUB_TOKEN !== 'string' ) {
		throw new Error('Invalid GITHUB_TOKEN: did you forget to set it in your action config?');
	}

	const octokit = github.getOctokit(GITHUB_TOKEN);

	const { context = {} } = github;
	const { pull_request } = context.payload;

	if ( !pull_request ) {
  		throw new Error('Could not find pull request!')
	};

	await octokit.issues.createComment({
	  ...context.repo,
	  issue_number: pull_request.number,
	  body: 'Thank you for submitting a pull request! We will try to review this as soon as we can.'
	});

}

run().catch(e => core.setFailed(e.message));