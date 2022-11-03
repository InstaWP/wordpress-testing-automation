
// require('dotenv').config();
import fetch from 'node-fetch';

const core = require('@actions/core');
const github = require('@actions/github');




async function run() {
  	//console.log('Hello, world!');

  	const GITHUB_TOKEN = core.getInput('GITHUB_TOKEN');
  	const INSTAWP_TOKEN = core.getInput('INSTAWP_TOKEN');
  	const INSTAWP_ACTION = core.getInput('INSTAWP_ACTION', { required: false }) || 'create-site-template';

  	if ( typeof GITHUB_TOKEN !== 'string' ) {
		throw new Error('Invalid GITHUB_TOKEN: did you forget to set it in your action config?');
	}

	if ( typeof INSTAWP_TOKEN !== 'string' || !INSTAWP_TOKEN) {
		throw new Error('Invalid INSTAWP_TOKEN: did you forget to set it in your action config?');
	}

	const octokit = github.getOctokit(GITHUB_TOKEN);

	const { context = {} } = github;
	let { pull_request } = context.payload;

	if ( !pull_request ) {
  		console.log('Could not find a pull request with this run, commenting disabled!')
  		pull_request = { number: 0 }
	};

	const domain = core.getInput('INSTAWP_DOMAIN', { required: false }) || 'app.instawp.io'

	switch(INSTAWP_ACTION) {
		case 'create-site-template':
			const INSTAWP_TEMPLATE_SLUG = core.getInput('INSTAWP_TEMPLATE_SLUG');
		  	const REPO_ID = core.getInput('REPO_ID');
		  	const ARTIFACT_URL = core.getInput('ARTIFACT_URL', { required: false }) || false;

		  	const url = `https://${domain}/api/v1/site`

			console.log(`Creating InstaWP site from template ${INSTAWP_TEMPLATE_SLUG}`)

			let data = { "pr_num": pull_request.number, "template_slug" : INSTAWP_TEMPLATE_SLUG, "git_deployment" : true, repo_id: REPO_ID };

			if (ARTIFACT_URL != false) {
				data['override_url'] = ARTIFACT_URL
			}

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

			if(results.data == undefined) {
				var msg = "An error has occurred: Please check if you have permissions or limits might have been exhausted."
				if(results.message)
					msg = msg + ', Server: ' + results.message;

				console.log(msg);
				
				return;
			}

			const results_url = results.data.link;
			const results_site_id = results.data.site_id;
			const results_login = `https://${domain}/wordpress-auto-login?site=${results.data.s_hash}`;
			const wp_username = results.data.wp.username;
			const wp_password = results.data.wp.password;
			
			// core.setOutput('instawp_site_id', results_site_id);
			core.setOutput('instawp_url', results_url);
			core.setOutput('iwp_url', results_url);
			core.setOutput('magic_login', results_login);
			core.setOutput('iwp_magic_login', results_login);
			core.setOutput('iwp_wp_username', wp_username);
			core.setOutput('iwp_wp_password', wp_password);

			

			if(!results.data.is_pool) {
				console.log(`Waiting for the site ${results_url} (${results_site_id}) to be spawned...`)

				const url_check = `https://${domain}/api/v1/site/user-installation-status/${results_site_id}`;
				const config_check = {
			        method: 'GET',
			        headers: {
			            'Accept': 'application/json',
			            'Authorization': `Bearer ${INSTAWP_TOKEN}`,
			            'Content-Type': 'application/json',
			        }
			    }

			    let wait_count = 1;

			    while(wait_count <= 25) {
			    	let response_check = await fetch(url_check, config_check)

					let results_check = await response_check.json();
					//console.log(results_check);
					if(results_check.data.installation_status.status == 'completed') {
						console.log("Site verified.. completing stage");
						break;
					}
					wait_count++;
					await new Promise(r => setTimeout(r, 3000));
			    }

			}

			if(pull_request.number > 0) {

				const comments = await octokit.rest.issues.listComments({
				  ...context.repo,
				  issue_number: pull_request.number,
				  per_page: 100
				});

				const comment = comments.data.find( comment => comment.body.includes( '<!-- INSTAWP-COMMENT -->' ) );

				if ( undefined === comment ) {
					await octokit.rest.issues.createComment({
					  ...context.repo,
					  issue_number: pull_request.number,
					  body: `<!-- INSTAWP-COMMENT -->\nWordPress Instance Deployed.\n\nURL: [${results_url}](${results_url})\nMagic Login: [${results_login}](${results_login})`
					});
				} else {
					await octokit.rest.issues.updateComment({
					  ...context.repo,
					  issue_number: pull_request.number,
					  comment_id: comment.id,
					  body: `<!-- INSTAWP-COMMENT -->\nWordPress Instance Deployed.\n\nURL: [${results_url}](${results_url})\nMagic Login: [${results_login}](${results_login})`
					});
				}
			}

			break;
		case 'destroy-site':
			const REPO_ID_DELETE = parseInt(core.getInput('REPO_ID'));
			const INSTAWP_TEMPLATE_SLUG_DELETE = core.getInput('INSTAWP_TEMPLATE_SLUG');
			const PR_NUM_DELETE = pull_request.number;

			console.log(typeof REPO_ID_DELETE)

			if ( typeof REPO_ID_DELETE !== 'number' ) {
				throw new Error('Invalid REPO_ID: Enter a numeric Repo ID');
			}

			if ( typeof INSTAWP_TEMPLATE_SLUG_DELETE !== 'string' ) {
				throw new Error('Invalid INSTAWP_TEMPLATE_SLUG: Enter a string template slug');
			}

			const url_delete = `https://${domain}/api/v1/sites-pr`
			console.log(`Destroying InstaWP site from template ${INSTAWP_TEMPLATE_SLUG_DELETE} & PR ${PR_NUM_DELETE} (0=no PR)`)
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