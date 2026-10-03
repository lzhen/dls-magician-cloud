# DLS Magician platform delivery

- Web app: https://dlsmagician.empathie.ai/
- PWA: installable from the web app after manifest/service worker deployment.
- Chrome extension: source in `chrome-extension/`; load unpacked for testing before Chrome Web Store publication.
- iOS + Android: Capacitor wrapper in `mobile/`, pointed at the production web app. Store publication still requires signing, store records, screenshots, privacy declarations, and review.
