// Import the JSON file with the data.
import data from '../data/grid/jobs-9079201-results-Midtown_Manhattan.json' with { type: 'json' };

document.addEventListener("DOMContentLoaded", function () {
  // Extract the segments.
  const segments = data.network.segmentResults;

  // Set up the map.
  const map = L.map('map');

  // Auto-fit bounds from all coordinates.
  let allCoords = [];

  segments.forEach(seg => {
    seg.shape.forEach(p => {
      allCoords.push([p.latitude, p.longitude]);
    });
  });

  map.fitBounds(allCoords);

  // Draw the map.
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  setTimeout(() => {
    map.invalidateSize();
  }, 100);

  // Create a normal distribution.
  function randomNormal(mean, stdDev) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * stdDev;
  }

  // Create a color scale.
  function getColor(speed, min, max) {
    const ratio = Math.max(0, Math.min(1, (speed - min) / (max - min)));
    const r = Math.floor(255 * (1 - ratio));
    const g = Math.floor(255 * ratio);
    return `rgb(${r},${g},0)`;
  }

  // Draw a random point on the polyline.
  function randomPointOnPolyline(coords) {
    // Compute segment lengths
    let lengths = [];
    let totalLength = 0;

    for (let i = 0; i < coords.length - 1; i++) {
      const dx = coords[i+1][0] - coords[i][0];
      const dy = coords[i+1][1] - coords[i][1];
      const len = Math.sqrt(dx*dx + dy*dy);
      lengths.push(len);
      totalLength += len;
    }

    // Pick a random distance.
    let r = Math.random() * totalLength;

    for (let i = 0; i < lengths.length; i++) {
      if (r <= lengths[i]) {
        const t = r / lengths[i];
        return [
          coords[i][0] + t * (coords[i+1][0] - coords[i][0]),
          coords[i][1] + t * (coords[i+1][1] - coords[i][1])
        ];
      }
      r -= lengths[i];
    }

    return coords[0];
  }

  // Render the points.
  const MAX_SAMPLES_PER_SEGMENT = 30;

  let min

  // Keep track of the minimum and maximum travel times.
  let minTime = Infinity;
  let maxTime = -Infinity;

  segments.forEach(segment => {
    const coords = segment.shape.map(p => [p.latitude, p.longitude]);

    const stats = segment.segmentTimeResults[0];
    if (!stats) return;

    // Get the mean and standard deviation of the car speeds.
    const mean = stats.averageSpeed;
    const std = stats.standardDeviationSpeed;
    // Get the mean and standard deviation of the travel times.
    const meanTime = stats.averageTravelTime;
    const stdTime = stats.travelTimeStandardDeviation;
    // Get the number of cars on the segment.
    const sampleSize = Math.min(stats.sampleSize, MAX_SAMPLES_PER_SEGMENT);
    // Get the speed limit.
    const speedLimit = segment.speedLimit;

    // For each car, draw a circle with a randomly sampled speed and travel time.
    for (let i = 0; i < sampleSize; i++) {
      // Randomly sample a speed for the car.
      const speed = Math.max(0, randomNormal(mean, std));
      // Randomly sample a travel time for the car.
      const travelTime = Math.max(0, randomNormal(meanTime, stdTime));
      const point = randomPointOnPolyline(coords);
      
      // Update the min and max travel times.
      if ((travelTime < minTime) && (travelTime > 0)) {
        minTime = travelTime;
      }
      if (travelTime > maxTime) {
        maxTime = travelTime;
      }
      
      // The radius represents the travel time.
      // The color represents the speed.
      L.circleMarker(point, {
        radius: travelTime / 25,
        fillColor: getColor(speed, 0, speedLimit),
        color: null,
        fillOpacity: 0.25
      }).addTo(map);
    }
  });

  // Calculate the minimum and maximum travel times in minutes.
  minTime = minTime / 60;

  // Calculate the maximum travel time in minutes.
  maxTime = maxTime / 60;

  let midTime = (minTime + maxTime) / 2;
  
  // Create a legend.
  const legend = L.control({ position: 'bottomright' });

  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'legend');

    div.innerHTML = `
      <h4>Travel Time (min)</h4>
      <div class="legend-circles">
        <div class="legend-item">
          <svg width="60" height="60">
            <circle cx="30" cy="30" r="${(minTime * 60) / 25}" fill="grey" fill-opacity="0.25"/>
          </svg>
          <span>${minTime.toFixed(1)} min</span>
        </div>
        <div class="legend-item">
          <svg width="60" height="60">
            <circle cx="30" cy="30" r="${(midTime * 60) / 25}" fill="grey" fill-opacity="0.25"/>
          </svg>
          <span>${midTime.toFixed(1)} min</span>
        </div>
        <div class="legend-item">
          <svg width="60" height="60">
            <circle cx="30" cy="30" r="${(maxTime * 60) / 25}" fill="grey" fill-opacity="0.25"/>
          </svg>
          <span>${maxTime.toFixed(1)} min</span>
        </div>
      </div>
    `;
    return div;
  };

  legend.addTo(map);
});