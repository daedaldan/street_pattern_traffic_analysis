const fs = require('fs');
const path = require('path');

// Hardcoded paths to datasets
const datasetsInfo = [
  { pattern: "Grid", location: "Midtown Manhattan", file: "data/grid/jobs-9079201-results-Midtown_Manhattan.json" },
  { pattern: "Radial", location: "Dupont Circle", file: "data/radial/jobs-9125826-results-Dupont_Circle.json" },
  { pattern: "Linear", location: "Wuppertal", file: "data/linear/jobs_9177115_results_Wuppertal-2.json" },
  { pattern: "Curvilinear", location: "Fair Lawn", file: "data/curvilinear/jobs_9140388_results_Fair_Lawn_NJ.json" }
];

function milesBetween(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function estimateAreaSqMi(segments) {
  const points = segments.flatMap(seg =>
    seg.shape.map(p => ({ lat: p.latitude, lon: p.longitude }))
  );

  // Replaced d3.min/max with native JS methods
  const lats = points.map(p => p.lat);
  const lons = points.map(p => p.lon);
  
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  const height = milesBetween(minLat, minLon, maxLat, minLon);
  const width = milesBetween(minLat, minLon, minLat, maxLon);

  return Math.max(width * height, 0.01);
}

function calculateMetrics(entry, data) {
  const segments = data.network.segmentResults;

  let weightedSpeedRatio = 0;
  let weightedSpeedMph = 0; // New variable
  let totalCars = 0;

  segments.forEach(segment => {
    const stats = segment.segmentTimeResults?.[0];
    if (!stats || !segment.speedLimit) return;

    const cars = stats.sampleSize || 0;
    const speedRatio = stats.averageSpeed / segment.speedLimit;

    weightedSpeedRatio += speedRatio * cars;
    weightedSpeedMph += stats.averageSpeed * cars; // Track actual speed
    totalCars += cars;
  });

  const areaSqMi = estimateAreaSqMi(segments);
  const networkAvgSpeed = weightedSpeedMph / totalCars; // mph
  const timePerMileMin = 60 / networkAvgSpeed; // 60 mins divided by mph = mins per mile
  return {
    pattern: entry.pattern,
    location: entry.location,
    avgSpeedNormalized: weightedSpeedRatio / totalCars,
    timePerMileMin: timePerMileMin, 
    carsPerSqMi: totalCars / areaSqMi
  };
}

// THIS WAS THE MISSING PART: Execution Loop
const results = [];

datasetsInfo.forEach(entry => {
  const filePath = path.join(__dirname, entry.file);
  try {
    // Read the file and parse JSON
    const rawData = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(rawData);
    
    // Calculate the metrics and push to our array
    const metrics = calculateMetrics(entry, jsonData);
    results.push(metrics);
    console.log(`Successfully processed: ${entry.pattern}`);
  } catch (err) {
    console.error(`Error processing ${entry.file}:`, err.message);
  }
});

// Save it all to summary_stats.json
const outputPath = path.join(__dirname, 'data', 'summary_stats.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`\nAll done! Stats saved to ${outputPath}`);