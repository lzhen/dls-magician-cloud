# DLS Magician UI changes

For design-system work, read `docs/design-system/DOM-ADAPTER.md` and the exact API in `public/vendor/empathie/contract.json`. The product uses native JavaScript; the React pilot has a separate API and is not installed here.

Keep product-specific templates, permissions, API calls and drafts in the product. Shared code is pinned by `public/vendor/empathie/provenance.json`; review and import an upstream change instead of silently editing the vendored files.

Run `npm run check` and `npm test` after relevant changes. DOM simulation, browser interactions, generation evaluations and production deployment are separate evidence. Do not call an unrun evaluation or an unmerged candidate production-ready.
