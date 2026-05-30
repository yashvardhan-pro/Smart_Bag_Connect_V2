import { useState, useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import { MapPin, Navigation, Crosshair, Plus, Trash2, CheckCircle2, XCircle, Loader2, RefreshCw, Compass, Bluetooth, BluetoothOff, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useBluetooth } from "@/hooks/use-bluetooth";

interface Coords {
  lat: number;
  lng: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

interface SavedPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  savedAt: number;
}

const STORAGE_KEY = "smartbag_saved_places";
const LAST_SEEN_KEY = "smartbag_last_seen";

interface LastSeen {
  lat: number;
  lng: number;
  timestamp: number;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

function formatCoord(val: number, pos: string, neg: string): string {
  const dir = val >= 0 ? pos : neg;
  return `${Math.abs(val).toFixed(6)}° ${dir}`;
}

function AccuracyRing({ accuracy }: { accuracy: number }) {
  const color = accuracy < 20 ? "text-green-400" : accuracy < 100 ? "text-yellow-400" : "text-red-400";
  const label = accuracy < 20 ? "HIGH" : accuracy < 100 ? "MED" : "LOW";
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${accuracy < 20 ? "bg-green-400" : accuracy < 100 ? "bg-yellow-400" : "bg-red-400"} animate-pulse`} />
      <span className={`text-[10px] font-mono font-bold tracking-widest ${color}`}>{label}</span>
      <span className="text-[10px] text-muted-foreground font-mono">±{Math.round(accuracy)}m</span>
    </div>
  );
}

function makePlaceIcon(near: boolean) {
  return L.divIcon({
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${near ? "#22c55e" : "#06b6d4"};
      border:3px solid #0f172a;
      box-shadow:0 0 10px ${near ? "rgba(34,197,94,0.6)" : "rgba(6,182,212,0.6)"};
      display:flex;align-items:center;justify-content:center;
    "><svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg></div>`,
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function makeBagIcon(live: boolean) {
  return L.divIcon({
    html: `<div style="
      width:32px;height:32px;border-radius:50%;
      background:${live ? "#f59e0b" : "#64748b"};
      border:3px solid #0f172a;
      box-shadow:0 0 14px ${live ? "rgba(245,158,11,0.7)" : "rgba(100,116,139,0.4)"};
      display:flex;align-items:center;justify-content:center;
    "><svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6h-2.18c.07-.44.18-.88.18-1a3 3 0 0 0-3-3h-6a3 3 0 0 0-3 3c0 .12.11.56.18 1H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2zm-8 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm3-9H9a1 1 0 0 1 0-2h6a1 1 0 0 1 0 2z"/>
    </svg></div>`,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

function LiveMap({
  coords,
  savedPlaces,
  bagLocation,
  lastSeen,
}: {
  coords: Coords;
  savedPlaces: SavedPlace[];
  bagLocation: { lat: number; lng: number } | null;
  lastSeen: LastSeen | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const selfMarkerRef = useRef<L.CircleMarker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const placeMarkersRef = useRef<L.Marker[]>([]);
  const bagMarkerRef = useRef<L.Marker | null>(null);
  const lastSeenMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [coords.lat, coords.lng],
      zoom: 17,
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true,       // Canvas renderer — much faster than SVG
      zoomSnap: 0.5,            // Smoother zoom steps
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 120, // Less sensitive scroll zoom
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 20,
      maxNativeZoom: 19,  // Don't request tiles beyond native zoom
      keepBuffer: 4,       // Pre-load extra tile rows/columns around viewport
      updateWhenIdle: false,   // Keep loading tiles while panning
      updateWhenZooming: false, // Don't re-request tiles mid-zoom
      crossOrigin: true,   // Enables browser tile caching
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const latlng: L.LatLngExpression = [coords.lat, coords.lng];

    // Fly to new position only if the map center has moved enough (avoids jitter)
    const current = map.getCenter();
    const moved = haversineDistance(current.lat, current.lng, coords.lat, coords.lng);
    if (moved > 3) {
      map.setView(latlng, map.getZoom(), { animate: true, duration: 0.8 });
    }

    // Update existing markers in-place instead of removing and recreating
    if (accuracyCircleRef.current && selfMarkerRef.current) {
      accuracyCircleRef.current.setLatLng(latlng);
      (accuracyCircleRef.current as L.Circle).setRadius(coords.accuracy);
      selfMarkerRef.current.setLatLng(latlng);
    } else {
      if (accuracyCircleRef.current) accuracyCircleRef.current.remove();
      if (selfMarkerRef.current) selfMarkerRef.current.remove();

      accuracyCircleRef.current = L.circle(latlng, {
        radius: coords.accuracy,
        color: "#06b6d4",
        fillColor: "#06b6d4",
        fillOpacity: 0.1,
        weight: 1,
        dashArray: "4",
      }).addTo(map);

      selfMarkerRef.current = L.circleMarker(latlng, {
        radius: 9,
        color: "#06b6d4",
        fillColor: "#06b6d4",
        fillOpacity: 1,
        weight: 3,
      })
        .addTo(map)
        .bindPopup("<b style='color:#0f172a;font-size:12px'>You are here</b>");
    }
  }, [coords]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    placeMarkersRef.current.forEach((m) => m.remove());
    placeMarkersRef.current = [];

    savedPlaces.forEach((place) => {
      const dist = haversineDistance(coords.lat, coords.lng, place.lat, place.lng);
      const isNear = dist < 50;
      const marker = L.marker([place.lat, place.lng], { icon: makePlaceIcon(isNear) })
        .addTo(map)
        .bindPopup(`<div style="color:#0f172a;font-size:12px"><b>${place.name}</b><br/>${formatDistance(dist)} away</div>`);
      placeMarkersRef.current.push(marker);
    });
  }, [savedPlaces, coords]);

  // Live bag GPS marker — move in-place if it already exists
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!bagLocation) {
      if (bagMarkerRef.current) { bagMarkerRef.current.remove(); bagMarkerRef.current = null; }
      return;
    }
    if (bagMarkerRef.current) {
      bagMarkerRef.current.setLatLng([bagLocation.lat, bagLocation.lng]);
    } else {
      bagMarkerRef.current = L.marker([bagLocation.lat, bagLocation.lng], { icon: makeBagIcon(true) })
        .addTo(map)
        .bindPopup("<div style='color:#0f172a;font-size:12px'><b>🎒 Bag (Live GPS)</b></div>");
    }
  }, [bagLocation]);

  // Last Seen marker (only show when no live GPS)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (lastSeenMarkerRef.current) { lastSeenMarkerRef.current.remove(); lastSeenMarkerRef.current = null; }
    if (lastSeen && !bagLocation) {
      const when = new Date(lastSeen.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      lastSeenMarkerRef.current = L.marker([lastSeen.lat, lastSeen.lng], { icon: makeBagIcon(false) })
        .addTo(map)
        .bindPopup(`<div style='color:#0f172a;font-size:12px'><b>🎒 Bag last seen</b><br/>${when}</div>`);
    }
  }, [lastSeen, bagLocation]);

  return (
    <div
      ref={containerRef}
      style={{ height: "280px", width: "100%", borderRadius: "16px" }}
      data-testid="map-container"
    />
  );
}

