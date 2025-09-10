// require('dotenv').config();
import fetch from 'node-fetch';

const core = require('@actions/core');
const github = require('@actions/github');
const FormData = require('form-data');

// Helper function to detect if URL is a GitHub artifact URL
function isGitHubArtifactUrl(url) {
	if (!url || typeof url !== 'string') return false;
	return url.includes('github.com') && url.includes('artifacts');
}

// Helper function to extract artifact ID and repo info from GitHub artifact URL
function parseGitHubArtifactUrl(url) {
	try {
		// GitHub artifact URLs typically look like:
		// https://github.com/owner/repo/actions/runs/123456/artifacts/789012
		const urlObj = new URL(url);
		const pathParts = urlObj.pathname.split('/');
		
		if (pathParts.length >= 7 && pathParts[4] === 'actions' && pathParts[5] === 'runs' && pathParts[7] === 'artifacts') {
			return {
				owner: pathParts[1],
				repo: pathParts[2],
				run_id: pathParts[6],
				artifact_id: pathParts[8]
			};
		}
		
		// Also support direct artifact URLs from actions/upload-artifact output
		// These might be in format: https://api.github.com/repos/owner/repo/actions/artifacts/123456/zip
		if (urlObj.hostname === 'api.github.com' && pathParts.includes('artifacts')) {
			const artifactIndex = pathParts.indexOf('artifacts');
			if (artifactIndex > 0 && pathParts[artifactIndex + 1]) {
				return {
					owner: pathParts[2],
					repo: pathParts[3],
					artifact_id: pathParts[artifactIndex + 1]
				};
			}
		}
		
		return null;
	} catch (error) {
		console.log('Error parsing GitHub artifact URL:', error.message);
		return null;
	}
}

