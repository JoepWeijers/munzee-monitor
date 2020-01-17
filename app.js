const request = require('request-promise-native');
const express = require("express");
const app = express();
const bodyParser = require('body-parser');
const webpush = require('web-push');

const port = process.env.PORT || 80;
const privateKey = process.env.SW_PRIVATE_KEY;
const publicKey = process.env.SW_PUBLIC_KEY || "BKHcfZBeFKoeKhkgC1L9qbnG-1zrMymK-AuMSlqvgLgLnbKHpVy5hHNFCcwIWnagUvoaXWgNnjoQJnIN6-i0i5E";
const testMode = process.env.TEST_MODE && (process.env.TEST_MODE == 'true');
const refreshRate = process.env.REFRESH_RATE || 20000;

var activityCache = [];

var munzeeCache = [{
    munzee_id: 71649885,
    munzee_name: 'Project Escape 42',
    munzee_url: "http:\/\/www.munzee.com\/m\/joepweijers\/42\/",
    munzee_lat: '51.3297566',
    munzee_long: '5.0679588'
  },
  {
    munzee_id: 71649886,
    munzee_name: 'Project Escape 43',
    munzee_url: "http:\/\/www.munzee.com\/m\/joepweijers\/43\/",
    munzee_lat: '51.3301048',
    munzee_long: '5.0703809'
  },
  {
    munzee_id: 71649887,
    munzee_name: 'Project Escape 44',
    munzee_url: "http:\/\/www.munzee.com\/m\/joepweijers\/44\/",
    munzee_lat: '51.3291693',
    munzee_long: '5.0676826'
  }]

const subscriptionCache = {};

const notificationOptions = {
    vapidDetails: {
        subject: 'https://munzee-monitor.herokuapp.com/',
        publicKey: publicKey,
        privateKey: privateKey
    },
    TTL: 60 * 60
};

let nextSubscriptionId = 0;

async function sendNotifications(data) {
    return Promise.all(Object.values(subscriptionCache)
        .filter(subscription => (typeof subscription.endpoint !== 'undefined'))
        .map(subscription => {
            webpush.sendNotification(
                subscription,
                data,
                notificationOptions
            )
            .catch(err => {
                console.log("Failed to push to one target");
            });
    }));
}

function isValidSaveRequest(req) {
    return (typeof req.body !== 'undefined') && 
            (typeof req.body.subscription !== 'undefined') &&
            (typeof req.body.subscription.endpoint !== 'undefined');
}

async function saveSubscriptionToDatabase(subscription) {
    const subscriptionId = ++nextSubscriptionId;
    console.log("Registering new subscription: " + subscriptionId);
    subscriptionCache[subscriptionId] = subscription;
    return subscriptionId;
}

async function removeSubscriptionToDatabase(subscriptionId) {
    console.log("Removing subscription: " + subscriptionId);
    delete subscriptionCache[subscriptionId];
    return subscriptionId;
}

function getRequestOptions(url, body) {
    return {
        "url" : url,
        "headers" : {
            "Authorization" : "Bearer " + process.env.MUNZEE_BEARER_TOKEN
        },
        "body" : body,
        "json": true
    }
}

function getMunzeeIdAndName(url) {
    return request.post(
        getRequestOptions("https://api.munzee.com/munzee/", {
            "url": url,
            "closest": 0
        }))
        .then(function (response) {
            return response.data;
        })
        .catch(function (err) {
            console.error(err);
        });
}

function logMunzeeActivity(munzeeId, munzeeName, munzeeUrl) {
    return request.post(
        getRequestOptions("https://api.munzee.com/munzee/logs/", {
            "munzee_id": munzeeId,
            "closest": 0
        }))
        .then(function (response) {
            const result = response.data;
            if (result == null) {
                return [];
            }
            result.forEach(it => { 
                it["munzee_id"] = munzeeId;
                it["munzee_name"] = munzeeName;
                it["munzee_url"] = munzeeUrl;
            });
            return result;
        })
        .catch(function (err) {
            console.error(err);
            return [];
        });
}

const activitySort = (a, b) => a.entry_at_unix - b.entry_at_unix;

function getLatestActivity() {
    return Promise.all(munzeeCache.map(it => logMunzeeActivity(it.munzee_id, it.munzee_name, it.munzee_url)))
            .then(munzees => {
                return munzees
                    .flat()
                    .filter(it => it.type === 'capture')
                    .sort(activitySort)
                    .reverse()
                });
}

