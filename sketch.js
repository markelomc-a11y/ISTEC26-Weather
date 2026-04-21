// City list with coordinates
const CITIES = [
  { name: "Berlin",    lat: 52.52,  lon: 13.41  },
  { name: "Lisbon",    lat: 38.72,  lon: -9.14  },
  { name: "Porto",     lat: 41.15,  lon: -8.61  },
  { name: "London",    lat: 51.51,  lon: -0.13  },
  { name: "Paris",     lat: 48.85,  lon: 2.35   },
  { name: "New York",  lat: 40.71,  lon: -74.01 },
  { name: "Tokyo",     lat: 35.68,  lon: 139.69 },
  { name: "Sydney",    lat: -33.87, lon: 151.21 },
  { name: "São Paulo", lat: -23.55, lon: -46.63 },
  { name: "Cairo",     lat: 30.06,  lon: 31.25  },
];

function setup() {
  noCanvas();

  // Populate dropdown
  const sel = select("#citySelect");
  CITIES.forEach((city, i) => {
    const opt = createElement("option", city.name);
    opt.attribute("value", i);
    opt.parent(sel);
  });

  // Load first city on start
  loadCity(CITIES[0]);

  // React to dropdown change
  sel.changed(() => {
    const city = CITIES[int(sel.value())];
    loadCity(city);
  });
}

function loadCity(city) {
  const display = select("#display");
  display.html('<p id="loading">Loading...</p>');

  const url = `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${city.lat}&longitude=${city.lon}` +
    `&hourly=temperature_2m&forecast_days=1`;

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const times = data.hourly.time;
      const temps = data.hourly.temperature_2m;
      const unit  = data.hourly_units.temperature_2m;
      renderTemperatures(city.name, times, temps, unit);
    })
    .catch((err) => {
      display.html(`<p style="color:salmon;">Error loading data: ${err}</p>`);
    });
}

function renderTemperatures(cityName, times, temps, unit) {
  const display = select("#display");
  display.html("");

  const title = createElement("h2", `📍 ${cityName} — Today's Temperatures`);
  title.parent(display);

  // Show every 3 hours to keep it readable
  for (let i = 0; i < times.length; i += 3) {
    const time = times[i].split("T")[1]; // extract HH:MM
    const temp = temps[i];

    const row = createElement("div");
    row.class("temp-row");
    row.html(`<span>${time}</span><span class="temp-value">${temp} ${unit}</span>`);
    row.parent(display);
  }
}