var app = new Vue({
    el: '#app',
    data: {
        numberOfEntries: 15,
        loading: false,
        activityEntries: []
    },
    created() {
        this.getDataFromApi();

        setInterval(function () {
            this.getDataFromApi();
        }.bind(this), 4000);

        const params = new URLSearchParams(window.location.search.substring(1));
        let n = params.get("n");
        if (typeof n !== 'undefined') {
            n = Number.parseInt(n);
            if (!Number.isNaN(n)) {
                this.numberOfEntries = n;
            }
        }
    },
    methods: {
        activityEquals(a, b) {
            if (typeof a === 'undefined' || typeof b === 'undefined') {
                return false;
            }
            return a.entry_at_unix === b.entry_at_unix && a.username === b.username && a.munzee_name === b.munzee_name;
        },
        markNew(newArray, oldArray, equals) {
            for (var i = 0; i < newArray.length; ++i) {
                newArray[i].isNew = true;
                for (var j = 0; j < oldArray.length; ++j) {
                    if (equals(newArray[i], oldArray[j])) {
                        newArray[i].isNew = false;
                        break;
                    }
                }
            }
        },
        open(url) {
            window.open(url, '_blank');
        },
        arrayEquals(a, b, equals) {
            if (a === b) return true;
            if (a == null || b == null || a.length != b.length) return false;

            for (var i = 0; i < a.length; ++i) {
                if (!equals(a[i], b[i])) {
                    return false;
                }
            }
            return true;
        },
        activitiesToString(activities) {
            return activities.map(it => {
                return `<b>${new Date(it.entry_at).toLocaleTimeString("nl-NL", {timeZone: "Europe/Amsterdam"}).slice(0,5)}</b> ${it.username} vond <b>${it.munzee_name}</b> om ${new Date(it.captured_at+"-06:00").toLocaleTimeString("nl-NL", {timeZone: "Europe/Amsterdam"})}`;
            })
        },
        getDataFromApi() {
            this.loading = true;
            fetch('/activity')
            .then(res => {
                return res.json();
            })
            .catch(function (err) {
                this.loading = false;
                console.error(err);
            })
            .then(newActivity => {
                this.loading = false;
                reducedActivities = newActivity.slice(0, this.numberOfEntries);
                if (this.activityEntries.length > 0) {
                    this.markNew(reducedActivities, this.activityEntries, this.activityEquals);
                }
                this.activityEntries = reducedActivities;
            });
        }
    }
  })