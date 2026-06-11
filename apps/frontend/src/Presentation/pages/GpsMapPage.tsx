import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { Navigation, Eye, RefreshCw } from 'lucide-react';
import { useGpsLive } from '../../Infrastructure/hooks/useReports.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Button } from '../components/ui/Button.js';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon using CDN to avoid build asset bundling issues
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to control map center programmatically
const ChangeMapView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

export const GpsMapPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: vehicles = [], isLoading, refetch, dataUpdatedAt } = useGpsLive();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([18.4861, -69.9312]);
  const [zoom, setZoom] = useState(13);

  // Auto-center map when a vehicle is selected from the side pane
  const handleSelectVehicle = (vehicle: any) => {
    setSelectedVehicleId(vehicle.vehicleId);
    setMapCenter([vehicle.latitude, vehicle.longitude]);
    setZoom(16);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RENTED':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'AVAILABLE':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      default:
        return 'text-fg-secondary bg-bg-inset border-border-surface';
    }
  };



  return (
    <div className="flex flex-col gap-6 w-full h-[calc(100vh-100px)] animate-fade-in">
      <div className="flex justify-between items-start">
        <PageHeader
          title={t('gpsPage.title')}
          description={t('gpsPage.subtitle')}
        />
        <div className="flex flex-col items-end gap-1.5 mt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            className="flex items-center gap-1.5"
            disabled={isLoading}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>{t('network.sync')}</span>
          </Button>
          {dataUpdatedAt && (
            <span className="text-xs font-mono text-fg-tertiary">
              {t('gpsPage.lastUpdated', { time: new Date(dataUpdatedAt).toLocaleTimeString() })}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        {/* Active Vehicles Sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-4 bg-bg-card border border-border-surface/40 backdrop-blur-md rounded-2xl p-5 overflow-y-auto">
          <h3 className="text-xs font-bold uppercase tracking-wider text-fg-secondary">
            {t('gpsPage.activeVehicles')} ({vehicles.length})
          </h3>
          
          {isLoading && vehicles.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-fg-tertiary font-mono">
              {t('common.loading')}
            </div>
          ) : vehicles.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-fg-tertiary text-center">
              {t('gpsPage.noVehicles')}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {vehicles.map((v) => (
                <div
                  key={v.vehicleId}
                  onClick={() => handleSelectVehicle(v)}
                  className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col gap-1.5 ${
                    selectedVehicleId === v.vehicleId
                      ? 'bg-accent-primary/10 border-accent-primary/45 shadow-sm'
                      : 'bg-bg-inset/30 border-transparent hover:border-border-surface/30 hover:bg-bg-inset/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-fg-main">
                      {v.brand} {v.model}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getStatusColor(v.status)}`}>
                      {v.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-fg-secondary">
                    <span className="font-mono">{v.plateNumber}</span>
                    <span className="font-semibold flex items-center gap-1 text-accent-primary">
                      <Navigation size={11} className="rotate-45" /> {v.speedKmH} km/h
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1 pt-1.5 border-t border-border-surface/30">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/gps/trail/${v.vehicleId}`);
                      }}
                      className="text-xs font-semibold text-accent-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye size={10} />
                      <span>{t('gpsPage.viewTrail')}</span>
                    </button>
                    <span className="text-xs font-mono text-fg-tertiary">
                      {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leaflet Map Card */}
        <div className="flex-1 min-h-[400px] lg:min-h-0 border border-border-surface/40 rounded-2xl overflow-hidden shadow-inner relative bg-bg-inset">
          <MapContainer
            center={mapCenter}
            zoom={zoom}
            className="w-full h-full z-0"
          >
            <ChangeMapView center={mapCenter} zoom={zoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {vehicles.map((v) => (
              <Marker
                key={v.vehicleId}
                position={[v.latitude, v.longitude]}
                eventHandlers={{
                  click: () => {
                    setSelectedVehicleId(v.vehicleId);
                  },
                }}
              >
                <Popup>
                  <div className="text-xs flex flex-col gap-1 p-0.5">
                    <span className="font-bold text-fg-main text-sm">
                      {v.brand} {v.model}
                    </span>
                    <span className="font-mono text-fg-secondary">
                      {t('vehicles.plateNumber')}: {v.plateNumber}
                    </span>
                    <span className="font-mono text-fg-secondary">
                      {t('gpsPage.speed')} {v.speedKmH} km/h
                    </span>
                    <span className="font-mono text-fg-secondary">
                      {t('gpsPage.heading')} {v.heading}°
                    </span>
                    <span className="font-mono text-fg-tertiary text-xs mt-1">
                      {new Date(v.timestamp).toLocaleString()}
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/admin/gps/trail/${v.vehicleId}`)}
                      className="mt-2 text-xs !min-h-[28px] !py-1 !px-2 rounded-lg"
                    >
                      {t('gpsPage.viewHistoricalTrail')}
                    </Button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default GpsMapPage;
