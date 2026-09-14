/** Haversine distance in metres. */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Max allowed distance from satsang place when recording attendance. */
export const ATTENDANCE_GEO_MAX_METERS = 20;

export const OFF_SITE_WARNING =
  "आता आपण सत्संग स्थळावर नाहीत आपण साधक आहात असे स्वतःला फसवू नका हरी ओम परमानंद ..!";

/** Shown after attendance is saved within ATTENDANCE_GEO_MAX_METERS. */
export const ON_SITE_BLESSING =
  "अभिनंदन... आपण आपण परमानंद कृपेस पात्र आहात..! हरी ओम परमानंद ..!";
