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
    fetch(url);
    console.log('download clicked for ' + url);
}