interface LocationPageProps {
  bluetooth: ReturnType<typeof useBluetooth>;
}

export default function LocationPage({ bluetooth }: LocationPageProps) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [lastSeen, setLastSeen] = useState<LastSeen | null>(null);
  const [newPlaceName, setNewPlaceName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const watchId = useRef<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedPlaces(JSON.parse(raw));
    } catch {}
    try {
      const raw = localStorage.getItem(LAST_SEEN_KEY);
      if (raw) setLastSeen(JSON.parse(raw));
    } catch {}
  }, []);

  // Save Last Seen whenever bag connects and we have phone GPS coords
  const prevStatus = useRef(bluetooth.status);
  useEffect(() => {
    const justConnected = prevStatus.current !== "connected" && bluetooth.status === "connected";
    prevStatus.current = bluetooth.status;
    if (justConnected && coords) {
      const entry: LastSeen = { lat: coords.lat, lng: coords.lng, timestamp: Date.now() };
      setLastSeen(entry);
      localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(entry));
    }
  }, [bluetooth.status, coords]);

  // Also update Last Seen periodically while connected
  useEffect(() => {
    if (bluetooth.status !== "connected" || !coords) return;
    const entry: LastSeen = { lat: coords.lat, lng: coords.lng, timestamp: Date.now() };
    setLastSeen(entry);
    localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(entry));
  }, [bluetooth.status, coords]);

  const persistPlaces = (places: SavedPlace[]) => {
    setSavedPlaces(places);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  };

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    setError(null);

    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLoading(false);
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        setLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Location permission denied. Please allow access in your browser settings.");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Location information is unavailable.");
            break;
          case err.TIMEOUT:
            setError("Location request timed out.");
            break;
          default:
            setError("An unknown error occurred.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    startTracking();
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [startTracking]);

  const saveCurrentPlace = () => {
    if (!coords) return;
    const name = newPlaceName.trim() || `Place ${savedPlaces.length + 1}`;
    const place: SavedPlace = {
      id: crypto.randomUUID(),
      name,
      lat: coords.lat,
      lng: coords.lng,
      savedAt: Date.now(),
    };
    persistPlaces([place, ...savedPlaces]);
    setNewPlaceName("");
    setShowSaveForm(false);
    toast({ title: "Location saved", description: `"${name}" has been saved.` });
  };

  const deletePlace = (id: string) => {
    persistPlaces(savedPlaces.filter((p) => p.id !== id));
  };

  const headingLabel = (h: number | null) => {
    if (h === null) return "—";
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(h / 45) % 8];
  };

  return (
    <div className="pt-2 pb-24 space-y-5">
      {/* Bag GPS Connect Button */}
      <div className="rounded-2xl border border-border/50 bg-card/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Bag GPS</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {bluetooth.status === "connected"
                ? "Receiving location data from bag"
                : bluetooth.status === "connecting"
                ? "Connecting to bag…"
                : "Connect to receive bag location"}
            </p>
          </div>
          <button
            onClick={bluetooth.status === "connected" ? bluetooth.disconnect : bluetooth.connect}
            disabled={bluetooth.status === "connecting"}
            data-testid="button-bag-gps-connect"
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50 ${
              bluetooth.status === "connected"
                ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30"
                : "bg-primary text-primary-foreground shadow-[0_0_16px_rgba(6,182,212,0.3)] hover:shadow-[0_0_24px_rgba(6,182,212,0.5)]"
            }`}
          >
            {bluetooth.status === "connecting" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : bluetooth.status === "connected" ? (
              <><Link2 className="w-4 h-4" /> Linked</>
            ) : (
              <><Bluetooth className="w-4 h-4" /> Connect Bag</>
            )}
          </button>
        </div>
      </div>

      {/* Hero status card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-card to-card/50 border border-border/50 p-6 shadow-xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <MapPin className="w-32 h-32" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-muted-foreground text-sm font-medium uppercase tracking-wider">Location</h2>
            <button
              onClick={startTracking}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
              data-testid="button-refresh-location"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loading && !coords && (
            <div className="flex items-center gap-3 py-6">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-muted-foreground text-sm">Acquiring signal…</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 py-4">
              <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-red-400 font-medium">Location Unavailable</p>
                <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
                <button onClick={startTracking} className="mt-2 text-xs text-primary underline" data-testid="button-retry-location">
                  Try again
                </button>
              </div>
            </div>
          )}

          {coords && (
            <>
              <div className="flex items-center gap-2 mb-4">
                <Crosshair className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold text-white tracking-tight">LIVE SIGNAL</span>
                <AccuracyRing accuracy={coords.accuracy} />
              </div>

              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="bg-background/30 rounded-xl px-3 py-2.5 border border-white/5 font-mono">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Latitude</div>
                  <div className="text-sm text-primary" data-testid="text-latitude">{formatCoord(coords.lat, "N", "S")}</div>
                </div>
                <div className="bg-background/30 rounded-xl px-3 py-2.5 border border-white/5 font-mono">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Longitude</div>
                  <div className="text-sm text-primary" data-testid="text-longitude">{formatCoord(coords.lng, "E", "W")}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-background/30 rounded-xl p-2.5 border border-white/5 text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">Accuracy</div>
                  <div className="text-sm font-mono text-yellow-400" data-testid="text-accuracy">±{Math.round(coords.accuracy)}m</div>
                </div>
                <div className="bg-background/30 rounded-xl p-2.5 border border-white/5 text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">Speed</div>
                  <div className="text-sm font-mono text-primary" data-testid="text-speed">
                    {coords.speed !== null ? `${(coords.speed * 3.6).toFixed(1)} km/h` : "—"}
                  </div>
                </div>
                <div className="bg-background/30 rounded-xl p-2.5 border border-white/5 text-center">
                  <Compass className="w-3 h-3 text-muted-foreground mx-auto mb-1" />
                  <div className="text-sm font-mono text-primary" data-testid="text-heading">{headingLabel(coords.heading)}</div>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground font-mono mt-2 text-right">
                Updated {new Date(coords.timestamp).toLocaleTimeString()}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Live Map */}
      {coords ? (
        <div className="rounded-2xl overflow-hidden border border-border/50 shadow-lg">
          <LiveMap coords={coords} savedPlaces={savedPlaces} bagLocation={bluetooth.bagLocation} lastSeen={lastSeen} />
        </div>
      ) : (
        <div className="rounded-2xl border border-border/50 bg-card/30 h-[280px] flex flex-col items-center justify-center text-muted-foreground opacity-40 gap-2">
          <MapPin className="w-10 h-10" />
          <p className="text-sm">Map loads once signal is acquired</p>
        </div>
      )}

      {/* Bag GPS status card */}
      {(bluetooth.bagLocation || lastSeen) && (
        <div className="rounded-2xl border border-border/50 bg-card/50 p-4 space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Bag Location</h3>
          {bluetooth.bagLocation ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <span className="text-base">🎒</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-400">Live GPS Active</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {bluetooth.bagLocation.lat.toFixed(6)}, {bluetooth.bagLocation.lng.toFixed(6)}
                </p>
                {coords && (
                  <p className="text-xs text-primary font-mono mt-0.5">
                    {formatDistance(haversineDistance(coords.lat, coords.lng, bluetooth.bagLocation.lat, bluetooth.bagLocation.lng))} from you
                  </p>
                )}
              </div>
            </div>
          ) : lastSeen ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-500/20 flex items-center justify-center shrink-0">
                <span className="text-base">🎒</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Last Seen</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {lastSeen.lat.toFixed(6)}, {lastSeen.lng.toFixed(6)}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {new Date(lastSeen.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  {coords && ` · ${formatDistance(haversineDistance(coords.lat, coords.lng, lastSeen.lat, lastSeen.lng))} from you`}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Saved places */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            Saved Places
          </h3>
          {coords && (
            <button
              onClick={() => setShowSaveForm((s) => !s)}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
              data-testid="button-toggle-save-form"
            >
              <Plus className="w-4 h-4" />
              Save Here
            </button>
          )}
        </div>

        {showSaveForm && coords && (
          <div className="bg-card/50 rounded-2xl border border-border/50 p-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Current: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </p>
            <input
              value={newPlaceName}
              onChange={(e) => setNewPlaceName(e.target.value)}
              placeholder="e.g. Home, School, Library…"
              className="w-full bg-background/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              data-testid="input-place-name"
              onKeyDown={(e) => e.key === "Enter" && saveCurrentPlace()}
            />
            <div className="flex gap-2">
              <Button onClick={saveCurrentPlace} className="flex-1 rounded-xl h-10" data-testid="button-save-place">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button variant="outline" onClick={() => setShowSaveForm(false)} className="rounded-xl h-10" data-testid="button-cancel-save">
                Cancel
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="h-[220px] rounded-2xl bg-card/30 border border-border/50 p-4">
          {savedPlaces.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-40 py-8">
              <MapPin className="w-10 h-10 mb-3" />
              <p className="text-sm">No saved places yet</p>
              <p className="text-xs mt-1">Save your current location to see it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {savedPlaces.map((place) => {
                const dist = coords ? haversineDistance(coords.lat, coords.lng, place.lat, place.lng) : null;
                const isNear = dist !== null && dist < 50;
                return (
                  <div
                    key={place.id}
                    className="bg-card hover:bg-card/80 transition-colors p-3 rounded-xl border border-border/30 flex items-start gap-3"
                    data-testid={`card-place-${place.id}`}
                  >
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isNear ? "bg-green-500/20" : "bg-primary/10"}`}>
                      <MapPin className={`w-4 h-4 ${isNear ? "text-green-400" : "text-primary"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{place.name}</span>
                        {isNear && <span className="text-[10px] text-green-400 font-bold tracking-wider shrink-0">HERE</span>}
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
                      </p>
                      {dist !== null && (
                        <p className="text-[11px] text-primary font-mono mt-0.5" data-testid={`text-distance-${place.id}`}>
                          {formatDistance(dist)} away
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => deletePlace(place.id)}
                      className="p-1.5 hover:bg-destructive/20 rounded-lg transition-colors shrink-0"
                      data-testid={`button-delete-place-${place.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
