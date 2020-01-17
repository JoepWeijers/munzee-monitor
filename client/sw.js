self.addEventListener('push', function(event) {
    console.log('[Service Worker] Push Received.');
    console.log(`[Service Worker] Push had this data: "${event.data.text()}"`);

    const title = 'Munzee Monitor';
    const options = {
        body: event.data.text(),
        icon: 'munzee-hunter.png'
    };

    event.waitUntil(self.registration.showNotification(title, options));
});
  