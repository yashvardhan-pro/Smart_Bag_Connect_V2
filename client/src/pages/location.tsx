import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Navigation, Crosshair, Plus, Trash2, CheckCircle2, XCircle, Loader2, RefreshCw, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

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

export default function LocationPage() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [newPlaceName, setNewPlaceName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);
  const watchId = useRef<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedPlaces(JSON.parse(raw));
    } catch {}
  }, []);

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
      {/* Hero card */}
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
                <button
                  onClick={startTracking}
                  className="mt-2 text-xs text-primary underline"
                  data-testid="button-retry-location"
                >
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

              <div className="grid grid-cols-1 gap-2 mb-4">
                <div className="bg-background/30 rounded-xl px-4 py-3 border border-white/5 font-mono">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Latitude</div>
                  <div className="text-base text-primary" data-testid="text-latitude">
                    {formatCoord(coords.lat, "N", "S")}
                  </div>
                </div>
                <div className="bg-background/30 rounded-xl px-4 py-3 border border-white/5 font-mono">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">Longitude</div>
                  <div className="text-base text-primary" data-testid="text-longitude">
                    {formatCoord(coords.lng, "E", "W")}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-background/30 rounded-xl p-3 border border-white/5 text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">Accuracy</div>
                  <div className="text-sm font-mono text-yellow-400" data-testid="text-accuracy">
                    ±{Math.round(coords.accuracy)}m
                  </div>
                </div>
                <div className="bg-background/30 rounded-xl p-3 border border-white/5 text-center">
                  <div className="text-[10px] text-muted-foreground mb-1">Speed</div>
                  <div className="text-sm font-mono text-primary" data-testid="text-speed">
                    {coords.speed !== null ? `${(coords.speed * 3.6).toFixed(1)} km/h` : "—"}
                  </div>
                </div>
                <div className="bg-background/30 rounded-xl p-3 border border-white/5 text-center">
                  <Compass className="w-3 h-3 text-muted-foreground mx-auto mb-1" />
                  <div className="text-sm font-mono text-primary" data-testid="text-heading">
                    {headingLabel(coords.heading)}
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground font-mono mt-3 text-right">
                Updated {new Date(coords.timestamp).toLocaleTimeString()}
              </p>
            </>
          )}
        </div>
      </div>

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
              <Button
                onClick={saveCurrentPlace}
                className="flex-1 rounded-xl h-10"
                data-testid="button-save-place"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowSaveForm(false)}
                className="rounded-xl h-10"
                data-testid="button-cancel-save"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="h-[260px] rounded-2xl bg-card/30 border border-border/50 p-4">
          {savedPlaces.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-40 py-10">
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
                    className="bg-card hover:bg-card/80 transition-colors p-4 rounded-xl border border-border/30 flex items-start gap-3"
                    data-testid={`card-place-${place.id}`}
                  >
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isNear ? "bg-green-500/20" : "bg-primary/10"}`}>
                      <MapPin className={`w-4 h-4 ${isNear ? "text-green-400" : "text-primary"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{place.name}</span>
                        {isNear && (
                          <span className="text-[10px] text-green-400 font-bold tracking-wider shrink-0">HERE</span>
                        )}
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
                      </p>
                      {dist !== null && (
                        <p className="text-[11px] text-primary font-mono mt-1" data-testid={`text-distance-${place.id}`}>
                          {formatDistance(dist)} away
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Saved {new Date(place.savedAt).toLocaleDateString()}
                      </p>
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
