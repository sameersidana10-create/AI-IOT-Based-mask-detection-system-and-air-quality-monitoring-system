const DEFAULT_LAT = 30.7046;
const DEFAULT_LON = 76.7179;

let latitude = DEFAULT_LAT;
let longitude = DEFAULT_LON;

let currentAQI = null;
let currentTemperature = null;
let currentHumidity = null;

let aqiChart;


/* =========================
   CLOCK
========================= */

function updateClock() {

    const now = new Date();

    document.getElementById("date").textContent =
        now.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

    document.getElementById("time").textContent =
        now.toLocaleTimeString("en-IN");

}

setInterval(updateClock, 1000);
updateClock();


/* =========================
   NAVIGATION
========================= */

const navLinks = document.querySelectorAll(".nav-link");

const pages = {
    dashboard: document.getElementById("dashboardPage"),
    live: document.getElementById("livePage"),
    air: document.getElementById("airPage"),
    reports: document.getElementById("reportsPage"),
    settings: document.getElementById("settingsPage")
};

const titles = {

    dashboard: [
        "Environmental Intelligence",
        "AI-powered mask detection & environmental monitoring"
    ],

    live: [
        "Live Monitoring",
        "Real-time AI camera monitoring"
    ],

    air: [
        "Air Quality",
        "Live environmental conditions"
    ],

    reports: [
        "Reports",
        "SmartMask monitoring analytics"
    ],

    settings: [
        "Settings",
        "SmartMask system configuration"
    ]

};


navLinks.forEach(link => {

    link.addEventListener("click", function(e) {

        e.preventDefault();

        const page = this.dataset.page;

        navLinks.forEach(item => {
            item.classList.remove("active");
        });

        this.classList.add("active");

        Object.values(pages).forEach(pageElement => {
            pageElement.classList.remove("active");
        });

        pages[page].classList.add("active");

        document.getElementById("pageTitle").textContent =
            titles[page][0];

        document.getElementById("pageSubtitle").textContent =
            titles[page][1];

    });

});


/* =========================
   LOCATION
========================= */

function getLocation() {

    if (!navigator.geolocation) {

        document.getElementById("locationText").textContent =
            "Chandigarh / Mohali";

        loadAllData();

        return;
    }

    navigator.geolocation.getCurrentPosition(

        function(position) {

            latitude = position.coords.latitude;
            longitude = position.coords.longitude;

            document.getElementById("locationText").textContent =
                "Your Current Location";

            loadAllData();
        },

        function(error) {

            console.log("Location unavailable:", error);

            document.getElementById("locationText").textContent =
                "Chandigarh / Mohali";

            loadAllData();
        },

        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        }

    );

}


/* =========================
   WEATHER
========================= */

async function fetchWeather() {

    const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m` +
        `&temperature_unit=celsius` +
        `&timezone=auto` +
        `&cachebuster=${Date.now()}`;

    try {

        const response = await fetch(url, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Weather API HTTP error");
        }

        const data = await response.json();

        if (!data.current) {
            throw new Error("Current weather data missing");
        }

        currentTemperature =
            data.current.temperature_2m;

        currentHumidity =
            data.current.relative_humidity_2m;


        document.getElementById("temperature").textContent =
            currentTemperature.toFixed(1) + " °C";

        document.getElementById("humidity").textContent =
            currentHumidity + "%";


        document.getElementById("airTemp").textContent =
            currentTemperature.toFixed(1) + " °C";

        document.getElementById("airHumidity").textContent =
            currentHumidity + "%";


        document.getElementById("reportTemp").textContent =
            currentTemperature.toFixed(1) + " °C";


        updateAI();

    }

    catch(error) {

        console.error("Weather error:", error);

        document.getElementById("temperature").textContent =
            "Unavailable";

        document.getElementById("humidity").textContent =
            "--%";
    }

}


/* =========================
   CURRENT AIR QUALITY
========================= */

async function fetchCurrentAirQuality() {

    const url =
        `https://air-quality-api.open-meteo.com/v1/air-quality` +
        `?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&current=us_aqi,pm2_5,pm10,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone` +
        `&timezone=auto` +
        `&domains=auto` +
        `&cachebuster=${Date.now()}`;

    try {

        const response = await fetch(url, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("Air Quality API HTTP error");
        }

        const data = await response.json();

        console.log("REAL AIR QUALITY DATA:", data);

        if (!data.current) {
            throw new Error("Current AQI data missing");
        }

        currentAQI =
            Math.round(data.current.us_aqi);


        /* AQI */

        document.getElementById("aqiValue").textContent =
            currentAQI;

        document.getElementById("aqiGauge").textContent =
            currentAQI;

        document.getElementById("airPageAQI").textContent =
            currentAQI;

        document.getElementById("reportAQI").textContent =
            currentAQI;


        const status =
            getAQIStatus(currentAQI);


        document.getElementById("aqiStatus").textContent =
            status;

        document.getElementById("aqiGaugeStatus").textContent =
            status;

        document.getElementById("airPageStatus").textContent =
            status;


        /* POLLUTANTS */

        setValue(
            "pm25",
            data.current.pm2_5,
            1
        );

        setValue(
            "pm10",
            data.current.pm10,
            1
        );

        setValue(
            "co",
            data.current.carbon_monoxide,
            1
        );

        setValue(
            "no2",
            data.current.nitrogen_dioxide,
            1
        );

        setValue(
            "so2",
            data.current.sulphur_dioxide,
            1
        );

        setValue(
            "o3",
            data.current.ozone,
            1
        );


        /* AIR PAGE */

        setValue(
            "airPM25",
            data.current.pm2_5,
            1
        );

        setValue(
            "airPM10",
            data.current.pm10,
            1
        );

        setValue(
            "airCO",
            data.current.carbon_monoxide,
            1
        );

        setValue(
            "airNO2",
            data.current.nitrogen_dioxide,
            1
        );


        document.getElementById("apiStatus").textContent =
            "Live environmental API connected";


        updateAQIColor(currentAQI);

        updateAI();

    }

    catch(error) {

        console.error(
            "Air Quality API error:",
            error
        );

        document.getElementById("aqiValue").textContent =
            "N/A";

        document.getElementById("aqiGauge").textContent =
            "N/A";

        document.getElementById("airPageAQI").textContent =
            "N/A";

        document.getElementById("apiStatus").textContent =
            "AQI API connection error";
    }

}


