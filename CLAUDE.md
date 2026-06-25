# RZFlight — Claude Code Guide

## Project Overview

RZFlight is an aviation data toolkit with three components:
- **Swift package** (`Sources/`) — flight planning data structures and aviation models
- **Python package** (`euro_aip/`) — parses European AIP documents and extracts airport info
- **Web app** (`web/france-airports-map/`) — React map of French airports with Google Places restaurant indicators

## Web App: France Airports Map

### Stack
- React 18 + Vite
- `@vis.gl/react-google-maps` for Google Maps integration
- Google Maps JavaScript API (with Places library) for restaurant lookups
- Tailwind CSS for styling

### Running locally
```bash
cd web/france-airports-map
cp .env.example .env          # add your VITE_GOOGLE_MAPS_API_KEY
npm install
npm run dev                   # http://localhost:5173
```

### Environment variables
| Variable | Required | Description |
|---|---|---|
| `VITE_GOOGLE_MAPS_API_KEY` | Yes | Google Maps / Places API key |

The API key needs these APIs enabled in Google Cloud Console:
- Maps JavaScript API
- Places API (new)

### Architecture
```
src/
  data/airports.js         # French airports (ICAO, name, lat/lng)
  hooks/
    usePlacesQueue.js      # Rate-limited queue for Places API calls
    useRestaurants.js      # Nearby restaurant search with localStorage cache
  components/
    AirportMarker.jsx      # Colored dot marker (green=yes, red=no, grey=loading)
    RestaurantPopup.jsx    # Click popup with restaurant list + ratings
  App.jsx
  main.jsx
```

### Key behaviors
- Each airport is checked for restaurants within **1 km walking distance** via `PlacesService.nearbySearch` (type: `restaurant`, radius: 1000 m)
- Results are **cached in localStorage** for 24 h to avoid redundant API calls
- Requests are **queued with 200 ms delay** between each to respect rate limits
- Marker colors: **green** = restaurants found, **red** = none, **grey** = loading
- Clicking a marker opens a popup with restaurant names, ratings, and price levels

## Python Package: euro_aip

### Setup
```bash
cd euro_aip
pip install -e .
```

### Airport data
`euro_aip/data/airfieldmap.csv` contains European airports/aerodromes with ICAO codes. Filter `Country == France` for French airports.

## Common commands

### Tests
```bash
# Python
cd euro_aip && pytest

# Swift
swift test
```

### Lint
```bash
cd euro_aip && ruff check .
```
