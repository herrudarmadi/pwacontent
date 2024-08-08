// The version of the cache.
const VERSION = "v0.0.0";

// The name of the cache
const CACHE_NAME = `pwacontent-${VERSION}`;
const DYNAMIC_CACHE_NAME = 'dynamic-v1';

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
          if ([CACHE_NAME, DYNAMIC_CACHE_NAME].indexOf(name) == -1) {
            return caches.delete(name);
          }
        }),
      );
      await clients.claim();
    })(),
  );
});

self.addEventListener('message', function(event) {
  console.log('get msg from app');
  console.log(event);

  var p = caches.open(DYNAMIC_CACHE_NAME).then(async function(cache) {
    switch (event.data.type) {
      case 'VIEW_RESOURCE':
        return cache.match(event.data.payload).then(async function(resource) {
          var resourceResponse = 'Content is not available.';
          if (resource) {
            resourceResponse = await resource.text();
          }

          clients.matchAll().then(clients => {
            clients.forEach(client => {
              sendMessageToClient(client, {
                type: 'VIEW_RESOURCE_RESPONSE',
                payload: resourceResponse
              });
            });
          });
        });
        
      break;
        
      case 'CHECK_RESOURCE_AVAILABILITY':
        return cache.match(event.data.payload.url).then(async function(resource) {
          
          clients.matchAll().then(clients => {
            clients.forEach(client => {
              sendMessageToClient(client, {
                type: 'CHECK_RESOURCE_AVAILABILITY_RESPONSE',
                  payload: {
                    elementID: event.data.payload.elementID,
                    status: (resource ? true : false)
                  }
              });
            });
          });
        });
        
      break;
    }
  });

  // Beginning in Chrome 51, event is an ExtendableMessageEvent, which supports
  // the waitUntil() method for extending the lifetime of the event handler
  // until the promise is resolved.
  if ('waitUntil' in event) {
    event.waitUntil(p);
  }

  // Without support for waitUntil(), there's a chance that if the promise chain
  // takes "too long" to execute, the service worker might be automatically
  // stopped before it's complete.
});

function sendMessageToClient(client, message) {
    return new Promise(function(resolve, reject) {
        const msgChan = new MessageChannel();

        msgChan.port1.onmessage = function(event) {
            if (event.data.error) {
                reject(event.data.error);
            } else {
                resolve(event.data);
            }
        };

        client.postMessage(message, [msgChan.port2]);
    });
}

// On fetch, intercept server requests
// and respond with cached responses instead of going to network
self.addEventListener("fetch", (event) => {
  console.log('listening for fetch event ');
  console.log(event);
  // For all other requests, go to the cache first, and then the network.
  event.respondWith(
    (async () => {
      // CHECK STATIC CACHE
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request.url);
      
      if (cachedResponse) {
        // Return the cached response if it's available.
        return cachedResponse;
      } 
      // END CHECK STATIC CACHE

      // CHECK DYNAMIC CACHE
      const dynamicCaches = await caches.open(DYNAMIC_CACHE_NAME);
      const dynamicCacheResponse = await dynamicCaches.match(event.request.url);
      
      if (dynamicCacheResponse) {
        // Return the cached response if it's available.
        return dynamicCacheResponse;
      } 

      // NOT FOUND IN DYNAMIC CACHE, CONTINUE ADDING IT
      
      // IMPORTANT: Clone the request. A request is a stream and
      // can only be consumed once. Since we are consuming this
      // once by cache and once by the browser for fetch, we need
      // to clone the request.
      const fetchRequest = event.request.clone();
      const response = await fetch(fetchRequest);
      
      // Check if we received a invalid response
      if (!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      } 

      // IMPORTANT: Clone the response. A response is a stream
      // and because we want the browser to consume the response
      // as well as the cache consuming the response, we need
      // to clone it so we have two streams.
      var responseToCache = response.clone();
      dynamicCaches.put(event.request, responseToCache);
      
      const htmlString = await response.text();
      
      // Parse the HTML to find additional resources
      const imgRegex = /<img[^>]+src="([^">]+)"/g;
      const audioRegex = /<audio[^>]+src="([^">]+)"/g;
      const videoRegex = /<video[^>]+src="([^">]+)"/g;
      const sourceRegex = /<source[^>]+src="([^">]+)"/g;
      const linkRegex = /<link[^>]+href="([^">]+)"/g;
      const scriptRegex = /<script[^>]+src="([^">]+)"/g;

      const resourceUrls = [];
      const regexes = [imgRegex, audioRegex, videoRegex, sourceRegex, linkRegex, scriptRegex];
      
      console.log('resources inside this html string:');
      // Extract URLs using regex
      regexes.forEach(regex => {
          let match;
          while (match = regex.exec(htmlString)) {
            console.log(match[1]);
            resourceUrls.push(match[1]);
          }
      });
      
      
      // Fetch and cache additional resources
      await Promise.all(
        resourceUrls.map(async function(resourceUrl) {
          const resourceResponse = await fetch(resourceUrl);
              
          if (!resourceResponse || resourceResponse.status !== 200 || resourceResponse.type !== 'basic') {
            // throw new Error('Failed to fetch resource: ' + resourceUrl);
            return; // continue to the next resources
          }
          dynamicCaches.put(resourceUrl, resourceResponse.clone());
        })
      );

      return responseToCache;
    })(),
  );
});
