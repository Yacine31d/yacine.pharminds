/**
 * LocationPicker — Leaflet map for pharmacists to pin their exact location
 */
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, MapPin, Crosshair, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WILAYA_COORDS } from '@/components/patient/PharmacyMap';

/* Fix Leaflet icons in Vite */
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: markerShadow,
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});

interface Props {
  lat:      number | null;
  lng:      number | null;
  wilaya?:  string;
  onChange: (lat: number, lng: number) => void;
}

/* Inner component — captures map click events */
function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onMapClick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

export function LocationPicker({ lat, lng, wilaya, onChange }: Props) {
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState('');

  const defaultCenter: [number, number] =
    lat && lng
      ? [lat, lng]
      : wilaya && WILAYA_COORDS[wilaya]
      ? WILAYA_COORDS[wilaya]
      : [36.7372, 3.0865]; // Alger fallback

  const useMyLocation = () => {
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      (err) => {
        setGpsError('Impossible d\'obtenir votre position. Autorisez la géolocalisation dans votre navigateur.');
        setLocating(false);
        console.error('Geolocation error:', err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      {/* Instructions */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15 text-sm">
        <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">Cliquez sur la carte</span> pour placer votre pharmacie
          ou utilisez le bouton GPS pour vous localiser automatiquement.
        </p>
      </div>

      {/* GPS button */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={useMyLocation}
          disabled={locating}
        >
          {locating ? (
            <><Crosshair className="w-4 h-4 animate-spin" /> Localisation…</>
          ) : (
            <><Navigation className="w-4 h-4" /> Utiliser ma position GPS</>
          )}
        </Button>

        {lat && lng && (
          <span className="flex items-center gap-1.5 text-xs text-success font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            Position enregistrée ({lat.toFixed(5)}, {lng.toFixed(5)})
          </span>
        )}
      </div>

      {gpsError && (
        <p className="text-xs text-destructive">{gpsError}</p>
      )}

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-border/40 shadow-sm" style={{ height: 320 }}>
        <MapContainer
          center={defaultCenter}
          zoom={lat && lng ? 15 : 10}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onMapClick={onChange} />
          {lat && lng && (
            <Marker position={[lat, lng]} icon={redIcon} />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground">
        📍 Les patients verront votre position exacte sur la carte Radar Stock.
      </p>
    </div>
  );
}
