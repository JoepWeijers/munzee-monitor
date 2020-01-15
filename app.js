const request = require('request-promise-native');

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

function logMunzeeActivity(munzeeId, munzeeName) {
    return request.post(
        getRequestOptions("https://api.munzee.com/munzee/logs/", {
            "munzee_id": munzeeId,
            "closest": 0
        }))
        .then(function (response) {
            const result = response.data;
            result.forEach(it => { 
                it["munzee_id"] = munzeeId; 
                it["munzee_name"] = munzeeName;
            });
            return result;
        })
        .catch(function (err) {
            console.error(err);
        });
}

function getLatestActivity() {
    return Promise.all([
                logMunzeeActivity(71649885, "42"), 
                logMunzeeActivity(71649886, "43"),
                logMunzeeActivity(71649887, "44")])
            .then(munzees => {
                return munzees
                    .flat()
                    .filter(it => it.type === 'capture')
                    .sort((a, b) => a.entry_at_unix - b.entry_at_unix)
                    .reverse()
                    .map(it => {
                        return `${new Date(it.entry_at).toLocaleTimeString("nl-NL", {timeZone: "Europe/Amsterdam"})}: ${it.username} vond ${it.munzee_name} om ${new Date(it.captured_at+"-06:00").toLocaleTimeString("nl-NL", {timeZone: "Europe/Amsterdam"})}`;
                    })
                });
}

function getMunzeeData() {
    return Promise.all([getMunzeeIdAndName("https://www.munzee.com/m/joepweijers/42/")])
        .then(munzees => {
            return munzees
                // .filter(it => it.deployed)
                .map(it => { 
                    return {
                        "munzee_id" : it.munzee_id,
                        "munzee_name" : it.friendly_name,
                        "munzee_lat" : it.latitude,
                        "munzee_long" : it.longitude
                    }
                })
        });
}

const print = async (func) => {
    const data = await func();
    console.log(data);
}

print(getMunzeeData);

print(getLatestActivity);