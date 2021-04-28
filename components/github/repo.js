import HTMLCustomElement from '../custom-element.js';
import { $ } from '../../js/std-js/functions.js';

customElements.define('github-repo', class HTMLGitHubRepoElement extends HTMLCustomElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this.getTemplate('./components/github/repo.html').then(tmp => {
			this.shadowRoot.append(tmp);
			this.dispatchEvent(new Event('ready'));
		});
	}

	get repo() {
		return this.getAttribute('repo');
	}

	set repo(val) {
		this.setAttribute('repo', val);
	}

	async attributeChangedCallback(name) {
		switch(name) {
		case 'repo':
			this.ready.then(async () => {
				const { repo, shadowRoot } = this;

				if (typeof repo === 'string') {
					const resp = await fetch(new URL(repo, 'https://api.github.com/repos/'), {
						mode: 'cors',
						headers: new Headers({
							Accept: 'application/json',
						}),
					});

					if (resp.ok) {
						const data = await resp.json();
						this.setSlot('data', JSON.stringify(data, null, 4));
						this.setSlot('repo-link', data.full_name, {
							tag: 'a',
							attrs: {
								href: data.html_url,
							}
						});
						$('[part~="error"]', shadowRoot).hide();
						$('[part~="name"]', shadowRoot).text(data.full_name);
						$('[part~="repo-link"]', shadowRoot).attr({ href: data.html_url});
						$('[part~="description"]', shadowRoot).text(data.description);
						$('[part~="username"]', shadowRoot).text(data.owner.login);
						$('[part~="avatar"]', shadowRoot).attr({src: data.owner.avatar_url});
						$('[part~="user-profile"]', shadowRoot).attr({ href: data.owner.html_url});

						if (data.has_issues) {
							$('[part~="issues"]', shadowRoot).attr({
								hidden: false,
								href: `${data.html_url}/issues`,
							});
							$('[part~="issue-count"]', shadowRoot).text(data.open_issues);
						}
						$('[part~="container"]', shadowRoot).unhide();
					} else {
						const data = await resp.json();
						$('[part~="error-link"]', shadowRoot).attr({ href: data.documentation_url });
						$('[part~="error-message"]', shadowRoot).text(data.message);
						$('[part~="container"]', shadowRoot).hide();
						$('[part~="error"]', shadowRoot).unhide();
					}

				}
			});
		}
	}

	static get observedAttributes() {
		return [
			'repo',
			'user',
		];
	}
});

