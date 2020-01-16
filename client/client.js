var app = new Vue({
    el: '#app',
    data: {
        loading: false,
        activityEntries: []
    },
    created() {
        this.getDataFromApi();

        setInterval(function () {
            this.getDataFromApi();
        }.bind(this), 20000);
    },
    methods: {
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
            .then(activity => {
                this.loading = false;
                this.activityEntries = activity;
            });
        }
    }
  })