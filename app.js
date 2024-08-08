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

    navigator.serviceWorker.ready.then(function(registration) {
        if (registration.active) {
            registration.active.postMessage({
                type: 'CHECK_RESOURCE_AVAILABILITY',
                payload: {
                    elementID: 'content01',
                    url: 'content01.html'
                }
            });
            registration.active.postMessage({
                type: 'CHECK_RESOURCE_AVAILABILITY',
                payload: {
                    elementID: 'content02',
                    url: 'content02.html'
                }
            });
        }
    });
});

function download(el, url) {
    fetch(url)
        .then(() => {
            // el.innerText = 'Downloaded';
            el.querySelector('.act-download').style.display = "none";
            el.querySelector('.act-downloaded').style.display = "";
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
            const outlineArea = document.getElementById('course-outline');
            const contentArea = document.getElementById('content-area');
            outlineArea.style.display = "none";
            contentArea.style.display = "block";
            document.getElementById('content-viewer').innerHTML = e.data.payload;
            loadLastVisitedPage();
        break;

        case 'CHECK_RESOURCE_AVAILABILITY_RESPONSE':
            const element = document.getElementById(e.data.payload.elementID);
            element.querySelector('.act-download').style.display = e.data.payload.status ? "none" : "";
            element.querySelector('.act-downloaded').style.display = e.data.payload.status ? "" : "none";
        break;
    }
});

document.getElementById('back-to-course-outline').onclick = function() {
    const outlineArea = document.getElementById('course-outline');
    const contentArea = document.getElementById('content-area');
    outlineArea.style.display = "block";
    contentArea.style.display = "none";
};

// content page function
function gotoPage(el) {
    const pages = document.getElementsByClassName('pages');
    const pageTarget = el.nodeType ? el.getAttribute('href').replace('#','') : el;
    
    for (var i = 0; i < pages.length; i++) {
      const p = pages[i];
      p.style.display = p.getAttribute('id') == pageTarget ? 'block' : 'none';
    }
    // store the progress for the next visit.
    localStorage.setItem('progress-content01', pageTarget);
}

function loadLastVisitedPage() {
    const lastVisitedPage = localStorage.getItem('progress-content01');
    if (lastVisitedPage) {
        gotoPage(lastVisitedPage);
    }
}
