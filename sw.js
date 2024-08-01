// The version of the cache.
const VERSION = "v0.0.0";

// The name of the cache
const CACHE_NAME = `pwacontent-${VERSION}`;

const DIR = '/pwacontent';

// The static resources that the app needs to function.
const APP_STATIC_RESOURCES = [
  DIR + "/",
  DIR + "/index.html",
  DIR + "/app.js",
  DIR + "/style.css",
];

// On install, cache the static resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      cache.addAll(APP_STATIC_RESOURCES);
    })(),
  );
});

// delete old caches on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        }),
      );
      await clients.claim();
    })(),
  );
});

// On fetch, intercept server requests
// and respond with cached responses instead of going to network
self.addEventListener("fetch", (event) => {
  console.log('listening for fetch event ');
  console.log(event);
  // For all other requests, go to the cache first, and then the network.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request.url);
      
      if (cachedResponse) {
        // Return the cached response if it's available.
        return cachedResponse;
      }

      // IMPORTANT: Clone the request. A request is a stream and
      // can only be consumed once. Since we are consuming this
      // once by cache and once by the browser for fetch, we need
      // to clone the request.
      var fetchRequest = event.request.clone();
      // var fetchRequest = new Request(event.data.url, {mode: 'no-cors'});
      return fetch(fetchRequest)
          .then(function(response) {
                    // Check if we received a valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // IMPORTANT: Clone the response. A response is a stream
                    // and because we want the browser to consume the response
                    // as well as the cache consuming the response, we need
                    // to clone it so we have two streams.
                    var responseToCache = response.clone();

                    caches.open('dynamic-v1').then(function(cache) {
                        cache.put(event.request, responseToCache);
                    });

                    return response.text();
                }
            ).then(function(htmlString) {
                  // Parse the HTML to find additional resources
                  const imgRegex = /<img[^>]+src="([^">]+)"/g;
                  const audioRegex = /<audio[^>]+src="([^">]+)"/g;
                  const videoRegex = /<video[^>]+src="([^">]+)"/g;
                  const sourceRegex = /<source[^>]+src="([^">]+)"/g;
                  const linkRegex = /<link[^>]+href="([^">]+)"/g;
                  const scriptRegex = /<script[^>]+src="([^">]+)"/g;

                  const resourceUrls = [];
                  const regexes = [imgRegex, audioRegex, videoRegex, sourceRegex, linkRegex, scriptRegex];
                  
                  // Extract URLs using regex
                  regexes.forEach(regex => {
                      let match;
                      while (match = regex.exec(htmlString)) {
                          resourceUrls.push(match[1]);
                      }
                  });
      
                  // Fetch and cache additional resources
                  resourceUrls.forEach(resourceUrl => {
                      fetch(new Request(resourceUrl, {mode: 'no-cors'}))
                          .then(resourceResponse => {
                              if (!resourceResponse || resourceResponse.status !== 200 || resourceResponse.type !== 'basic') {
                                  throw new Error('Failed to fetch resource: ' + resourceUrl);
                              }
                              caches.open('dynamic-v1').then(cache => {
                                  cache.put(resourceUrl, resourceResponse.clone());
                              });
                          })
                          .catch(error => {
                              console.error('Failed to cache resource: ', resourceUrl, error);
                          });
                  });
            });
      
      // If resource isn't in the cache, return a 404.
      // return new Response(null, { status: 404 });
    })(),
  );
});
