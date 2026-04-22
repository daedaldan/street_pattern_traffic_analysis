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

  segments.forEach(segment => {
    const coords = segment.shape.map(p => [p.latitude, p.longitude]);

    const stats = segment.segmentTimeResults[0];
    if (!stats) return;

    const mean = stats.averageSpeed;
    const std = stats.standardDeviationSpeed;
    const sampleSize = Math.min(stats.sampleSize, MAX_SAMPLES_PER_SEGMENT);
    const speedLimit = segment.speedLimit;

    for (let i = 0; i < sampleSize; i++) {
      const speed = randomNormal(mean, std);
      const point = randomPointOnPolyline(coords);

    const minSpeed = 0;
    const maxSpeed = speedLimit;

      L.circleMarker(point, {
        radius: 3,
        fillColor: getColor(speed, minSpeed, speedLimit),
        color: null,
        fillOpacity: 0.25
      }).addTo(map);
    }
  });
});