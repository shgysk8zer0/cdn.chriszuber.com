customElements.define('pwa-install', class HTMLPWAInstallButton extends HTMLButtonElement {
	constructor(src = null, {
		scope = null
	} = {}) {
		super();
		this.hidden = true;

		if (typeof src === 'string') {
			this.src = src;
		}

		if (typeof scope === 'string') {
			this.scope = scope;
		}

		this.addEventListener('updatefound', async event => {
			await event.detail.update();

			if (this.reloadOnUpdate && confirm('Update installed. Reload page?')) {
				location.reload();
			}
		}, {once: true});
	}

	async connectedCallback() {
		if (! this.supported) {
			this.remove();
		} else if (typeof this.src !== 'string') {
			await new Promise(resolve => this.addEventListener('srcchange', () => resolve(), {once: true}));
		}

		await this.serviceWorker;

		window.addEventListener('beforeinstallprompt', event => {
			event.preventDefault();
			this.dispatchEvent(new Event('shown'));
			this.hidden = false;

			this.addEventListener('click', async () => {
				this.dispatchEvent(new Event('prompt'));
				const { outcome } = await event.prompt();
				const detail = {outcome, playforms: event.platforms};
				this.hidden = true;
				this.dispatchEvent(new CustomEvent('install', {detail}));
			});
		}, {
			once: true,
		});
	}

	get reloadOnUpdate() {
		return this.hasAttribute('reloadonupdate');
	}

	set reloadOnUpdate(val) {
		this.toggleAttribute('reloadonupdate', val);
	}

	get src() {
		return this.getAttribute('src');
	}

	set src(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('src', val);
		} else {
			this.removeAttribute('src');
		}
	}

	get scope() {
		return this.getAttribute('scope') || document.baseURI;
	}

	set scope(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('scope', val);
		} else {
			this.removeAttribute('scope');
		}
	}

	get supported() {
		return ('serviceWorker' in navigator) && navigator.serviceWorker.register instanceof Function;
	}

	get serviceWorker() {
		return new Promise(async resolve => {
			if (! this.supported) {
				resolve(null);
			} else {
				const reg = await navigator.serviceWorker.getRegistration();

				if (reg) {
					reg.addEventListener('updatefound', () => {
						this.dispatchEvent(new CustomEvent('updatefound', {detail: reg}));
					}, {
						once: true,
					});
					resolve(reg);
				} else {
					await this.ready;
					const reg = await navigator.serviceWorker.register(this.src, {scope: this.scope});
					this.dispatchEvent(new CustomEvent('serviceworkerinstall', {detail: reg}));
					resolve(reg);
				}
			}
		});
	}

	async update(reg = null) {
		if (reg === null) {
			reg = await this.serviceWorker;
		}

		if (reg) {
			return await reg.update();
		}
	}

	attributeChangedCallback(name, oldValue, newValue) {
		const detail = {oldValue, newValue};
		switch(name) {
		case 'scope':
			this.dispatchEvent(new CustomEvent('scopechange', detail));
			break;

		case 'src':
			this.dispatchEvent(new CustomEvent('srcchange', detail));
			break;

		default:
			throw new Error(`Unhandled attribute change: ${name}`);
		}
	}

	static get observedAttributes() {
		return [
			'scope',
			'src',
		];
	}
}, {
	extends: 'button',
});
