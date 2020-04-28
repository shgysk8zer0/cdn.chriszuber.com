import { $ } from '../../js/std-js/functions.js';
import { meta } from '../../import.meta.js';

customElements.define('github-user', class HTMLGitHubUserElement extends HTMLElement {
	constructor(user = null) {
		super();
		this.hidden = true;
		this.attachShadow({mode: 'open'});
		if (typeof user === 'string') {
			this.user = user;
		}

		fetch(new URL('./components/github/user.html', meta.url)).then(async resp => {
			const parser = new DOMParser();
			const doc = parser.parseFromString(await resp.text(), 'text/html');
			this.shadowRoot.append(...doc.head.children, ...doc.body.children);
			this.dispatchEvent(new Event('ready'));
		});
	}

	get ready() {
		return new Promise(resolve => {
			if (this.shadowRoot.childElementCount === 0) {
				this.addEventListener('ready', () => resolve(this), {once: true});
			} else {
				resolve(this);
			}
		});
	}

	get bio() {
		return this.hasAttribute('bio');
	}

	set bio(val) {
		this.toggleAttribute('bio', val);
	}

	get user() {
		return this.getAttribute('user');
	}

	set user(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('user', val);
		} else {
			this.removeAttribute('user');
		}
	}

	attributeChangedCallback(name, oldVal, newVal) {
		switch(name) {
		case 'user':
			if (typeof newVal === 'string' && newVal.length !== 0) {
				this.ready.then(async () => {
					const url = new URL(`/users/${newVal}`, 'https://api.github.com');
					const resp = await fetch(url, {
						mode: 'cors',
						referrerPolicy: 'no-referrer',
						crossorigin: 'anonymous',
						headers: new Headers({
							Accept: 'application/json',
						})
					});

					if (resp.ok) {
						const shadow = this.shadowRoot;
						const user = await resp.json();
						const blog = new URL(user.blog);

						$('[part~="avatar"]', shadow).attr({
							src: `${user.avatar_url}&s=64`,
							height: 64,
							width: 64,
						});

						$('[part~="username"]', shadow).text(user.login);
						$('[part~="name"]', shadow).text(user.name);
						$('[part~="github"]', shadow).attr({
							href: user.html_url,
							title: `View ${user.login}'s profile on GitHub`,
						});

						if (user.bio !== null) {
							$('[part~="bio"]', shadow).text(user.bio);
							$('[part~="bio"]').unhide();
						} else {
							$('[part~="bio-container"]', shadow).hide();
						}

						if (user.location !== null) {
							$('[part~="location"]', shadow).text(user.location);
							$('[part~="location-container"]', shadow).unhide();
						} else {
							$('[part~="location-container"]', shadow).hide();
						}

						if (user.email !== null) {
							$('[part~="email"]', shadow).text(user.email);
							$('[part~="email"]', shadow).attr({href: `mailto:${user.email}`});
							$('[part~="email-container"]', shadow).unhide();
						} else {
							$('[part~="email-container"]', shadow).hide();
						}

						if (user.company !== null) {
							$('[part~="company"]', shadow).text(user.company);
							$('[part~="company"]', shadow).attr({href: `https://github.com/${user.company.replace('@', '')}`});
							$('[part~="company-container"]', shadow).unhide();
						} else {
							$('[part~="company-container"]', shadow).hide();
						}

						if (user.blog !== null) {
							$('[part~="blog"]', shadow).attr({href: blog.href});
							$('[part~="blog"]', shadow).text(blog.hostname);
						} else {
							$('[part~="blog"]', shadow).remove();
						}
						this.hidden = false;
					} else {
						this.hidden = true;
					}
				});
			}
			break;
		}
	}

	static get observedAttributes() {
		return [
			'user',
		];
	}
});