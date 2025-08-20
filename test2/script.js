/**
 * RainViewer radar map example.
 *
 * This script uses the public RainViewer weather-maps JSON API to load a list
 * of available radar frames (past and nowcast) and displays them as a tile
 * overlay on a Leaflet map. Basic controls allow the user to step through
 * frames and play/stop an animation.
 *
 * References:
 * - The RainViewer API provides a JSON file containing metadata for radar
 *   frames and their paths [oai_citation:5‡api.rainviewer.com](https://api.rainviewer.com/public/weather-maps.json#:~:text=%7B,v2%2Fradar%2Fnowcast_760a92849a05).  Each frame has a `path`
 *   property that needs to be combined with a host, tile size, colour scheme,
 *   smoothing option and snow flag to generate a tile URL.  The API examples
 *   note that past radar data is available up to a maximum zoom of 9 from
 *   August 1 [oai_citation:6‡rainviewer.com](https://www.rainviewer.com/api/examples.html#:~:text=Radar%20Data%20) and that future (nowcast) data is not
 *   publicly available until January 1, 2026 [oai_citation:7‡rainviewer.com](https://www.rainviewer.com/api/examples.html#:~:text=Radar%20Data%20).
 * - Only the “Universal Blue” colour scheme (ID 2) will remain available
 *   after January 1 2026 [oai_citation:8‡rainviewer.com](https://www.rainviewer.com/api/color-schemes.html#:~:text=All%20available%20color%20schemes%20for,default%20color%20scheme%20is%20available), so it is used here by
 *   default.  Feel free to change the value to any of the other schemes
 *   listed in the documentation until then.
 */

// Initialize the Leaflet map centred roughly on Traverse City, Michigan
const map = L.map('map').setView([44.7631, -85.6206], 6);

// Add a base OpenStreetMap layer for context
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data © <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
  maxZoom: 19
}).addTo(map);

// API endpoint and overlay configuration
const apiUrl = 'https://api.rainviewer.com/public/weather-maps.json';
const tileSize = 512;    // valid values: 256 or 512
const colorScheme = 2;   // Universal Blue (see RainViewer docs)
const smooth = 1;        // 1 to enable smoothing, 0 to disable
const snow = 1;          // 1 to show snow colours, 0 to hide
const extension = 'png'; // use PNG tiles (alternatively, 'webp' may be used on modern browsers)

// State variables
let apiData;            // JSON returned by the RainViewer API
let frames = [];        // List of frame objects (past + nowcast)
let currentFrameIndex = 0;
const radarLayers = {}; // Cache of Leaflet tile layers by frame path
let playing = false;    // Whether animation is currently playing
let timer;              // Interval timer used for animation

/**
 * Build a tile URL template for a given frame.  The RainViewer API returns
 * frame paths like `/v2/radar/1755471000` which must be combined with the
 * host, tile size and options.  For example, a full URL might be:
 *   https://tilecache.rainviewer.com/v2/radar/1755471000/512/{z}/{x}/{y}/2/1_1.png
 *
 * @param {Object} frame The frame object from the API (contains a `path` field)
 * @returns {string} A URL template with Leaflet placeholders for z/x/y
 */
function buildTileUrl(frame) {
  return apiData.host + frame.path + '/' + tileSize + '/{z}/{x}/{y}/' +
    colorScheme + '/' + smooth + '_' + snow + '.' + extension;
}

/**
 * Remove all currently displayed radar layers from the map.
 */
function clearRadarLayers() {
  Object.values(radarLayers).forEach(layer => {
    if (map.hasLayer(layer)) {
      map.removeLayer(layer);
    }
  });
}

/**
 * Display a particular frame on the map.  If the frame’s tile layer has not
 * been created before, it is added to the radarLayers cache.  The frame time
 * is shown in the control bar.
 *
 * @param {number} position Index in the frames array to display
 */
function loadFrame(position) {
  // Ensure the position wraps around the frames array
  if (frames.length === 0) {
    return;
  }
  if (position < 0) position = frames.length - 1;
  if (position >= frames.length) position = 0;
  currentFrameIndex = position;
  const frame = frames[currentFrameIndex];

  // Create the tile layer if it doesn’t exist yet
  if (!radarLayers[frame.path]) {
    const urlTemplate = buildTileUrl(frame);
    radarLayers[frame.path] = L.tileLayer(urlTemplate, {
      tileSize: 256, // Leaflet uses 256px tiles; the API produces 512px images but this is scaled automatically
      opacity: 0.6,
      zIndex: 10,
      maxZoom: 9 // RainViewer limits past radar data to zoom 9 [oai_citation:9‡rainviewer.com](https://www.rainviewer.com/api/examples.html#:~:text=Radar%20Data%20)
    });
  }

  // Remove existing radar layers and add the new one
  clearRadarLayers();
  radarLayers[frame.path].addTo(map);

  // Update the timestamp display
  const dt = new Date(frame.time * 1000);
  document.getElementById('frameTime').textContent = dt.toLocaleString();
}

/**
 * Advance to the next frame in the sequence.
 */
function nextFrame() {
  loadFrame(currentFrameIndex + 1);
}

/**
 * Go back to the previous frame in the sequence.
 */
function prevFrame() {
  loadFrame(currentFrameIndex - 1);
}

/**
 * Start animating through the radar frames.  Frames advance every 500 ms.
 */
function startAnimation() {
  if (playing) return;
  playing = true;
  document.getElementById('playPause').textContent = 'Stop';
  timer = setInterval(() => {
    nextFrame();
  }, 500);
}

/**
 * Stop the frame animation.
 */
function stopAnimation() {
  if (!playing) return;
  playing = false;
  document.getElementById('playPause').textContent = 'Play';
  clearInterval(timer);
}

// Attach event listeners to control buttons
document.getElementById('playPause').addEventListener('click', () => {
  if (playing) {
    stopAnimation();
  } else {
    startAnimation();
  }
});

document.getElementById('prevFrame').addEventListener('click', () => {
  stopAnimation();
  prevFrame();
});

document.getElementById('nextFrame').addEventListener('click', () => {
  stopAnimation();
  nextFrame();
});

/**
 * Fetch available radar frames from the RainViewer API.  The API returns an
 * object with a `radar.past` array for past frames and (optionally) a
 * `radar.nowcast` array for future frames.  According to the API examples,
 * future frames are not available until 2026 [oai_citation:10‡rainviewer.com](https://www.rainviewer.com/api/examples.html#:~:text=Radar%20Data%20), so this
 * example always includes both arrays (if present) but users should be aware
 * that nowcast frames may return HTTP 404 responses until then.
 */
function fetchFrames() {
  fetch(apiUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      apiData = data;
      // Compose the list of frames: past radar frames first, then nowcast if available
      frames = [];
      if (data.radar && Array.isArray(data.radar.past)) {
        frames = data.radar.past.slice();
      }
      if (data.radar && Array.isArray(data.radar.nowcast)) {
        frames = frames.concat(data.radar.nowcast);
      }
      if (frames.length === 0) {
        console.warn('No radar frames available.');
        document.getElementById('frameTime').textContent = 'No data';
        return;
      }
      // Show the most recent past frame by default
      loadFrame(frames.length - 1);
    })
    .catch(err => {
      console.error('Error fetching RainViewer data:', err);
      document.getElementById('frameTime').textContent = 'Error loading data';
    });
}

// Kick off the initial fetch
fetchFrames();