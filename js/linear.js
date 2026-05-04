// Import the function to create the visualization.
import { createVisualization } from './visualization.js';
// Import the JSON file with the data for the grid visualization..
import data from '../data/linear/???.json' with { type: 'json' };

// Create the visualization once the DOM is loaded.
document.addEventListener("DOMContentLoaded", () => {
  createVisualization({
    containerId: "map-linear",
    data,
    title: "Wuppertal Linear Traffic"
  });
});