const request = require('request-promise-native');
const express = require("express");
const path = require("path");
const app = express();

var munzeeCache = [{
    munzee_id: 71649885,
    munzee_name: 'Project Escape 42',
    munzee_lat: '51.3297566',
    munzee_long: '5.0679588'
  },
  {
    munzee_id: 71649886,
    munzee_name: 'Project Escape 43',
    munzee_lat: '51.3301048',
    munzee_long: '5.0703809'
  },
  {
    munzee_id: 71649887,
    munzee_name: 'Project Escape 44',
    munzee_lat: '51.3291693',
    munzee_long: '5.0676826'
  }]

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
    return Promise.all(munzeeCache.map(it => logMunzeeActivity(it.munzee_id, it.munzee_name)))
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
    return Promise.all(
            [...Array(48).keys()]
            .filter(it => it >= 40)
            .map(it => getMunzeeIdAndName(`https://www.munzee.com/m/joepweijers/${it}/`)))
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

app.use(express.static('client'));

app.get("/activity", async (req, res) => {
    const activity = await getLatestActivity();
    res.json(activity);
});

app.post("/reload", async (req, res) => {
    const munzeeData = await getMunzeeData();
    munzeeCache = munzeeData;
    res.json(munzeeData);
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});