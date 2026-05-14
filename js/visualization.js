/*
* Creates a visualization for the given data.
* @param {Object} options - The options for the visualization.
* @param {string} options.containerId - The ID of the container element.
* @param {Object} options.data - The data for the visualization.
* @param {string} options.title - The title for the visualization.
*/
export function createVisualization({ containerId, data, title }) {
    // Store the title in a constant to use in the title control.
    const VISUALIZATION_TITLE = title;
    // Get the container element by ID. If it doesn't exist, return early.
    const container = document.getElementById(containerId);
    if (!container) return;

    // ==========================================
    // Setting Up the Visualization
    // ==========================================
    // Extract the road segments from the data.
    const segments = data.network.segmentResults;

    // Set up the map. preferCanvas makes many circle markers cheap to pan (SVG paths are very slow).
    const map = L.map(containerId, { zoomControl: false, preferCanvas: true });
    // Auto-fit the bounds from all coordinates.
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

    // Create a title.
    const title_control = L.control({ position: 'topleft' });

    title_control.onAdd = function () {
        const div = L.DomUtil.create('div', 'map-title');
        div.innerHTML = `
        <h2 id="visualization-title">${VISUALIZATION_TITLE}</h2>
        <h3>August 7th, 2024, 10 AM to 12 PM</h3>
        <h4>Data from TomTom Traffic Stats API</h4>
        `;
        return div;
    };

    title_control.addTo(map);

    // Add zoom control below the title.
    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    // ==========================================
    // Utility Functions
    // ==========================================
    // Return a value from a normal distribution with the provided mean and standard deviation.
    function randomNormal(mean, stdDev) {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        return mean + Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * stdDev;
    }

    // Create a color scale that maps speeds to colors.
    // Speeds close to 0 are red, speeds close to the speed limit are green.
    function getColor(speed, min, max) {
        const ratio = Math.max(0, Math.min(1, (speed - min) / (max - min)));
        const r = Math.floor(255 * (1 - ratio));
        const g = Math.floor(255 * ratio);
        return `rgb(${r},${g},0)`;
    }

    // Draw a random point on the polyline.
    function randomPointOnPolyline(coords) {
        // Compute segment lengths.
        let lengths = [];
        let totalLength = 0;

        for (let i = 0; i < coords.length - 1; i++) {
            const dx = coords[i + 1][0] - coords[i][0];
            const dy = coords[i + 1][1] - coords[i][1];
            const len = Math.sqrt(dx * dx + dy * dy);
            lengths.push(len);
            totalLength += len;
        }

        // Pick a random distance.
        let r = Math.random() * totalLength;

        for (let i = 0; i < lengths.length; i++) {
            if (r <= lengths[i]) {
                const t = r / lengths[i];
                return [
                    coords[i][0] + t * (coords[i + 1][0] - coords[i][0]),
                    coords[i][1] + t * (coords[i + 1][1] - coords[i][1])
                ];
            }
            r -= lengths[i];
        }

        return coords[0];
    }

    // ==========================================
    // Drawing the Cars on the Map
    // ==========================================
    // Limit the number of samples/cars per segment to avoid overcrowding the map.
    const MAX_SAMPLES_PER_SEGMENT = 30;

    // Keep track of the minimum and maximum travel times.
    let minTime = Infinity;
    let maxTime = -Infinity;

    // Draw the cars on each road segment.
    segments.forEach(segment => {
        // Get the coordinates of the segment.
        const coords = segment.shape.map(p => [p.latitude, p.longitude]);

        // Get the statistics for the segment. If there are no statistics, skip this segment.
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
            // Get a random point on the segment for the car.
            const point = randomPointOnPolyline(coords);

            // Update the min and max travel times.
            if ((travelTime < minTime) && (travelTime > 0)) {
                minTime = travelTime;
            }
            if (travelTime > maxTime) {
                maxTime = travelTime;
            }

            // Draw a circle marker for the car.
            // The radius represents the travel time.
            // The color represents the speed.
            L.circleMarker(point, {
                radius: travelTime / 25,
                fillColor: getColor(speed, 0, speedLimit),
                // Canvas ignores color:null like SVG; omit stroke so dots stay light like before.
                weight: 0,
                fillOpacity: 0.25
            }).addTo(map);
        }
    });

    // ==========================================
    // Creating the Legend
    // ==========================================
    // Calculate the minimum and maximum travel times in minutes.
    minTime = 1;
    // Calculate the maximum travel time in minutes.
    maxTime = maxTime / 60;
    // Calculate the midpoint travel time in minutes.
    let midTime = (minTime + maxTime) / 2;

    // Create a legend.
    const legend = L.control({ position: 'bottomright' });

    legend.onAdd = function () {
        const div = L.DomUtil.create('div', 'legend');

        div.innerHTML = `
        <h4>Travel Time (min)</h4>
        <div class="legend-circles">
            <div class="legend-item">
            <svg width="50" height="50">
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
        <h4>Speed</h4>
        <div class="legend-gradient">
            <div class="gradient-bar"></div>
            <div class="gradient-labels">
            <span>0</span>
            <span>Speed Limit</span>
            </div>
        </div>
        `;
        return div;
    };

    legend.addTo(map);
}