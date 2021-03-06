import { text, attr, when } from '../../js/std-js/dom.js';
import { getHTML, getJSON } from '../../js/std-js/http.js';
import { registerCustomElement } from '../../js/std-js/custom-elements.js';
import { loadStylesheet } from '../../js/std-js/loader.js';
import { hasGa, send } from '../../js/std-js/google-analytics.js';
import { meta } from '../../import.meta.js';

const protectedData = new WeakMap();

function utm(url, { campaign, content, medium, source, term }) {
	if (typeof source === 'string' && source.length !== 0) {
		const u = new URL(url);

		u.searchParams.set('utm_source', source);

		if (typeof campaign === 'string' && campaign.length !== 0) {
			u.searchParams.set('utm_campaign', campaign);
		}

		if (typeof content === 'string' && content.length !== 0) {
			u.searchParams.set('utm_content', content);
		}

		if (typeof medium === 'string' && medium.length !== 0) {
			u.searchParams.set('utm_medium', medium);
		}

		if (typeof term === 'string' && term.length !== 0) {
			u.searchParams.set('utm_term', term);
		}

		return u.href;
	} else {
		return url;
	}
}

registerCustomElement('krv-events', class HTMLKRVEventsElement extends HTMLElement {
	constructor() {
		super();
		const parent = this.attachShadow({ mode: 'closed' });

		Promise.all([
			getHTML(new URL('./components/krv/events.html', meta.url).href),
			loadStylesheet(new URL('./components/krv/events.css', meta.url).href, { parent }),
			this.whenConnected,
		]).then(([frag]) => {
			if (this.hasAttribute('source')) {
				const link = frag.querySelector('.app-link');
				link.href = utm(link.href, this);
			}

			parent.append(frag);
			protectedData.set(this, { shadow: parent });
			this.dispatchEvent(new Event('ready'));
		});
	}

	get ready() {
		if (! protectedData.has(this)) {
			return when(this, 'ready');
		} else {
			return Promise.resolve();
		}
	}

	get whenConnected() {
		if (this.isConnected) {
			return Promise.resolve();
		} else {
			return when(this, 'connected');
		}
	}

	connectedCallback() {
		this.dispatchEvent(new Event('connected'));
		this.render();
	}

	async render() {
		const [data] = await Promise.all([
			getJSON('https://events.kernvalley.us/events.json'),
			this.ready,
		]);

		const tmp = protectedData.get(this).shadow.getElementById('event-template').content;
		const { campaign, content, medium, source, term } = this;

		const events = data.splice(0, this.count).map(({ name, url, description, startDate, endDate, location }) => {
			const base = tmp.cloneNode(true);
			const container = document.createElement('div');
			const start = new Date(startDate);
			const end = new Date(endDate);
			const controller = new AbortController();

			function handler() {
				if (hasGa()) {
					send({
						hitType: 'event',
						eventCategory: 'krv-event',
						eventLabel: this.querySelector('.event-name').textContent,
						eventAction: 'open',
						transport: 'beacon',
					});
				} else {
					controller.abort();
				}
			}

			container.classList.add('event');

			attr('.event-url', { href: utm(url, { campaign, content, medium, source, term}) }, { base }).forEach(a => {
				a.addEventListener('click', handler, { signal: controller.signal });
			});

			text('.event-name', name, { base });
			text('.event-description', description, { base });
			text('.event-start-time', start.toLocaleString(), { base });
			attr('.event-start-time', { datetime: start.toISOString() }, { base });
			text('.event-end-time', end.toLocaleTimeString(), { base });
			attr('.event-end-time', { datetime: end.toISOString() }, { base });

			if (typeof location !== 'undefined') {
				text('.event-location', location.name || location.address.addressLocality, { base });
			}

			container.append(base);
			return container;
		});

		protectedData.get(this).shadow.getElementById('events-list').replaceChildren(...events);
	}

	get count() {
		if (this.hasAttribute('count')) {
			return parseInt(this.getAttribute('count')) || 5;
		} else {
			return 5;
		}
	}

	get content() {
		return this.getAttribute('content') || 'krv-events';
	}

	set content(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('content', val);
		} else {
			this.removeAttribute('content');
		}
	}

	set count(val) {
		if (Number.isInteger(val) && val > 0) {
			this.setAttribute('count', val);
		} else {
			this.removeAttribute('count');
		}
	}

	get medium() {
		return this.getAttribute('medium') || 'referrer';
	}

	set medium(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('medium', val);
		} else {
			this.removeAttribute('medium');
		}
	}

	get source() {
		return this.getAttribute('source');
	}

	set source(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('source', val);
		} else {
			this.removeAttribute('source');
		}
	}

	get theme() {
		if (this.hasAttribute('theme')) {
			return this.getAttribute('theme');
		} else {
			return 'auto';
		}
	}

	set theme(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('theme', val);
		} else {
			this.removeAttribute('theme');
		}
	}

	get term() {
		return this.getAttribute('term');
	}

	set term(val) {
		if (typeof val === 'string' && val.length !== 0) {
			this.setAttribute('term', val);
		} else {
			this.removeAttribute('term');
		}
	}

	attributeChangedCallback(name/*, oldVal, newVal*/) {
		switch(name) {
			case 'count':
				this.render().catch(console.error);
				break;

			default:
				console.error(`Unhandled attribute changed: ${name}`);
		}
	}

	static get observedAttributes() {
		return ['count'];
	}
});
