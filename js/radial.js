// Import the function to create the visualization.
import { createVisualization } from './visualization.js';
// Import the JSON file with the data for the grid visualization..
import data from '../data/radial/jobs-9125826-results-Dupont_Circle.json' with { type: 'json' };

// Create the visualization once the DOM is loaded.
document.addEventListener("DOMContentLoaded", () => {
  createVisualization({
    containerId: "map-radial",
    data,
    title: "Dupont Circle, Washington, D.C."
  });
});