import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-draw';
import { Shield, Mail, Save, List } from 'lucide-react';
import { useGeofences, useCreateGeofence } from '../../Infrastructure/hooks/useReports.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { FormField } from '../components/ui/FormField.js';
import { Toast } from '../components/ui/Toast.js';

import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Custom component to integrate Leaflet Draw controls natively
const DrawControl: React.FC<{ onCreated: (coords: [number, number][]) => void }> = ({ onCreated }) => {
  const map = useMap();

  useEffect(() => {
    // 1. Create FeatureGroup to store drawn items
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // 2. Configure Draw toolbar options
    const drawControl = new L.Control.Draw({
      draw: {
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: '#00B4D8',
            fillColor: '#00B4D8',
            fillOpacity: 0.2
          }
        }
      },
      edit: {
        featureGroup: drawnItems,
        remove: true
      }
    });

    map.addControl(drawControl);

    // 3. Handle DRAW CREATED event
    const handleCreated = (e: any) => {
      const layer = e.layer;
      drawnItems.clearLayers(); // keep only one active drawing at a time
      drawnItems.addLayer(layer);

      if (layer instanceof L.Polygon) {
        const latlngs = layer.getLatLngs() as any;
        const normalized = (Array.isArray(latlngs[0]) ? latlngs[0] : latlngs).map((ll: any) => [ll.lat, ll.lng]);
        onCreated(normalized);
      }
    };

    map.on(L.Draw.Event.CREATED, handleCreated);

    return () => {
      map.removeControl(drawControl);
      map.off(L.Draw.Event.CREATED, handleCreated);
    };
  }, [map, onCreated]);

  return null;
};

// Component to fly to specific bounds
const FitBounds: React.FC<{ coords: [number, number][] | null }> = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      map.fitBounds(coords);
    }
  }, [coords, map]);
  return null;
};

