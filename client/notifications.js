'use strict';

const applicationServerPublicKey = 'BKHcfZBeFKoeKhkgC1L9qbnG-1zrMymK-AuMSlqvgLgLnbKHpVy5hHNFCcwIWnagUvoaXWgNnjoQJnIN6-i0i5E';

const pushButton = document.querySelector('.js-push-btn');

let isSubscribed = false;
let swRegistration = null;

function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function updateSubscriptionOnServer(subscription) {
    const subscriptionId = localStorage.getItem("subscriptionId");
    if (subscription != null) {
        await sendSubscriptionToBackEnd(subscription);
    } else if (subscriptionId != null) {
        console.log("Removing subscription: " + subscriptionId);
        await sendUnsubscribeToBackEnd(subscriptionId);
        localStorage.removeItem("subscriptionId");
    }
}
  
function subscribeUser() {
    const applicationServerKey = urlB64ToUint8Array(applicationServerPublicKey);
    swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
    })
    .then(function(subscription) {
        updateSubscriptionOnServer(subscription);
        isSubscribed = true;
        updateBtn();
    })
    .catch(function(err) {
        console.log('Failed to subscribe the user: ', err);
        updateBtn();
    });
}

function unsubscribeUser() {
    swRegistration.pushManager.getSubscription()
    .then(function(subscription) {
        if (subscription) {
            return subscription.unsubscribe();
        }
    })
    .catch(function(error) {
        console.log('Error unsubscribing', error);
    })
    .then(function() {
        updateSubscriptionOnServer(null);
        isSubscribed = false;
        updateBtn();
    });
}

function sendSubscriptionToBackEnd(subscription) {
    return fetch('/subscribed', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'subscription': subscription
        })
    })
    .then(async function(response) {
        if (!response.ok) {
            throw new Error('Bad status code from server.');
        }
        const result = await response.json();
        const id = result.data.subscriptionId;
        console.log("Registered subscription: " + id)
        localStorage.setItem("subscriptionId", id);
        return result;
    })
    .then(function(responseData) {
        if (!(responseData.data && responseData.data.success)) {
            throw new Error('Bad response from server.');
        }
    });
}

function sendUnsubscribeToBackEnd(id) {
    return fetch('/unsubscribe', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'subscriptionId': id
        })
    })
    .then(function(response) {
        if (!response.ok) {
            throw new Error('Bad status code from server.');
        }
  
        return response.json();
    })
    .then(function(responseData) {
        if (!(responseData.data && responseData.data.success)) {
            throw new Error('Bad response from server.');
        }
    });
}

function initializeUI() {
    pushButton.addEventListener('click', function() {
        pushButton.disabled = true;
        if (isSubscribed) {
            unsubscribeUser();
        } else {
           subscribeUser();
        }
    });

    // Set the initial subscription value
    swRegistration.pushManager.getSubscription()
    .then(function(subscription) {
        isSubscribed = !(subscription === null);
        
        if (isSubscribed) {
            console.log('User IS subscribed.');
        } else {
            console.log('User is NOT subscribed.');
        }
        updateBtn();
    });
}

function updateBtn() {
    if (Notification.permission === 'denied') {
        pushButton.textContent = 'BLOCKED';
        pushButton.disabled = true;
        updateSubscriptionOnServer(null);
        return;
    }
    
    if (isSubscribed) {
        pushButton.textContent = 'AAN';
    } else {
        pushButton.textContent = 'UIT';
    }
    pushButton.disabled = false;
}

if ('serviceWorker' in navigator && 'PushManager' in window) {
    console.log('Service Worker and Push is supported');

    navigator.serviceWorker.register('sw.js')
    .then(function(swReg) {
        console.log('Service Worker is registered', swReg);
  
        swRegistration = swReg;
        initializeUI();
    })
    .catch(function(error) {
        console.error('Service Worker Error', error);
    });
} else {
    console.warn('Push messaging is not supported');
    pushButton.textContent = 'Push Not Supported';
}
