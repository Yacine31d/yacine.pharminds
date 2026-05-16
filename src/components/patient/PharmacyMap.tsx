/**
 * PharmacyMap — Interactive Leaflet map for Radar Stock
 * Shows pharmacies that have a drug in stock, with directions.
 */
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Navigation, Phone, MapPin, ExternalLink } from 'lucide-react';

/* ── Fix Leaflet default marker icons in Vite ─────────────── */
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl:     markerShadow,
});

/* ── Custom green marker for in-stock pharmacies ─────────── */
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: markerShadow,
  iconSize:    [25, 41],
  iconAnchor:  [12, 41],
  popupAnchor: [1, -34],
  shadowSize:  [41, 41],
});

/* ── Wilaya center coordinates (all 48 wilayas) ───────────── */
export const WILAYA_COORDS: Record<string, [number, number]> = {
  'Adrar':              [27.8742, -0.2916],
  'Chlef':              [36.1647,  1.3317],
  'Laghouat':           [33.8000,  2.8644],
  'Oum El Bouaghi':     [35.8731,  7.1131],
  'Batna':              [35.5559,  6.1741],
  'Béjaïa':             [36.7510,  5.0560],
  'Biskra':             [34.8500,  5.7300],
  'Béchar':             [31.6167, -2.2167],
  'Blida':              [36.4700,  2.8300],
  'Bouira':             [36.3731,  3.9003],
  'Tamanrasset':        [22.7853,  5.5228],
  'Tébessa':            [35.4039,  8.1200],
  'Tlemcen':            [34.8800, -1.3200],
  'Tiaret':             [35.3706,  1.3200],
  'Tizi Ouzou':         [36.7169,  4.0497],
  'Alger':              [36.7372,  3.0865],
  'Djelfa':             [34.6700,  3.2600],
  'Jijel':              [36.8219,  5.7660],
  'Sétif':              [36.1898,  5.4108],
  'Saïda':              [34.8306,  0.1500],
  'Skikda':             [36.8762,  6.9078],
  'Sidi Bel Abbès':     [35.1896, -0.6311],
  'Annaba':             [36.9000,  7.7667],
  'Guelma':             [36.4639,  7.4289],
  'Constantine':        [36.3650,  6.6147],
  'Médéa':              [36.2636,  2.7525],
  'Mostaganem':         [35.9317,  0.0886],
  'MSila':              [35.7047,  4.5439],
  'Mascara':            [35.3958,  0.1400],
  'Ouargla':            [31.9539,  5.3250],
  'Oran':               [35.6969, -0.6331],
  'El Bayadh':          [33.6831,  1.0200],
  'Illizi':             [26.5000,  8.4667],
  'Bordj Bou Arréridj': [36.0731,  4.7625],
  'Boumerdès':          [36.7636,  3.4703],
  'El Tarf':            [36.7672,  8.3131],
  'Tindouf':            [27.6667, -8.1500],
  'Tissemsilt':         [35.6078,  1.8106],
  'El Oued':            [33.3681,  6.8631],
  'Khenchela':          [35.4353,  7.1436],
  'Souk Ahras':         [36.2864,  7.9514],
  'Tipaza':             [36.5892,  2.4469],
  'Mila':               [36.4503,  6.2631],
  'Aïn Defla':          [36.2578,  1.9669],
  'Naâma':              [33.2667, -0.3069],
  'Aïn Témouchent':     [35.2958, -1.1400],
  'Ghardaïa':           [32.4908,  3.6736],
  'Relizane':           [35.7378,  0.5558],
};

/* Algeria center */
const ALGERIA_CENTER: [number, number] = [28.0339, 1.6596];

interface PharmacyResult {
  pharmacy_id:   string;
  pharmacy_name: string;
  wilaya:        string;
  phone?:        string | null;
  current_stock: number;
  latitude?:     number | null;
  longitude?:    number | null;
}

interface Props {
  pharmacies:  PharmacyResult[];
  targetWilaya: string;
  drugName:    string;
}

