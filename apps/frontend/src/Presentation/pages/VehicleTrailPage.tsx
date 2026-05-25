import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Navigation, Activity } from 'lucide-react';
import { useVehicleTrail } from '../../Infrastructure/hooks/useReports.js';
import { apiClient } from '../../Infrastructure/api-client.js';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Button } from '../components/ui/Button.js';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icons using CDN
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Helper to fit trail polyline bounds on map load
const FitTrailBounds: React.FC<{ positions: [number, number][] }> = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);
  return null;
};

export const VehicleTrailPage: React.FC = () => {
  const { t } = useTranslation();

  const { vehicleId = '' } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();

  const [activeVehicleId, setActiveVehicleId] = useState(vehicleId);

  // Sync state if url param changes
  useEffect(() => {
    if (vehicleId) {
      setActiveVehicleId(vehicleId);
    }
  }, [vehicleId]);

  // Query vehicles for selection dropdown
  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: ['vehicles-dropdown'],
    queryFn: async () => {
      const res = await apiClient('/api/vehicles');
      return res.data?.items || [];
    }
  });

  // Query trail logs
  const { data: trailLogs = [], isLoading } = useVehicleTrail(activeVehicleId);

  const selectedVehicle = vehicles.find(v => v.id === activeVehicleId);

  // Extract path positions for Leaflet
  const polylinePositions = trailLogs.map(log => [log.latitude, log.longitude] as [number, number]);

  // Format data for Recharts speed graph
  const chartData = trailLogs.map(log => ({
    time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    speed: log.speedKmH,
    heading: log.heading,
  }));

  const handleVehicleChange = (id: string) => {
    setActiveVehicleId(id);
    navigate(`/admin/gps/trail/${id}`);
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/gps/map')}
            className="!p-2.5 rounded-xl border border-border-surface/40 hover:bg-bg-inset transition-all"
          >
            <ArrowLeft size={16} />
          </Button>
          <PageHeader
            title={t('trailPage.title')}
            description={t('trailPage.subtitle')}
          />
        </div>

        {/* Dropdown to select vehicle */}
        <div className="flex items-center gap-2 mt-2 w-full sm:w-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-fg-secondary">{t('trailPage.vehicleLabel')}</span>
          <select
            value={activeVehicleId}
            onChange={(e) => handleVehicleChange(e.target.value)}
            className="text-xs min-h-[40px] px-3 rounded-xl bg-bg-card border border-border-surface/45 text-fg-main focus:outline-none focus:border-accent-primary transition-all w-full sm:w-56"
          >
            <option value="">{t('trailPage.selectPlaceholder')}</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.brand?.name} {v.model?.name} ({v.plateNumber})
              </option>
            ))}
          </select>
        </div>
      </div>

      {!activeVehicleId ? (
        <div className="p-12 text-center rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md text-fg-secondary">
          {t('trailPage.pleaseSelect')}
        </div>
      ) : isLoading ? (
        <div className="p-12 text-center rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md text-fg-secondary font-mono text-xs">
          {t('trailPage.loading')}
        </div>
      ) : trailLogs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md text-fg-secondary">
          {t('trailPage.noLogs')}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[calc(100vh-180px)] min-h-[600px]">
          {/* Map view */}
          <div className="border border-border-surface/40 rounded-2xl overflow-hidden shadow-md bg-bg-inset h-full min-h-[350px] relative">
            <MapContainer
              center={polylinePositions[0] || [18.4861, -69.9312]}
              zoom={14}
              className="w-full h-full z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {polylinePositions.length > 0 && (
                <>
                  <Polyline
                    positions={polylinePositions}
                    pathOptions={{ color: '#00B4D8', weight: 4, opacity: 0.8 }}
                  />
                  <FitTrailBounds positions={polylinePositions} />
                </>
              )}
              {trailLogs.map((log, idx) => (
                <Marker key={log.id} position={[log.latitude, log.longitude]}>
                  <Popup>
                    <div className="text-xs p-1 flex flex-col gap-1">
                      <span className="font-bold text-accent-primary">Point #{idx + 1}</span>
                      <span>Speed: {log.speedKmH} km/h</span>
                      <span>Heading: {log.heading}°</span>
                      <span className="text-[10px] text-fg-tertiary">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Speed line chart & details panel */}
          <div className="flex flex-col gap-6 h-full min-h-0">
            {/* Vehicle Card Summary */}
            {selectedVehicle && (
              <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex flex-col gap-2 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent-primary flex items-center gap-1.5">
                  <Navigation size={12} className="rotate-45" /> {t('trailPage.activeDetails')}
                </span>
                <h3 className="text-sm font-extrabold text-fg-main uppercase">
                  {selectedVehicle.brand?.name} {selectedVehicle.model?.name}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2 font-mono text-xs text-fg-secondary">
                  <div>
                    <span className="text-fg-tertiary block text-[10px] uppercase">{t('trailPage.plate')}</span>
                    {selectedVehicle.plateNumber}
                  </div>
                  <div>
                    <span className="text-fg-tertiary block text-[10px] uppercase">{t('trailPage.chassis')}</span>
                    {selectedVehicle.chassisNumber}
                  </div>
                  <div>
                    <span className="text-fg-tertiary block text-[10px] uppercase">{t('trailPage.odometer')}</span>
                    {selectedVehicle.odometer} km
                  </div>
                  <div>
                    <span className="text-fg-tertiary block text-[10px] uppercase">{t('trailPage.pointsCount')}</span>
                    {trailLogs.length} points
                  </div>
                </div>
              </div>
            )}

            {/* Recharts Speed Graph */}
            <div className="flex-1 p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex flex-col gap-4 min-h-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-fg-secondary flex items-center gap-1.5 shrink-0">
                <Activity size={14} className="text-accent-primary" />
                <span>{t('trailPage.speedProfile')}</span>
              </h3>

              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                    <XAxis
                      dataKey="time"
                      stroke="var(--text-secondary)"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="var(--text-secondary)"
                      fontSize={10}
                      tickLine={false}
                      unit=" km/h"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--surface-elevated)',
                        borderColor: 'var(--surface-border)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                        fontFamily: 'var(--font-sans)'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="speed"
                      name="Speed"
                      stroke="#00B4D8"
                      strokeWidth={3}
                      dot={{ r: 4, strokeWidth: 0, fill: '#0E8E9A' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleTrailPage;
