var app = new Vue({
    el: '#app',
    data: {
        loading: false,
        newEntries: false,
        activityEntries: []
    },
    created() {
        this.getDataFromApi();

        setInterval(function () {
            this.getDataFromApi();
        }.bind(this), 4000);
    },
    methods: {
        activityEquals(a, b) {
            if (typeof a === 'undefined' || typeof b === 'undefined') {
                return false;
            }
            return a.entry_at_unix === b.entry_at_unix && a.username === b.username && a.munzee_name === b.munzee_name;
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
                return `${new Date(it.entry_at).toLocaleTimeString("nl-NL", {timeZone: "Europe/Amsterdam"})}: ${it.username} vond ${it.munzee_name} om ${new Date(it.captured_at+"-06:00").toLocaleTimeString("nl-NL", {timeZone: "Europe/Amsterdam"})}`;
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
                const newActivityFormatted = this.activitiesToString(newActivity);
                this.newEntries = !this.arrayEquals(this.activityEntries, newActivityFormatted, (a,b) => a === b);
                this.activityEntries = newActivityFormatted;
            });
        }
    }
  })