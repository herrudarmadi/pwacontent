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

window.addEventListener('load', checkResourceStatus);
function checkResourceStatus() {
    document.getElementById('offlineMessage').style.display = (navigator.onLine ? 'none' : 'block');

    navigator.serviceWorker.ready.then(function(registration) {
        if (registration.active) {
            var allComplete = true;
            var resAnchorAccessed = false;
            for (var i = 1; i <= 4; i++) {
                registration.active.postMessage({
                    type: 'CHECK_RESOURCE_AVAILABILITY',
                    payload: {
                        elementID: 'content0'+i,
                        url: 'content0'+i+'.html'
                    }
                });

                const resStatus = setResourceUIStatus(i);

                if (i == 0 && !resStatus) resAnchorAccessed = true;

                if (resAnchorAccessed) unlockResourceUI(i);
                
                if (!resStatus || resStatus == 'inprogress') 
                    allComplete = false;
                
            }
            if (allComplete) {
                const mainTab = document.getElementById('main-tabs');
                mainTab.classList.add('completed');
                mainTab.querySelector('.active').classList.add('completed');
                document.getElementById('things-to-do').classList.add('completed');
                
            }
        }
    });
}

function setResourceUIStatus(i) {
    const statusContent = localStorage.getItem('status-content0'+i);
    const el = document.getElementById('resource-icon-'+i);

    el.querySelector('.inprogress').style.display = (statusContent == 'inprogress' ? 'block' : 'none');
    el.querySelector('.completed').style.display = (statusContent == 'completed' ? 'block' : 'none');

    return statusContent;
}

function unlockResourceUI(i) {
    const el = document.getElementById('lock0'+i);
    if (!el) return;

    el.style.display = 'none';

    const parentEl = document.getElementById('resource-icon-'+i).parentElement;
    parentEl.classList.remove('locked');
}

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

function view(el, url) {
    navigator.serviceWorker.ready.then(function(registration) {
        if (registration.active) {
            registration.active.postMessage({
                type: 'VIEW_RESOURCE',
                payload: {elementID: el, url: url}
            });
        }
    });

    const statusContent = localStorage.getItem('status-'+el);
    if (statusContent == null || statusContent == 'completed')
        localStorage.setItem('status-'+el, 'inprogress');
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
            document.getElementById('content-viewer').innerHTML = e.data.payload.html;

            registerActivityIndicators();
            
            loadLastVisitedPage();
        // break; remove break, because after view resource, it will also execute the checkmark for resource avail

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
    checkResourceStatus();
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

    const currentPageNum = parseInt(pageTarget.replace('p',''));
    if (currentPageNum == pages.length) {
        localStorage.setItem('status-content01', 'completed');
    }
}

function loadLastVisitedPage() {
    const lastVisitedPage = localStorage.getItem('progress-content01');
    if (lastVisitedPage) {
        gotoPage(lastVisitedPage);
    }
}

var isDarkMode = false;
function toggleDarkMode(el) {
    const viewer = document.getElementById('content-viewer');
    if (el.checked) {
        viewer.classList.add('darkmode');
    } else {
        viewer.classList.remove('darkmode');
    }
}

function isInViewport(item) {

    var bounding = item.getBoundingClientRect(),
        myElementHeight = item.offsetHeight,
        myElementWidth = item.offsetWidth;

    if(bounding.top >= -myElementHeight
        && bounding.left >= -myElementWidth
        && bounding.right <= (window.innerWidth || document.documentElement.clientWidth) + myElementWidth
        && bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) + myElementHeight) {
        return true;
    } else {
        return false;
    }

}

function registerActivityIndicators() {
    const items = document.getElementsByClassName("activity");

    /* Window Scrolling */
    window.addEventListener("scroll", function(){
        for (var i=0; i<items.length; i++)
            if(items[i].checkVisibility() && isInViewport(items[i])) {
                items[i].classList.add("animate__animated","animate__headShake", "animate__repeat-2", "animate__delay-1s"); 
            }
    });
}

function checkQuizAnswer(el, feedbackElID) {
    const feedbackEl = document.getElementById(feedbackElID);
    if (el.dataset.answer == 'yes') {
        feedbackEl.classList.remove('incorrect');
        feedbackEl.classList.add('correct');
    } else {
        feedbackEl.classList.remove('correct');
        feedbackEl.classList.add('incorrect');
    }
    feedbackEl.innerHTML = el.dataset.feedback;
}

function reset() {
    localStorage.clear();
    location.reload();
}   