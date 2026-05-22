import React from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../Infrastructure/query-client.js';
import { AuthProvider } from '../Infrastructure/auth.context.js';

// Layouts
import { AuthLayout } from './layouts/AuthLayout.js';
import { AdminLayout } from './layouts/AdminLayout.js';
import { CustomerLayout } from './layouts/CustomerLayout.js';
import { PublicLayout } from './layouts/PublicLayout.js';

// Pages
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { VehiclesPage } from './pages/VehiclesPage.js';
import { VehicleTypesPage } from './pages/VehicleTypesPage.js';
import { BrandsPage } from './pages/BrandsPage.js';
import { ModelsPage } from './pages/ModelsPage.js';
import { FuelTypesPage } from './pages/FuelTypesPage.js';
import { CustomersPage } from './pages/CustomersPage.js';
import { EmployeesPage } from './pages/EmployeesPage.js';
import { SeasonalRatesPage } from './pages/SeasonalRatesPage.js';
import { FeeConfigPage } from './pages/FeeConfigPage.js';
import { CatalogPage } from './pages/CatalogPage.js';
import { MyProfilePage } from './pages/MyProfilePage.js';
import { MyRentalsPage } from './pages/MyRentalsPage.js';
import { ReservationsPage } from './pages/ReservationsPage.js';
import { InspectionsPage } from './pages/InspectionsPage.js';
import { MagicLoginPage } from './pages/MagicLoginPage.js';

import { NetworkStatusProvider } from '../Infrastructure/network-status.js';

const StubPage: React.FC<{ title: string }> = ({ title }) => {
  const { t } = useTranslation();
  return (
    <div className="p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md">
      <h2 className="text-lg font-bold text-fg-main uppercase tracking-wider">{title}</h2>
      <p className="text-xs text-fg-secondary mt-1">{t('common.noData')}</p>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NetworkStatusProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Catalog Landing Page */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<CatalogPage />} />
              </Route>

              {/* Public/Auth Routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
              </Route>

              {/* Admin Portal */}
              <Route element={<AdminLayout />}>
                <Route path="/admin/dashboard" element={<DashboardPage />} />
                <Route path="/admin/vehicles" element={<VehiclesPage />} />
                <Route path="/admin/vehicle-types" element={<VehicleTypesPage />} />
                <Route path="/admin/brands" element={<BrandsPage />} />
                <Route path="/admin/models" element={<ModelsPage />} />
                <Route path="/admin/fuel-types" element={<FuelTypesPage />} />
                <Route path="/admin/customers" element={<CustomersPage />} />
                <Route path="/admin/employees" element={<EmployeesPage />} />
                <Route path="/admin/seasonal-rates" element={<SeasonalRatesPage />} />
                <Route path="/admin/reservations" element={<ReservationsPage />} />
                <Route path="/admin/inspections" element={<InspectionsPage />} />
                <Route path="/admin/fee-config" element={<FeeConfigPage />} />
                <Route path="/admin/settings" element={<StubPage title="System Settings" />} />
              </Route>

              {/* Customer Hub */}
              <Route element={<CustomerLayout />}>
                <Route path="/customer/dashboard" element={<DashboardPage />} />
                <Route path="/customer/browse" element={<CatalogPage />} />
                <Route path="/customer/reservations" element={<MyRentalsPage />} />
                <Route path="/customer/profile" element={<MyProfilePage />} />
                <Route path="/customer/settings" element={<StubPage title="Account Settings" />} />
              </Route>

              {/* Magic Login */}
              <Route path="/magic-login" element={<MagicLoginPage />} />

              {/* Catch-all Redirect */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </NetworkStatusProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
