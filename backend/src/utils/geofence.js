// Simple geofence helper - radius check + test-zone bypass.
// We never store or return exact user coordinates, only zone membership.

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Distance in meters between two lat/lng points.
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Demo centers for our 2 test zones (Vizag VIIT area, illustrative).
// In real app these would come from DB columns.
const DEMO_CENTERS = {
  "VIIT Campus - Test Zone": { lat: 17.6868, lng: 83.2185, radiusM: 500 },
  "Samartha Hackathon Hall - Test Zone": { lat: 17.6875, lng: 83.219, radiusM: 200 },
  "CSE Block - Test Zone": { lat: 17.687, lng: 83.218, radiusM: 300 },
  "Central Library - Test Zone": { lat: 17.686, lng: 83.219, radiusM: 200 },
  "Canteen - Test Zone": { lat: 17.6855, lng: 83.218, radiusM: 150 },
  "Playground - Test Zone": { lat: 17.688, lng: 83.217, radiusM: 400 },
  "Seminar Hall - Test Zone": { lat: 17.6872, lng: 83.2195, radiusM: 150 },
};

export function getDemoCenter(zoneName) {
  return DEMO_CENTERS[zoneName] || { lat: 17.6868, lng: 83.2185, radiusM: 500 };
}

export function checkMembership({ zoneName, lat, lng, accuracy, useTestMode }) {
  // 1. Test mode always passes, but labelled simulated.
  if (useTestMode === true) {
    const center = getDemoCenter(zoneName);
    return { inZone: true, mode: "simulated", distanceM: 0, radiusM: center.radiusM };
  }

  // 2. Low accuracy -> ask to retry, don't guess.
  if (typeof accuracy === "number" && accuracy > 100) {
    return { inZone: false, mode: "gps", retry: true, reason: "low_accuracy" };
  }

  // 3. Need real coordinates for GPS check.
  if (typeof lat !== "number" || typeof lng !== "number") {
    return { inZone: false, mode: "gps", reason: "no_location" };
  }

  const center = getDemoCenter(zoneName);
  const d = Math.round(distanceMeters(lat, lng, center.lat, center.lng));
  return {
    inZone: d <= center.radiusM,
    mode: "gps",
    distanceM: d,
    radiusM: center.radiusM,
  };
}