export const GeofenceConfigPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: geofences = [], refetch } = useGeofences();
  const createMutation = useCreateGeofence();

  const [name, setName] = useState('');
  const [alertEmail, setAlertEmail] = useState('');
  const [drawnCoords, setDrawnCoords] = useState<[number, number][]>([]);
  const [selectedGeofence, setSelectedGeofence] = useState<any | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handlePolygonCreated = (coords: [number, number][]) => {
    setDrawnCoords(coords);
    setSelectedGeofence(null); // clear viewing mode
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setToast({ message: t('geofencePage.nameRequired'), type: 'error' });
      return;
    }
    if (!alertEmail.trim()) {
      setToast({ message: t('geofencePage.emailRequired'), type: 'error' });
      return;
    }
    if (drawnCoords.length < 3) {
      setToast({ message: t('geofencePage.drawRequired'), type: 'error' });
      return;
    }

    try {
      await createMutation.mutateAsync({
        name,
        alertEmail,
        coordinatesJson: JSON.stringify(drawnCoords),
        isActive: true,
      });

      setToast({ message: t('geofencePage.savedSuccess'), type: 'success' });
      setName('');
      setAlertEmail('');
      setDrawnCoords([]);
      refetch();
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to save geofence', type: 'error' });
    }
  };

  // Click on existing geofence to focus and display on map
  const handleSelectGeofence = (gf: any) => {
    try {
      const parsed = JSON.parse(gf.coordinatesJson);
      setSelectedGeofence({
        ...gf,
        coords: parsed
      });
      setDrawnCoords([]); // clear currently drawing polygon
    } catch (e) {
      setToast({ message: t('geofencePage.parseError'), type: 'error' });
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full h-[calc(100vh-100px)] animate-fade-in">
      <PageHeader
        title={t('geofencePage.title')}
        description={t('geofencePage.subtitle')}
      />

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Left pane: Config Form & Geofence List */}
        <div className="w-full lg:w-96 flex flex-col gap-5 overflow-y-auto shrink-0">
          
          {/* Drawing Form */}
          <form onSubmit={handleSave} className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex flex-col gap-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-fg-secondary flex items-center gap-1.5 border-b border-border-surface/20 pb-2">
              <Shield size={14} className="text-accent-primary" />
              <span>{t('geofencePage.defineNewBoundary')}</span>
            </h3>

            <FormField label={t('geofencePage.name')} required>
              <Input
                type="text"
                placeholder="e.g. Santo Domingo Bounds"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </FormField>

            <FormField label={t('geofencePage.alertEmail')} required>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-fg-tertiary">
                  <Mail size={14} />
                </span>
                <input
                  type="email"
                  placeholder="alerts@yourdomain.com"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  className="w-full text-xs min-h-[44px] pl-10 pr-4 rounded-xl bg-bg-inset border border-border-surface/45 text-fg-main placeholder:text-fg-tertiary focus:outline-none focus:border-accent-primary transition-all"
                  required
                />
              </div>
            </FormField>

            {drawnCoords.length > 0 && (
              <div className="p-3 rounded-xl bg-bg-inset border border-border-surface/30">
                <span className="text-xs font-bold uppercase tracking-wider text-fg-secondary">
                  {t('geofencePage.vertices')} ({drawnCoords.length})
                </span>
                <div className="max-h-24 overflow-y-auto mt-1 flex flex-col gap-1 font-mono text-xs text-fg-tertiary">
                  {drawnCoords.map((pt, i) => (
                    <div key={i} className="flex justify-between">
                      <span>Point {i + 1}:</span>
                      <span>{pt[0].toFixed(5)}, {pt[1].toFixed(5)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={createMutation.isPending || drawnCoords.length < 3}
              className="w-full flex items-center justify-center gap-2 mt-2"
            >
              <Save size={15} />
              <span>{t('geofencePage.saveGeofence')}</span>
            </Button>
          </form>

          {/* Existing Geofences List */}
          <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex-1 flex flex-col gap-4 min-h-[250px]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-fg-secondary flex items-center gap-1.5 border-b border-border-surface/20 pb-2">
              <List size={14} className="text-accent-primary" />
              <span>{t('geofencePage.configuredGeofences')}</span>
            </h3>

            {geofences.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-fg-tertiary">
                {t('common.noData')}
              </div>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto max-h-[300px] lg:max-h-none">
                {geofences.map((gf) => (
                  <div
                    key={gf.id}
                    onClick={() => handleSelectGeofence(gf)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      selectedGeofence?.id === gf.id
                        ? 'bg-accent-primary/10 border-accent-primary/45'
                        : 'bg-bg-inset/30 border-transparent hover:border-border-surface/30 hover:bg-bg-inset/60'
                    }`}
                  >
                    <div className="flex justify-between items-center font-bold text-fg-main">
                      <span>{gf.name}</span>
                      <span className={`w-2 h-2 rounded-full ${gf.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    </div>
                    <div className="text-xs text-fg-secondary font-mono mt-1">
                      Email: {gf.alertEmail}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map Workspace */}
        <div className="flex-1 min-h-[400px] lg:min-h-0 border border-border-surface/40 rounded-2xl overflow-hidden shadow-inner relative bg-bg-inset">
          <MapContainer
            center={[18.4861, -69.9312]}
            zoom={13}
            className="w-full h-full z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Custom Draw control component */}
            <DrawControl onCreated={handlePolygonCreated} />

            {/* Display currently selected geofence */}
            {selectedGeofence && (
              <>
                <Polygon
                  positions={selectedGeofence.coords}
                  pathOptions={{ color: '#0E8E9A', fillColor: '#0E8E9A', fillOpacity: 0.35 }}
                />
                <FitBounds coords={selectedGeofence.coords} />
              </>
            )}

            {/* Render all other geofences passively in red/gray */}
            {geofences
              .filter(gf => gf.id !== selectedGeofence?.id)
              .map(gf => {
                try {
                  const pts = JSON.parse(gf.coordinatesJson);
                  return (
                    <Polygon
                      key={gf.id}
                      positions={pts}
                      pathOptions={{ color: '#9CA3AF', fillColor: '#9CA3AF', fillOpacity: 0.15, dashArray: '5, 5' }}
                    />
                  );
                } catch {
                  return null;
                }
              })}
          </MapContainer>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default GeofenceConfigPage;
