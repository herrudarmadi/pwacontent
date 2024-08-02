// Check if the browser is online or offline
window.addEventListener('offline', () => {
    // Show the offline message
    document.getElementById('offlineMessage').style.display = 'block';
});

window.addEventListener('online', () => {
    // if (isSending) {
    //   registerSync();
    // }
    // Hide the offline message
    document.getElementById('offlineMessage').style.display = 'none';
});

window.addEventListener('load', function() {
    document.getElementById('offlineMessage').style.display = (navigator.onLine ? 'none' : 'block');
});

function download(el, url) {
    fetch(url)
        .then(() => {
            el.innerText = 'Downloaded';
        }).catch(e => {
            console.error(e);
        });
    console.log('download clicked for ' + url);
}

function view(url) {
    navigator.serviceWorker.ready.then(function(registration) {
        if (registration.active) {
            registration.active.postMessage({
                type: 'VIEW_RESOURCE',
                payload: url
            });
        }
    });
}

navigator.serviceWorker.addEventListener('message', function(e) {
    console.log('received message from sw');
    console.log(e);
    
    switch (e.data.type) {
        case 'VIEW_RESOURCE_RESPONSE':
            document.getElementById('content-viewer').innerHTML = e.data.payload;
            loadLastVisitedPage();
        break;
    }
});

// content page function
function gotoPage(el) {
    const pages = document.getElementsByClassName('pages');
    const pageTarget = el.getAttribute('href').replace('#','');
    pages.forEach(p => {
      p.style.display = p.getAttribute('id') == pageTarget ? 'block' : 'none';
    });
    // store the progress for the next visit.
    localStorage.setItem('progress-content01', pageTarget);
}

function loadLastVisitedPage() {
    const lastVisitedPage = localStorage.getItem('progress-content01');
    if (lastVisitedPage) {
        gotoPage(lastVisitedPage);
    }
}
