import summaryStats from "../data/summary_stats.json" with { type: "json" };

function rankBy(data, key, higherIsBetter = true) {
  return [...data]
    .sort((a, b) =>
      higherIsBetter ? b[key] - a[key] : a[key] - b[key]
    )
    .map((d, i) => ({ ...d, rank: i + 1 }));
}

// function createCard(title, rankedData, key, formatter, subtitle) {
//   const winner = rankedData[0];
//   const runnersUp = rankedData.slice(1); // Removes the winner from the list

//   return `
//     <div class="traffic-card">
//       <div class="traffic-card-header">
//         <span class="traffic-card-rank">#1</span>
//         <div>
//           <h3>${title}</h3>
//           <p>${subtitle}</p>
//         </div>
//       </div>

//       <div class="traffic-card-winner">
//         <strong>${winner.pattern}</strong>
//         <span>${winner.location}</span>
//         <div class="traffic-card-value">${formatter(winner[key])}</div>
//       </div>

//       <ol class="traffic-ranking" start="2">
//         ${runnersUp.map(d => `
//           <li>
//             <span>${d.pattern}</span>
//             <strong>${formatter(d[key])}</strong>
//           </li>
//         `).join("")}
//       </ol>
//     </div>
//   `;
// }

function createCard(title, rankedData, key, formatter, subtitle) {
  const winner = rankedData[0];
  const runnersUp = rankedData.slice(1);

  return `
    <div class="traffic-card" style="flex: 1; min-width: 0; display: flex; flex-direction: column; height: 100%; box-sizing: border-box; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      
      <div class="traffic-card-header" style="display: flex; flex-direction: column; gap: 6px; min-height: 85px; margin-bottom: 10px;">
        <h3 style="margin: 0; font-size: 1.2em; line-height: 1.2;">${title}</h3>
        <p style="margin: 0; font-size: 0.85em; color: #666; line-height: 1.3;">${subtitle}</p>
      </div>

      <div class="traffic-card-winner" style="display: flex; flex-direction: column; justify-content: center; gap: 8px; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #eee; min-height: 115px; margin-bottom: 20px;">
        
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="background-color: #222; color: #fff; min-width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0;">
            1
          </div>
          <div style="display: flex; flex-direction: column;">
            <strong style="font-size: 1.1em;">${winner.pattern}</strong>
            <span style="font-size: 0.9em; color: #555;">${winner.location}</span>
          </div>
        </div>
        
        <div class="traffic-card-value" style="font-size: 1.7em; font-weight: 900; color: #000; padding-left: 44px; line-height: 1;">
          ${formatter(winner[key])}
        </div>
      </div>

      <ul class="traffic-ranking" style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; flex-grow: 1;">
        ${runnersUp.map((d, index) => `
          <li style="display: flex; align-items: center; justify-content: space-between; font-size: 0.95em;">
            
            <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
              <div style="background-color: #e2e8f0; color: #475569; min-width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85em; font-weight: bold; flex-shrink: 0;">
                ${index + 2}
              </div>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #333;">${d.pattern}</span>
            </div>
            
            <strong style="white-space: nowrap; flex-shrink: 0; padding-left: 10px; color: #000;">
              ${formatter(d[key])}
            </strong>
          </li>
        `).join("")}
      </ul>
      
    </div>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("traffic-summary-cards");
  if (!container) return;

  // Get pre-calculated statistics from the JSON directly and rank them
  const speedRank = rankBy(summaryStats, "avgSpeedNormalized", true);
  const timeRank = rankBy(summaryStats, "timePerMileMin", false);
  const densityRank = rankBy(summaryStats, "carsPerSqMi", false);

  container.innerHTML = `
    ${createCard(
      "Fastest Traffic",
      speedRank,
      "avgSpeedNormalized",
      d => `${(d * 100).toFixed(1)}%`,
      "Average speed normalized by speed limit"
    )}

    ${createCard(
    "Fastest Time Per Mile",
    timeRank,
    "timePerMileMin",
    d => `${d.toFixed(1)} min/mi`,
    "Standardized average time to travel one mile"
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