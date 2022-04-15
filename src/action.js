
// require('dotenv').config();
import fetch from 'node-fetch';

const core = require('@actions/core');
const github = require('@actions/github');




async function run() {
  	//console.log('Hello, world!');

  	const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');
  	const INSTAWP_TOKEN = core.getInput('INSTAWP_TOKEN');
  	const INSTAWP_ACTION = core.getInput('INSTAWP_ACTION');

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

	const domain = core.getInput('INSTAWP_DOMAIN', { required: false }) || 'app.instawp.io'

	switch(INSTAWP_ACTION) {
		case 'create-site-template':
			const INSTAWP_TEMPLATE_SLUG = core.getInput('INSTAWP_TEMPLATE_SLUG');
		  	const REPO_ID = core.getInput('REPO_ID');

		  	const url = `https://${domain}/api/v1/site`

			console.log(`Creating InstaWP site from template ${INSTAWP_TEMPLATE_SLUG}`)

			const data = { "pr_num": pull_request.number, "template_slug" : INSTAWP_TEMPLATE_SLUG, "git_deployment" : true, repo_id: REPO_ID };

			// console.log(data);

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
			const results_site_id = results.data.site_id;
			const results_login = `https://${domain}/wordpress-auto-login?site=${results.data.s_hash}`;
			
			// core.setOutput('instawp_site_id', results_site_id);
			core.setOutput('instawp_url', results_url);
			core.setOutput('magic_login', results_login);

			// core.exportVariable(`${pull_request.number}-instawp_site_id`, results_site_id);

			await octokit.rest.issues.createComment({
			  ...context.repo,
			  issue_number: pull_request.number,
			  body: `WordPress Instance Deployed.\n\nURL: [${results_url}](${results_url})\nMagic Login: [${results_login}](${results_login})`
			});
			break;
		case 'destroy-site':
			const REPO_ID_DELETE = core.getInput('REPO_ID');
			const INSTAWP_TEMPLATE_SLUG_DELETE = core.getInput('INSTAWP_TEMPLATE_SLUG');
			const PR_NUM_DELETE = pull_request.number;

			if ( typeof REPO_ID_DELETE !== 'numeric' ) {
				throw new Error('Invalid REPO_ID_DELETE: Enter a numeric Repo ID');
			}

			if ( typeof INSTAWP_TEMPLATE_SLUG_DELETE !== 'string' ) {
				throw new Error('Invalid INSTAWP_TEMPLATE_SLUG_DELETE: Enter a string template slug');
			}


			const url_delete = `https://${domain}/api/v1/sites-pr`
			console.log(`Destroying InstaWP site from template ${INSTAWP_TEMPLATE_SLUG_DELETE} & PR ${PR_NUM_DELETE}`)
			// console.log(data);

			const data_delete = { "pr_num": PR_NUM_DELETE, "template_slug" : INSTAWP_TEMPLATE_SLUG_DELETE, repo_id: REPO_ID_DELETE };


			const config_delete = {
		        method: 'DELETE',
		        headers: {
		            'Accept': 'application/json',
		            'Authorization': `Bearer ${INSTAWP_TOKEN}`,
		            'Content-Type': 'application/json',
		        },
		        body: JSON.stringify(data_delete)
		    }

		    const response_delete = await fetch(url_delete, config_delete)

			const results_delete = await response_delete.json();

			console.log(results_delete);
			break;
	}
  	

}

run().catch(e => core.setFailed(e.message));