/* =========================
   12 HOUR REAL AQI GRAPH
========================= */

async function fetchAQIHistory() {

    const url =
        `https://air-quality-api.open-meteo.com/v1/air-quality` +
        `?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&hourly=us_aqi` +
        `&past_hours=12` +
        `&forecast_hours=1` +
        `&timezone=auto` +
        `&domains=auto` +
        `&cachebuster=${Date.now()}`;


    try {

        const response = await fetch(url, {
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error("AQI history HTTP error");
        }

        const data = await response.json();

        console.log("REAL AQI HISTORY:", data);

        if (!data.hourly) {
            throw new Error("Hourly AQI missing");
        }


        const labels = [];
        const values = [];


        for (
            let i = 0;
            i < data.hourly.time.length;
            i++
        ) {

            const time =
                new Date(data.hourly.time[i]);


            const aqi =
                data.hourly.us_aqi[i];


            if (
                aqi !== null &&
                aqi !== undefined
            ) {

                labels.push(
                    time.toLocaleTimeString(
                        "en-IN",
                        {
                            hour: "2-digit",
                            minute: "2-digit"
                        }
                    )
                );

                values.push(
                    Math.round(aqi)
                );

            }

        }


        drawAQIChart(labels, values);

    }

    catch(error) {

        console.error(
            "AQI graph error:",
            error
        );

        drawAQIChart(
            ["No data"],
            [0]
        );

    }

}


/* =========================
   CHART
========================= */

function drawAQIChart(labels, values) {

    const canvas =
        document.getElementById("aqiChart");

    if (!canvas) {
        return;
    }


    if (aqiChart) {
        aqiChart.destroy();
    }


    const ctx =
        canvas.getContext("2d");


    aqiChart =
        new Chart(ctx, {

            type: "line",

            data: {

                labels: labels,

                datasets: [

                    {

                        label: "AQI",

                        data: values,

                        borderColor: "#18d6a4",

                        backgroundColor:
                            "rgba(24,214,164,0.12)",

                        borderWidth: 3,

                        fill: true,

                        tension: 0.35,

                        pointRadius: 4,

                        pointHoverRadius: 7,

                        pointBackgroundColor:
                            "#18d6a4",

                        pointBorderColor:
                            "#061019",

                        pointBorderWidth: 2

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                interaction: {
                    intersect: false,
                    mode: "index"
                },

                plugins: {

                    legend: {

                        display: true,

                        labels: {
                            color: "#9eb0c4"
                        }

                    },

                    tooltip: {

                        backgroundColor:
                            "#081522",

                        titleColor:
                            "#ffffff",

                        bodyColor:
                            "#18d6a4",

                        borderColor:
                            "#20384e",

                        borderWidth: 1

                    }

                },

                scales: {

                    x: {

                        ticks: {
                            color: "#71869c"
                        },

                        grid: {
                            color: "rgba(90,110,130,.10)"
                        }

                    },

                    y: {

                        beginAtZero: true,

                        ticks: {
                            color: "#71869c"
                        },

                        grid: {
                            color: "rgba(90,110,130,.10)"
                        }

                    }

                }

            }

        });

}


/* =========================
   AQI STATUS
========================= */

function getAQIStatus(aqi) {

    if (aqi <= 50)
        return "Good";

    if (aqi <= 100)
        return "Moderate";

    if (aqi <= 150)
        return "Unhealthy for Sensitive Groups";

    if (aqi <= 200)
        return "Unhealthy";

    if (aqi <= 300)
        return "Very Unhealthy";

    return "Hazardous";

}


/* =========================
   AQI COLOR
========================= */

function updateAQIColor(aqi) {

    const status =
        getAQIStatus(aqi);

    const elements = [
        document.getElementById("aqiStatus"),
        document.getElementById("aqiGaugeStatus"),
        document.getElementById("airPageStatus")
    ];


    elements.forEach(element => {

        if (!element)
            return;

        if (aqi <= 50) {

            element.style.color =
                "#18d6a4";

        }

        else if (aqi <= 100) {

            element.style.color =
                "#f5c84b";

        }

        else if (aqi <= 150) {

            element.style.color =
                "#ff9f43";

        }

        else {

            element.style.color =
                "#ff5368";

        }

    });

}


/* =========================
   SAFE VALUE
========================= */

function setValue(id, value, decimals) {

    const element =
        document.getElementById(id);

    if (!element)
        return;


    if (
        value === null ||
        value === undefined ||
        Number.isNaN(value)
    ) {

        element.textContent =
            "--";

        return;
    }


    element.textContent =
        Number(value).toFixed(decimals);

}


/* =========================
   AI ANALYSIS
========================= */

function updateAI() {

    if (
        currentAQI === null ||
        currentTemperature === null
    ) {
        return;
    }


    let risk = 0;


    if (currentAQI <= 50)
        risk = 10;

    else if (currentAQI <= 100)
        risk = 30;

    else if (currentAQI <= 150)
        risk = 55;

    else if (currentAQI <= 200)
        risk = 75;

    else
        risk = 95;


    if (currentTemperature >= 35)
        risk += 5;


    if (currentHumidity >= 75)
        risk += 5;


    risk =
        Math.min(100, Math.round(risk));


    document.getElementById("riskScore").textContent =
        risk + "%";


    let riskText;


    if (risk < 30)
        riskText = "Low environmental risk";

    else if (risk < 60)
        riskText = "Moderate environmental risk";

    else if (risk < 80)
        riskText = "High environmental risk";

    else
        riskText = "Critical environmental risk";


    document.getElementById("riskText").textContent =
        riskText;


    document.getElementById("prediction").textContent =
        Math.round(currentAQI * 1.03);


    if (currentAQI <= 50) {

        document.getElementById("aiAnalysis").textContent =
            `AQI is currently ${currentAQI}. Air quality is in the Good range. Temperature is ${currentTemperature.toFixed(1)} °C with ${currentHumidity}% humidity.`;

        document.getElementById("recommendation").textContent =
            "Environmental conditions are currently suitable for normal outdoor activity.";

    }

    else if (currentAQI <= 100) {

        document.getElementById("aiAnalysis").textContent =
            `AQI is ${currentAQI}. Conditions are Moderate. AI is continuously monitoring changes in air quality and temperature.`;

        document.getElementById("recommendation").textContent =
            "Continue monitoring air quality, especially for sensitive individuals.";

    }

    else {

        document.getElementById("aiAnalysis").textContent =
            `AQI is ${currentAQI}. Elevated pollution has been detected by the environmental monitoring system.`;

        document.getElementById("recommendation").textContent =
            "Monitor exposure and consider reducing prolonged outdoor activity when pollution levels remain elevated.";

    }

}


/* =========================
   REAL CAMERA
========================= */


/* =========================
   INITIAL DATA
========================= */

async function loadAllData() {

    await Promise.all([

        fetchWeather(),

        fetchCurrentAirQuality(),

        fetchAQIHistory()

    ]);

}


getLocation();




/* =========================
   REFRESH EVERY 10 MINUTES
========================= */

setInterval(() => {

    fetchWeather();

    fetchCurrentAirQuality();

    fetchAQIHistory();

}, 10 * 60 * 1000);


async function updateMaskDetection() {
    try {
        const response = await fetch("http://127.0.0.1:5000/api/detection");

        if (!response.ok) {
            throw new Error("Detection API is not responding");
        }

        const data = await response.json();
        const maskedCameraCount = document.getElementById("maskedCameraCount");
        const noMaskCameraCount = document.getElementById("noMaskCameraCount");

        if (maskedCameraCount) {
        maskedCameraCount.textContent = data.mask_detected ? "1+" : "0";
        }

        if (noMaskCameraCount) {
        noMaskCameraCount.textContent = data.no_mask_detected ? "1+" : "0";
        }

        const maskCount = document.getElementById("maskCount");
        const noMaskCount = document.getElementById("noMaskCount");
        const peopleDetected = document.getElementById("peopleDetected");
        const aiPeople = document.getElementById("aiPeople");
        const apiStatus = document.getElementById("apiStatus");

        if (maskCount) {
            maskCount.textContent = data.mask_detected ? "Detected" : "0";
        }

        if (noMaskCount) {
            noMaskCount.textContent = data.no_mask_detected ? "Detected" : "0";
        }

        if (peopleDetected) {
            peopleDetected.textContent = data.person_detected ? "1+" : "0";
        }

        if (aiPeople) {
            aiPeople.textContent = data.person_detected ? "1+" : "0";
        }

        if (apiStatus) {
            apiStatus.textContent = "Connected";
        }

        console.log("Live AI detection:", data);

    } catch (error) {
        console.error("Detection update failed:", error);

        const apiStatus = document.getElementById("apiStatus");

        if (apiStatus) {
            apiStatus.textContent = "Disconnected";
        }
    }
}

updateMaskDetection();
setInterval(updateMaskDetection, 1000);