// Helper function to download GitHub artifact using Octokit
async function downloadGitHubArtifact(octokit, artifactInfo) {
	try {
		console.log(`Downloading GitHub artifact ${artifactInfo.artifact_id}...`);
		
		const response = await octokit.rest.actions.downloadArtifact({
			owner: artifactInfo.owner,
			repo: artifactInfo.repo,
			artifact_id: parseInt(artifactInfo.artifact_id),
			archive_format: 'zip'
		});
		
		console.log('GitHub artifact downloaded successfully');
		return Buffer.from(response.data);
	} catch (error) {
		console.error('Error downloading GitHub artifact:', error.message);
		throw new Error(`Failed to download GitHub artifact: ${error.message}`);
	}
}

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
			// Support both INSTAWP_TEMPLATE_SLUG and INSTAWP_SNAPSHOT_SLUG (as an alias)
			const INSTAWP_TEMPLATE_SLUG = core.getInput('INSTAWP_TEMPLATE_SLUG') || core.getInput('INSTAWP_SNAPSHOT_SLUG');
		  	const REPO_ID = core.getInput('REPO_ID');
		  	const ARTIFACT_URL = core.getInput('ARTIFACT_URL', { required: false }) || false;
		  	const EXPIRY_HOURS = core.getInput('EXPIRY_HOURS', { required: false }) || null;

		  	const url = `https://${domain}/api/v2/sites/git`

			console.log(`Creating InstaWP site from template ${INSTAWP_TEMPLATE_SLUG}`)

			let data = { "pr_num": pull_request.number, "template_slug" : INSTAWP_TEMPLATE_SLUG, "git_deployment" : true, repo_id: REPO_ID };
			let config;
			let artifactBuffer = null;

			// Check if ARTIFACT_URL is a GitHub artifact
			if (ARTIFACT_URL && isGitHubArtifactUrl(ARTIFACT_URL)) {
				console.log('Detected GitHub artifact URL, downloading artifact...');
				
				const artifactInfo = parseGitHubArtifactUrl(ARTIFACT_URL);
				if (!artifactInfo) {
					throw new Error('Unable to parse GitHub artifact URL. Please ensure the URL is valid.');
				}

				try {
					artifactBuffer = await downloadGitHubArtifact(octokit, artifactInfo);
					console.log(`Downloaded artifact, size: ${artifactBuffer.length} bytes`);
				} catch (error) {
					console.error('Failed to download GitHub artifact:', error.message);
					throw error;
				}
			}

			if (EXPIRY_HOURS !== null) {
				data['expiry_hours'] = parseInt(EXPIRY_HOURS);
			}

			// If we have an artifact buffer, send as form data, otherwise use JSON
			if (artifactBuffer) {
				// Create form data with the artifact
				const formData = new FormData();
				
				// Add all the data fields to form data
				Object.keys(data).forEach(key => {
					formData.append(key, data[key]);
				});
				
				// Add the artifact file
				formData.append('override_file', artifactBuffer, {
					filename: 'artifact.zip',
					contentType: 'application/zip'
				});

				config = {
					method: 'POST',
					headers: {
						'Accept': 'application/json',
						'Authorization': `Bearer ${INSTAWP_TOKEN}`,
						...formData.getHeaders()
					},
					body: formData
				};
			} else {
				// Regular JSON request
				if (ARTIFACT_URL != false) {
					data['override_url'] = ARTIFACT_URL
				}

				config = {
					method: 'POST',
					headers: {
						'Accept': 'application/json',
						'Authorization': `Bearer ${INSTAWP_TOKEN}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(data)
				};
			}

		    const response = await fetch(url, config)

			const results = await response.json();

			if (results.status == false) {
				let msg = "An error has occurred: Please check if you have permissions or limits might have been exhausted.";
				if (results.message) {
					msg += ', Server: ' + results.message;
				}
				console.log(msg);
				return;
			}

			console.log(results);

			const results_url = results.data.wp_url;
			const results_site_id = results.data.id;
			const results_login = `https://${domain}/wordpress-auto-login?site=${results.data.s_hash}`;

			
			
			// core.setOutput('instawp_site_id', results_site_id);
			core.setOutput('instawp_url', results_url);
			core.setOutput('iwp_url', results_url);
			core.setOutput('magic_login', results_login);
			core.setOutput('iwp_magic_login', results_login);

			if (!results.data.is_pool) {
				console.log(`Waiting for the site ${results_url} (${results_site_id}) to be spawned...`);

				const url_check = `https://${domain}/api/v1/site/user-installation-status/${results_site_id}`;
				const config_check = {
					method: 'GET',
					headers: {
						'Accept': 'application/json',
						'Authorization': `Bearer ${INSTAWP_TOKEN}`,
						'Content-Type': 'application/json',
					}
				};

				let wait_count = 1;

				while (wait_count <= 25) {
					let response_check = await fetch(url_check, config_check);
					let results_check = await response_check.json();

					if (results_check.data.installation_status.status === 'completed') {
						const wp_username = results_check.data.wp_username;
						const wp_password = results_check.data.wp_password;

						core.setOutput('iwp_wp_username', wp_username);
						core.setOutput('iwp_wp_password', wp_password);

						console.log("Site created.. completing stage");
						break;
					}

					console.log("Site creation progress : ", results_check.data.installation_status.percentage_complete);
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
			// Support both INSTAWP_TEMPLATE_SLUG and INSTAWP_SNAPSHOT_SLUG (as an alias)
			const INSTAWP_TEMPLATE_SLUG_DELETE = core.getInput('INSTAWP_TEMPLATE_SLUG') || core.getInput('INSTAWP_SNAPSHOT_SLUG');
			const PR_NUM_DELETE = pull_request.number;

			console.log(typeof REPO_ID_DELETE)

			if ( typeof REPO_ID_DELETE !== 'number' ) {
				throw new Error('Invalid REPO_ID: Enter a numeric Repo ID');
			}

			if ( typeof INSTAWP_TEMPLATE_SLUG_DELETE !== 'string' ) {
				throw new Error('Invalid INSTAWP_TEMPLATE_SLUG/INSTAWP_SNAPSHOT_SLUG: Enter a string template or snapshot slug');
			}

			const url_delete = `https://${domain}/api/v1/sites-pr`
			console.log(`Destroying InstaWP site from template ${INSTAWP_TEMPLATE_SLUG_DELETE} & PR ${PR_NUM_DELETE} (0=no PR)`)
			// console.log(data);

			const data_delete = { "pr_num": PR_NUM_DELETE, "template_slug" : INSTAWP_TEMPLATE_SLUG_DELETE, "repo_id": REPO_ID_DELETE };

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