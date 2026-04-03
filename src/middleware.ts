'use strict';

function embedResponse(data) {
  const embedParam = data.embed;

  // embedAncestors for the /embed/ route
  const embedAncestors = [
    'https://mississauga-demo.azule.xyz',
    'http://localhost:5174', // Temporary whitelist for demo
    'https://example-other-origin.com'
  ];

  // Other logic...
}

module.exports = embedResponse;