/* ── Auto-fit map bounds when pharmacies change ─────────────── */
function BoundsUpdater({ pharmacies, targetWilaya }: { pharmacies: PharmacyResult[]; targetWilaya: string }) {
  const map = useMap();

  useEffect(() => {
    if (pharmacies.length > 0) {
      const coords = pharmacies.map(p =>
        (p.latitude && p.longitude)
          ? [p.latitude, p.longitude] as [number, number]
          : WILAYA_COORDS[p.wilaya]
      ).filter(Boolean) as [number, number][];

      if (coords.length === 1) {
        map.setView(coords[0], 12);
      } else if (coords.length > 1) {
        const bounds = L.latLngBounds(coords);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } else {
      const center = WILAYA_COORDS[targetWilaya] ?? ALGERIA_CENTER;
      map.setView(center, 10);
    }
  }, [pharmacies, targetWilaya, map]);

  return null;
}

/* ── Main component ─────────────────────────────────────────── */
export function PharmacyMap({ pharmacies, targetWilaya, drugName }: Props) {
  const initialCenter = WILAYA_COORDS[targetWilaya] ?? ALGERIA_CENTER;

  const openGoogleMaps = (pharmacy: PharmacyResult) => {
    const query = encodeURIComponent(`${pharmacy.pharmacy_name} ${pharmacy.wilaya} Algeria`);
    window.open(`https://www.google.com/maps/search/${query}`, '_blank');
  };

  const openDirections = (pharmacy: PharmacyResult) => {
    const coords = WILAYA_COORDS[pharmacy.wilaya];
    if (coords) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${coords[0]},${coords[1]}&travelmode=driving`,
        '_blank'
      );
    } else {
      const query = encodeURIComponent(`${pharmacy.wilaya} Algeria`);
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank');
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-border/40 shadow-lg" style={{ height: 420 }}>
      <MapContainer
        center={initialCenter}
        zoom={pharmacies.length > 0 ? 11 : 6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <BoundsUpdater pharmacies={pharmacies} targetWilaya={targetWilaya} />

        {pharmacies.map((pharmacy) => {
          /* Use exact GPS if available, otherwise fall back to wilaya center */
          const hasExact = !!(pharmacy.latitude && pharmacy.longitude);
          const wilayaCoords = WILAYA_COORDS[pharmacy.wilaya];

          let offset: [number, number];
          if (hasExact) {
            offset = [pharmacy.latitude!, pharmacy.longitude!];
          } else if (wilayaCoords) {
            const idx = pharmacies.indexOf(pharmacy);
            offset = [
              wilayaCoords[0] + (idx % 3) * 0.005,
              wilayaCoords[1] + Math.floor(idx / 3) * 0.005,
            ];
          } else {
            return null;
          }

          return (
            <Marker key={pharmacy.pharmacy_id} position={offset} icon={greenIcon}>
              <Popup minWidth={220}>
                <div className="space-y-2 py-1">
                  {/* Header */}
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                      <span className="text-lg">🏥</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-tight">{pharmacy.pharmacy_name}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {pharmacy.wilaya}
                      </p>
                    </div>
                  </div>

                  {/* Drug + stock */}
                  <div className="bg-green-50 rounded-lg px-2 py-1.5 text-xs">
                    <span className="text-green-700 font-medium">✅ {drugName}</span>
                    <span className="text-gray-500 ml-1">— {pharmacy.current_stock} unité(s)</span>
                  </div>

                  {/* Precision badge */}
                  <div className={`text-[10px] px-2 py-0.5 rounded-full w-fit ${
                    pharmacy.latitude && pharmacy.longitude
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-yellow-50 text-yellow-600'
                  }`}>
                    {pharmacy.latitude && pharmacy.longitude ? '📍 Position exacte' : '📍 Position approximative (wilaya)'}
                  </div>

                  {/* Phone */}
                  {pharmacy.phone && (
                    <a
                      href={`tel:${pharmacy.phone}`}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                    >
                      <Phone size={11} /> {pharmacy.phone}
                    </a>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1.5 pt-1">
                    <button
                      onClick={() => openDirections(pharmacy)}
                      className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white text-xs py-1.5 px-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Navigation size={11} /> Itinéraire
                    </button>
                    <button
                      onClick={() => openGoogleMaps(pharmacy)}
                      className="flex items-center justify-center gap-1 bg-gray-100 text-gray-700 text-xs py-1.5 px-2 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <ExternalLink size={11} /> Maps
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* No results marker */}
        {pharmacies.length === 0 && (
          <Marker position={initialCenter}>
            <Popup>
              <p className="text-sm text-gray-500">Aucune pharmacie trouvée à {targetWilaya}</p>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
