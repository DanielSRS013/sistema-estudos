(function () {
  var CSS = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
  class KTex extends HTMLElement {
    static get observedAttributes() { return ['tex', 'display']; }
    connectedCallback() { this.draw(); }
    attributeChangedCallback() { if (this.isConnected) this.draw(); }
    draw() {
      if (!window.katex) { clearTimeout(this._t); this._t = setTimeout(() => this.draw(), 80); return; }
      var d = this.hasAttribute('display') && this.getAttribute('display') !== 'false';
      var root = this.shadowRoot || this.attachShadow({ mode: 'open' });
      var html = '';
      try { html = katex.renderToString(this.getAttribute('tex') || '', { displayMode: d, throwOnError: false }); } catch (e) {}
      root.innerHTML = '<link rel="stylesheet" href="' + CSS + '"><style>:host{display:' + (d ? 'block' : 'inline') + ';max-width:100%}' +
        (d ? ':host{overflow-x:auto;overflow-y:hidden;padding:4px 0}' : '') +
        '.katex{font-size:1.08em}.katex-display{margin:0;text-align:left}.katex-display>.katex{text-align:left;padding-left:24px}</style>' + html;
    }
  }
  if (!customElements.get('k-tex')) customElements.define('k-tex', KTex);
})();
