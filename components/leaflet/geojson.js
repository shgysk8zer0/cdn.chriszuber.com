import {geoJSON} from 'https://unpkg.com/leaflet@1.5.1/dist/leaflet-src.esm.js';
const map = new Map();

customElements.define('leaflet-geojson', class HTMLLeafletGeoJSONElement extends HTMLElement {
	constructor() {
		super();
		this._map = null;
	}

	get color() {
		return this.getAttribute('color') || '#ff7800';
	}

	set color(val) {
		this.setAttribute('color', val);
	}

	get fill() {
		return this.hasAttribute('fill');
	}

	set fill(val) {
		this.toggleAttribute('fill', val);
	}

	get opacity() {
		return this.hasAttribute('opacity') ? parseFloat(this.getAttribute('opacity')) : 1;
	}

	set opacity(val) {
		this.setAttribute('opacity', val);
	}

	get ready() {
		return new Promise(resolve => {
			if ( map.has(this)) {
				resolve();
			} else {
				this.addEventListener('ready', () => resolve(), {once: true});
			}
		});
	}

	get src() {
		return new URL(this.getAttribute('src'), document.baseURI);
	}

	set src(val) {
		this.setAttribute('src', val);
	}

	get stroke() {
		return this.hasAttribute('stroke');
	}

	set stroke(val) {
		this.toggleAttribute('stroke', val);
	}

	get weight() {
		return this.hasAttribute('weight') ? parseInt(this.getAttribute('weight')) : 5;
	}

	set weight(val) {
		this.setAttribute('weight', val);
	}

	async attributeChangedCallback(name/*, oldVal, newVal*/) {
		await this.ready;
		const path = map.get(this);
		switch(name) {
		case 'color':
			path.setStyle({color: this.color});
			break;

		case 'fill':
			path.setStyle({fill: this.fill});
			break;

		case 'hidden':
			if (this.hidden) {
				path.remove();
			} else if (this._map instanceof HTMLElement) {
				path.addTo(this._map.map);
			}
			break;

		case 'opacity':
			path.setStyle({opacity: this.opacity});
			break;

		case 'stroke':
			path.setStyle({stroke: this.stroke});
			break;

		case 'src':
			// console.info({oldVal, newVal});
			// fetch(this.src).then(async resp => {
			// 	const data = await resp.json();
			// 	path.addData(data);
			// });
			break;

		case 'weight':
			path.setStyle({weight: this.weight});
			break;

		default:
			throw new Error(`Invalid attribute changed: ${name}`);
		}
	}

	async connectedCallback() {
		if (this.parentElement.tagName === 'LEAFLET-MAP') {
			this._map = this.parentElement;
			await this._map.ready;

			if (! map.has(this)) {
				map.set(this, await this._make());
				this.dispatchEvent(new Event('ready'));
			}

			if (! this.hidden) {
				await this._map.ready;
				const path = map.get(this);
				path.addTo(this._map.map);
			}
		}
	}

	async disconnectedCallback() {
		if (this._map instanceof HTMLElement) {
			await this._map.ready;
			const path = map.get(this);
			path.remove();
			map.delete(this);
			this._map = null;
		}
	}

	async _make() {
		const { src, _map, fill, weight, color, opacity, stroke } = this;
		let json = {};
		if (this.hasAttribute('src')) {
			const resp = await fetch(src);
			json = await resp.json();
		}

		if (_map instanceof HTMLElement) {
			await _map.ready;

			const path = geoJSON(json || {}, {style: {color, weight, fill, opacity, stroke}});
			return path;
		} else {
			return null;
		}
	}

	static get observedAttributes() {
		return [
			'color',
			'fill',
			'hidden',
			'opacity',
			'src',
			'stroke',
			'weight',
		];
	}
});