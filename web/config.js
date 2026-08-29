// GTO Trainer v1.0 runs as one Cloudflare Worker: static UI + /api/*.
// Clear the old two-project URL setting so legacy localStorage can never override same-origin routing.
localStorage.removeItem('gto-trainer-api-base');
window.GTO_CONFIG = {
  apiBaseUrl: window.location.origin
};