const activitiesToString = (activities) => {
    return activities.map(it => {
        return `${new Date(it.entry_at).toLocaleTimeString("nl-NL", {timeZone: "Europe/Amsterdam"}).slice(0, 5)}: ${it.username} vond ${it.munzee_name} om ${new Date(it.captured_at+"-06:00").toLocaleTimeString("nl-NL", {timeZone: "Europe/Amsterdam"})}`;
    })
}

function getMunzeeData() {
    return Promise.all(
            [...Array(48).keys()]
            .filter(it => !testMode || (it >= 40))
            .map(it => getMunzeeIdAndName(`https://www.munzee.com/m/joepweijers/${it}/`)))
        .then(munzees => {
            return munzees
                .filter(it => testMode || it.deployed)
                .map(it => { 
                    return {
                        "munzee_id" : it.munzee_id,
                        "munzee_name" : it.friendly_name,
                        "munzee_url" : it.code,
                        "munzee_lat" : it.latitude,
                        "munzee_long" : it.longitude
                    }
                })
        });
}

function activityEqualTo(a) {
    return (it) => {
        return activityEquals(a, it);
    }
}

const activityEquals = (a, b) => {
    if (typeof a === 'undefined' || typeof b === 'undefined') {
        return false;
    }
    return a.entry_at_unix === b.entry_at_unix && a.username === b.username && a.munzee_name === b.munzee_name;
}

const print = async (func) => {
    const data = await func();
    console.log(data);
}

const refreshActivityCache = async () => {
    const activity = await getLatestActivity();
    const newActivity = activity.filter(it => {
        return (typeof activityCache.find(activityEqualTo(it)) === 'undefined');
    });
    if (newActivity.length === 0) {
        return [];
    }
    activityCache = activityCache
            .concat(newActivity)
            .sort(activitySort)
            .reverse()
            .slice(0, 30);
    
    sendNotifications(activitiesToString(newActivity).join("\n"));

    return newActivity;
}

refreshActivityCache();

setInterval(refreshActivityCache, refreshRate);

app.use(express.static('client'));
app.use(bodyParser.json());

app.get("/refreshactivity", async (req, res) => {
    const newActivity = await refreshActivityCache();
    res.json(newActivity);
});

app.get("/activity", (req, res) => {
    res.json(activityCache);
});

app.post("/reload", async (req, res) => {
    const munzeeData = await getMunzeeData();
    munzeeCache = munzeeData;
    res.json(munzeeData);
});

app.post('/push', (req, res) => {
    sendNotifications(req.body.data)
    .then(() => {
        res.status(200).send({success: true});
    })
    .catch((err) => {
        if (err.statusCode) {
            res.status(err.statusCode).send(err.body);
        } else {
            res.status(400).send(err.message);
        }
    });
});

app.post('/unsubscribe', function (req, res) {
    if (typeof req.body == 'undefined' && typeof req.body.subscriptionId !== 'undefined') {
        res.status(400);
        res.send(JSON.stringify({
            error: {
                id: 'unable-to-unsubscribe',
                message: '{ subscriptionId : 1} required'
            }
        }));
        return;
    }
    return removeSubscriptionToDatabase(req.body.subscriptionId)
    .then(function(subscriptionId) {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ data: { success: true, subscriptionId: subscriptionId } }));
    })
    .catch(function(err) {
        res.status(500);
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({
            error: {
                id: 'unable-to-unscubscribe',
                message: 'The unsubscribe was received but we were unable to remove it to our database.'
            }
        }));
    });

});

app.post('/subscribed', function (req, res) {
    if (!isValidSaveRequest(req, res)) {
        res.status(400);
        res.send(JSON.stringify({
            error: {
                id: 'unable-to-save-subscription',
                message: 'The subscription did not contain all required fields.'
            }
        }));
        return;
    }

    return saveSubscriptionToDatabase(req.body.subscription)
        .then(function(subscriptionId) {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ data: { success: true, subscriptionId: subscriptionId } }));
        })
        .catch(function(err) {
            res.status(500);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({
                error: {
                    id: 'unable-to-save-subscription',
                    message: 'The subscription was received but we were unable to save it to our database.'
                }
            }));
        });
});  

app.listen(port, () => {
    if (testMode) {
        console.log("Running in testing mode");
    }
    console.log(`Backend refreshes every ${refreshRate} ms`)
    console.log(`Server running on port ${port}`);
});