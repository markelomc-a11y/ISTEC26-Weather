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

// ---------- Global state for dynamic canvas ----------
let currentEnv = {
  cityName: "Berlin",
  temp: 12.0,
  tempMin: 8.0,
  tempMax: 18.0,
  pm25: 8.0,
  aqi: 25,
  unit: "°C",
  isLoading: true
};

let canvasArt;
let rotationOffset = 0;
let autoCycleInterval = null;
let currentCityIndex = 0;

// ---------- p5.js Setup ----------
function setup() {
  const container = select("#canvas-container");
  canvasArt = createCanvas(560, 560);
  canvasArt.parent("canvas-container");
  colorMode(HSB, 360, 100, 100, 100);
  frameRate(30);
  noFill();

  // Populate dropdown
  const sel = select("#citySelect");
  CITIES.forEach((city, i) => {
    const opt = createElement("option", city.name);
    opt.attribute("value", i);
    opt.parent(sel);
  });

  // Load first city
  loadFullCityData(CITIES[0]);
  startAutoCycle();

  // React to manual dropdown change (reset auto cycle timer)
  sel.changed(() => {
    const newIdx = int(sel.value());
    if (newIdx !== currentCityIndex) {
      currentCityIndex = newIdx;
      loadFullCityData(CITIES[currentCityIndex]);
      resetAutoCycle(); // restart timer
    }
  });
}

// ---------- Auto cycle every 5 seconds ----------
function startAutoCycle() {
  if (autoCycleInterval) clearInterval(autoCycleInterval);
  autoCycleInterval = setInterval(() => {
    // move to next city (circular)
    currentCityIndex = (currentCityIndex + 1) % CITIES.length;
    // update dropdown UI without triggering 'changed' event twice
    const sel = select("#citySelect");
    sel.value(currentCityIndex);
    loadFullCityData(CITIES[currentCityIndex]);
  }, 5000); // 5 seconds
}

function resetAutoCycle() {
  if (autoCycleInterval) {
    clearInterval(autoCycleInterval);
    startAutoCycle(); // fresh interval
  }
}

// ---------- Load both APIs (fixed air quality URL) ----------
async function loadFullCityData(city) {
  const displayDiv = select("#display");
  displayDiv.html('<p id="loading">🌑 loading thermal data...</p>');

  currentEnv.isLoading = true;
  currentEnv.cityName = city.name;

  // 1) Temperature forecast (hourly)
  const tempUrl = `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${city.lat}&longitude=${city.lon}` +
    `&hourly=temperature_2m&forecast_days=1`;

  // 2) Air Quality – CORRECT ENDPOINT
  const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality` +
    `?latitude=${city.lat}&longitude=${city.lon}` +
    `&current=pm10,pm2_5,european_aqi&timezone=auto`;

  try {
    const [tempRes, aqRes] = await Promise.all([
      fetch(tempUrl).then(r => r.json()),
      fetch(aqUrl).then(r => r.json())
    ]);

    // Temperature
    const times = tempRes.hourly.time;
    const temps = tempRes.hourly.temperature_2m;
    const unit = tempRes.hourly_units.temperature_2m;
    currentEnv.unit = unit;
    if (temps && temps.length > 0) {
      currentEnv.temp = temps[0];
      currentEnv.tempMin = Math.min(...temps);
      currentEnv.tempMax = Math.max(...temps);
    } else {
      currentEnv.temp = 15;
      currentEnv.tempMin = 10;
      currentEnv.tempMax = 22;
    }

    // Air Quality
    if (aqRes.current) {
      currentEnv.pm25 = aqRes.current.pm2_5 !== undefined ? aqRes.current.pm2_5 : 12;
      currentEnv.aqi = aqRes.current.european_aqi !== undefined ? aqRes.current.european_aqi : 35;
    } else {
      currentEnv.pm25 = 9 + Math.sin(Date.now() * 0.001) * 4;
      currentEnv.aqi = 40;
    }

    currentEnv.pm25 = constrain(currentEnv.pm25, 0, 120);
    currentEnv.aqi = constrain(currentEnv.aqi, 0, 150);
    currentEnv.temp = constrain(currentEnv.temp, -10, 45);

    renderTemperatures(city.name, times, temps, unit);
    currentEnv.isLoading = false;
  } catch (err) {
    console.error("Data fetch error", err);
    select("#display").html(`<p style="color:salmon;">⚠️ gothic error: ${err}</p>`);
    currentEnv.temp = 15;
    currentEnv.pm25 = 12;
    currentEnv.aqi = 45;
    currentEnv.isLoading = false;
  }
}

// ---------- Classic temperature panel (unchanged) ----------
function renderTemperatures(cityName, times, temps, unit) {
  const display = select("#display");
  display.html("");
  const title = createElement("h2", `📍 ${cityName} — Today's Temperatures`);
  title.parent(display);
  for (let i = 0; i < times.length; i += 3) {
    const time = times[i].split("T")[1];
    const temp = temps[i];
    const row = createElement("div");
    row.class("temp-row");
    row.html(`<span>${time}</span><span class="temp-value">${temp} ${unit}</span>`);
    row.parent(display);
  }
}

