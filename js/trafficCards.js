import gridData from "../data/grid/jobs-9079201-results-Midtown_Manhattan.json" with { type: "json" };
import radialData from "../data/radial/jobs-9125826-results-Dupont_Circle.json" with { type: "json" };
import linearData from "../data/linear/jobs_9177115_results_Wuppertal-2.json" with { type: "json" };
import curvilinearData from "../data/curvilinear/jobs_9140388_results_Fair_Lawn_NJ.json" with { type: "json" };
// import culdesacData from "../data/culdesac/YOUR_FILE_NAME.json" with { type: "json" };

const datasets = [
  { pattern: "Grid", location: "Midtown Manhattan", data: gridData },
  { pattern: "Radial", location: "Dupont Circle", data: radialData },
  { pattern: "Linear", location: "Wuppertal", data: linearData },
  { pattern: "Curvilinear", location: "Fair Lawn", data: curvilinearData },
  // { pattern: "Cul-de-Sac", location: "Carderock Springs", data: culdesacData },
];

function milesBetween(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const toRad = d => d * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

function estimateAreaSqMi(segments) {
  const points = segments.flatMap(seg =>
    seg.shape.map(p => ({
      lat: p.latitude,
      lon: p.longitude
    }))
  );

  const minLat = d3.min(points, d => d.lat);
  const maxLat = d3.max(points, d => d.lat);
  const minLon = d3.min(points, d => d.lon);
  const maxLon = d3.max(points, d => d.lon);

  const height = milesBetween(minLat, minLon, maxLat, minLon);
  const width = milesBetween(minLat, minLon, minLat, maxLon);

  return Math.max(width * height, 0.01);
}

function calculateMetrics(entry) {
  const segments = entry.data.network.segmentResults;

  let weightedSpeedRatio = 0;
  let weightedTravelTime = 0;
  let totalCars = 0;

  segments.forEach(segment => {
    const stats = segment.segmentTimeResults?.[0];
    if (!stats || !segment.speedLimit) return;

    const cars = stats.sampleSize || 0;
    const speedRatio = stats.averageSpeed / segment.speedLimit;

    weightedSpeedRatio += speedRatio * cars;
    weightedTravelTime += stats.averageTravelTime * cars;
    totalCars += cars;
  });

  const areaSqMi = estimateAreaSqMi(segments);

  return {
    ...entry,
    avgSpeedNormalized: weightedSpeedRatio / totalCars,
    avgTravelTimeMin: weightedTravelTime / totalCars / 60,
    carsPerSqMi: totalCars / areaSqMi
  };
}

function rankBy(data, key, higherIsBetter = true) {
  return [...data]
    .sort((a, b) =>
      higherIsBetter ? b[key] - a[key] : a[key] - b[key]
    )
    .map((d, i) => ({ ...d, rank: i + 1 }));
}

function createCard(title, rankedData, key, formatter, subtitle) {
  const winner = rankedData[0];

  return `
    <div class="traffic-card">
      <div class="traffic-card-header">
        <span class="traffic-card-rank">#1</span>
        <div>
          <h3>${title}</h3>
          <p>${subtitle}</p>
        </div>
      </div>

      <div class="traffic-card-winner">
        <strong>${winner.pattern}</strong>
        <span>${winner.location}</span>
        <div class="traffic-card-value">${formatter(winner[key])}</div>
      </div>

      <ol class="traffic-ranking">
        ${rankedData.map(d => `
          <li>
            <span>${d.pattern}</span>
            <strong>${formatter(d[key])}</strong>
          </li>
        `).join("")}
      </ol>
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("traffic-summary-cards");
  if (!container) return;

  const metrics = datasets.map(calculateMetrics);

  const speedRank = rankBy(metrics, "avgSpeedNormalized", true);
  const timeRank = rankBy(metrics, "avgTravelTimeMin", false);
  const densityRank = rankBy(metrics, "carsPerSqMi", false);

  container.innerHTML = `
    ${createCard(
      "Fastest Traffic",
      speedRank,
      "avgSpeedNormalized",
      d => `${(d * 100).toFixed(1)}%`,
      "Average speed normalized by speed limit"
    )}

    ${createCard(
      "Lowest Travel Time",
      timeRank,
      "avgTravelTimeMin",
      d => `${d.toFixed(2)} min`,
      "Weighted average travel time"
    )}

    ${createCard(
      "Lowest Car Density",
      densityRank,
      "carsPerSqMi",
      d => `${Math.round(d).toLocaleString()} cars/mi²`,
      "Total sampled cars per estimated square mile"
    )}
  `;
});