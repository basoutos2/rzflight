import { useState, useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { usePlacesQueue } from './usePlacesQueue';
import AIRPORTS from '../data/airports';

const CACHE_KEY = 'rzflight_restaurants_v2';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return {};
    }
    return data;
  } catch {
    return {};
  }
}

function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

const PRICE_LEVEL_MAP = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

export function useRestaurants() {
  const placesLib = useMapsLibrary('places');
  const { enqueue } = usePlacesQueue();
  const queued = useRef(new Set());

  const [results, setResults] = useState(() => {
    const cache = loadCache();
    return Object.fromEntries(
      AIRPORTS.map((a) => [
        a.icao,
        cache[a.icao] ?? { status: 'loading', places: [] },
      ]),
    );
  });

  useEffect(() => {
    if (!placesLib) return;

    const cache = loadCache();

    AIRPORTS.forEach((airport) => {
      if (cache[airport.icao] || queued.current.has(airport.icao)) return;
      queued.current.add(airport.icao);

      enqueue(async () => {
        try {
          const { places } = await placesLib.Place.searchNearby({
            fields: ['displayName', 'rating', 'userRatingCount', 'priceLevel', 'formattedAddress', 'id'],
            locationRestriction: {
              circle: {
                center: { lat: airport.lat, lng: airport.lng },
                radius: 1000,
              },
            },
            includedPrimaryTypes: ['restaurant'],
            maxResultCount: 10,
          });

          const entry = {
            status: places.length > 0 ? 'yes' : 'no',
            places: places.map((p) => ({
              name: p.displayName,
              rating: p.rating ?? null,
              userRatingsTotal: p.userRatingCount ?? 0,
              priceLevel: PRICE_LEVEL_MAP[p.priceLevel] ?? null,
              vicinity: p.formattedAddress ?? '',
              placeId: p.id,
            })),
          };

          setResults((prev) => {
            const next = { ...prev, [airport.icao]: entry };
            const cacheData = {};
            for (const [k, v] of Object.entries(next)) {
              if (v.status !== 'loading') cacheData[k] = v;
            }
            saveCache(cacheData);
            return next;
          });
        } catch (err) {
          console.error(`Places search failed for ${airport.icao}:`, err);
          setResults((prev) => ({
            ...prev,
            [airport.icao]: { status: 'error', places: [] },
          }));
        }
      });
    });
  }, [placesLib, enqueue]);

  return results;
}