// ---------- p5.js draw (unchanged – dynamic visual mapping) ----------
function draw() {
  background(0, 0, 0, 12);
  if (currentEnv.isLoading) {
    push();
    textAlign(CENTER, CENTER);
    textFont('"Cinzel", serif');
    fill(70, 30, 45, 80);
    noStroke();
    textSize(24);
    text("🜁  LOADING  🜟", width/2, height/2);
    textSize(14);
    fill(50, 25, 60);
    text("invoking data spirits", width/2, height/2 + 40);
    pop();
    return;
  }

  let tNorm = constrain(map(currentEnv.temp, -10, 40, 0, 1), 0, 1);
  let pmNorm = constrain(currentEnv.pm25 / 80, 0, 1);
  let aqiNorm = constrain(currentEnv.aqi / 100, 0, 1);
  let speedBase = map(tNorm, 0, 1, 0.002, 0.045);
  rotationOffset += speedBase;

  let particleCount = int(map(pmNorm, 0, 1, 20, 280));
  let mainWeight = map(aqiNorm, 0, 1, 0.8, 4.2);
  let ghostWeight = map(aqiNorm, 0, 1, 0.5, 2.2);
  let baseHue = map(tNorm, 0, 1, 220, 25);
  let satVal = map(pmNorm, 0, 1, 40, 92);
  let brightVal = map(tNorm, 0, 1, 45, 85);
  let maxRadius = map(tNorm, 0, 1, 180, 270);
  let innerRadius = map(1 - tNorm, 0, 1, 40, 110);

  push();
  translate(width / 2, height / 2);
  rotate(rotationOffset * 0.7);

  for (let i = 0; i < 12; i++) {
    let angle = TWO_PI / 12 * i + rotationOffset;
    let x1 = cos(angle) * (maxRadius - 20);
    let y1 = sin(angle) * (maxRadius - 20);
    let x2 = cos(angle + rotationOffset * 1.3) * (innerRadius + 15 * pmNorm);
    let y2 = sin(angle + rotationOffset * 1.3) * (innerRadius + 15 * pmNorm);
    strokeWeight(mainWeight);
    stroke(baseHue, satVal, brightVal, 65 + aqiNorm * 30);
    line(x1, y1, x2, y2);
    strokeWeight(ghostWeight);
    stroke((baseHue + 30) % 360, satVal * 0.8, brightVal, 35 + aqiNorm * 25);
    line(x1 * 0.7, y1 * 0.7, x2 * 1.2, y2 * 1.2);
  }

  beginShape(POINTS);
  for (let p = 0; p < particleCount; p++) {
    let rad = map(p, 0, particleCount, 40, maxRadius);
    let ang = frameCount * 0.02 * (1 + pmNorm) + p * 0.5 + rotationOffset;
    let xOff = sin(ang * 5 + p) * (8 * pmNorm);
    let yOff = cos(ang * 3.7) * (8 * pmNorm);
    let px = cos(ang) * rad + xOff;
    let py = sin(ang) * rad + yOff;
    let particleHue = (baseHue + p * 2) % 360;
    stroke(particleHue, satVal + 10, brightVal + 10, 65);
    strokeWeight(map(pmNorm, 0, 1, 1.5, 4.5));
    point(px, py);
  }
  endShape();

  let coreSize = map(tNorm, 0, 1, 14, 36) + pmNorm * 12;
  fill(baseHue, satVal, brightVal, 50 + aqiNorm * 30);
  noStroke();
  ellipse(0, 0, coreSize, coreSize);
  fill(baseHue, satVal, brightVal, 85);
  ellipse(0, 0, coreSize * 0.5, coreSize * 0.5);
  pop();

  textFont('"Cinzel", "Courier New", monospace');
  textAlign(CENTER, CENTER);
  let textScale = map(tNorm, 0, 1, 12, 20);
  let ghostTextScale = map(aqiNorm, 0, 1, 9, 15);
  push();
  drawingContext.shadowBlur = 8;
  drawingContext.shadowColor = `hsla(${baseHue}, 70%, 40%, 0.6)`;
  fill(baseHue, satVal, brightVal, 92);
  noStroke();
  textSize(textScale + 2);
  text(`${currentEnv.cityName}  ·  ${nf(currentEnv.temp, 1, 1)}${currentEnv.unit}`, width/2, height - 38);
  textSize(ghostTextScale);
  fill((baseHue + 40) % 360, satVal * 0.7, brightVal, 80);
  text(`PM2.5 ${nf(currentEnv.pm25, 1, 0)} µg/m³  ·  AQI ${floor(currentEnv.aqi)}`, width/2, height - 18);
  pop();

  push();
  textAlign(LEFT, TOP);
  textSize(11);
  fill(40, 30, 70, 60);
  text("◈ temp amplitude ◈", 15, 15);
  text(`min ${nf(currentEnv.tempMin, 1, 1)}°  max ${nf(currentEnv.tempMax, 1, 1)}°`, 15, 32);
  fill((baseHue + 180) % 360, 60, 70, 70);
  text("◈ air breath ◈", width - 130, 15);
  text(`particles: ${particleCount}`, width - 130, 32);
  pop();
}