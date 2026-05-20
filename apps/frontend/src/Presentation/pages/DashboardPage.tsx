import React from 'react';
import { useAuth } from '@/Infrastructure/auth.context.js';
import { 
  TrendingUp, 
  Car, 
  DollarSign, 
  CalendarDays, 
  Award,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';
import { 
  useReactTable, 
  getCoreRowModel, 
  flexRender, 
  createColumnHelper 
} from '@tanstack/react-table';

const revenueData = [
  { month: 'Jan', revenue: 4200 },
  { month: 'Feb', revenue: 5100 },
  { month: 'Mar', revenue: 5800 },
  { month: 'Apr', revenue: 7200 },
  { month: 'May', revenue: 9400 },
  { month: 'Jun', revenue: 12000 },
];

interface Reservation {
  id: string;
  car: string;
  customer: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Pending' | 'Completed';
  amount: number;
}

const mockReservations: Reservation[] = [
  { id: '1001', car: 'Tesla Model Y', customer: 'David Miller', startDate: '2026-05-18', endDate: '2026-05-22', status: 'Active', amount: 320 },
  { id: '1002', car: 'Porsche Taycan', customer: 'Sophia Chen', startDate: '2026-05-19', endDate: '2026-05-21', status: 'Pending', amount: 590 },
  { id: '1003', car: 'Ford Bronco', customer: 'Marcus Broady', startDate: '2026-05-12', endDate: '2026-05-16', status: 'Completed', amount: 480 },
  { id: '1004', car: 'Audi e-tron', customer: 'Elena Rostova', startDate: '2026-05-20', endDate: '2026-05-25', status: 'Pending', amount: 450 },
];

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const columnHelper = createColumnHelper<Reservation>();
  const columns = [
    columnHelper.accessor('id', {
      header: 'Reservation ID',
      cell: (info) => <span className="font-mono text-fg-secondary">#{info.getValue()}</span>,
    }),
    columnHelper.accessor('car', {
      header: 'Vehicle',
      cell: (info) => <span className="font-semibold text-fg-main">{info.getValue()}</span>,
    }),
    columnHelper.accessor(isAdmin ? 'customer' : 'startDate', {
      header: isAdmin ? 'Customer' : 'Start Date',
      cell: (info) => <span className="text-fg-secondary">{info.getValue()}</span>,
    }),
    columnHelper.accessor(isAdmin ? 'startDate' : 'endDate', {
      header: isAdmin ? 'Start Date' : 'End Date',
      cell: (info) => <span className="text-fg-secondary">{info.getValue()}</span>,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => {
        const val = info.getValue();
        const colors = 
          val === 'Active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
          val === 'Pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
          'bg-fg-tertiary/10 border-border-surface/40 text-fg-secondary';
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${colors}`}>
            {val}
          </span>
        );
      },
    }),
    columnHelper.accessor('amount', {
      header: 'Total Cost',
      cell: (info) => <span className="font-mono font-bold text-fg-main">${info.getValue()}</span>,
    }),
  ];

  const table = useReactTable({
    data: mockReservations,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-fg-main">
          Welcome back, {user?.name?.split(' ')[0] || 'User'}!
        </h2>
        <p className="text-xs text-fg-secondary mt-1">
          {isAdmin 
            ? 'Here is an overview of your fleet logistics, rentals, and operations metrics.' 
            : 'Explore available vehicles, view your active bookings, or manage your rentals.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAdmin ? (
          <>
            <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">Total Fleet Size</span>
                <div className="p-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                  <Car size={16} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-fg-main tracking-tight font-sans">142</span>
                <span className="block text-[10px] text-emerald-500 font-semibold mt-1">
                  <TrendingUp size={12} className="inline mr-1 align-text-top" /> +8% from last month
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">Active Rentals</span>
                <div className="p-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                  <Clock size={16} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-fg-main tracking-tight font-sans">89</span>
                <span className="block text-[10px] text-fg-tertiary font-semibold mt-1">
                  62.6% Utilisation Rate
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">Monthly Revenue</span>
                <div className="p-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                  <DollarSign size={16} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-fg-main tracking-tight font-mono">$42,390</span>
                <span className="block text-[10px] text-emerald-500 font-semibold mt-1">
                  <TrendingUp size={12} className="inline mr-1 align-text-top" /> +14.2% MoM growth
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">New Registrations</span>
                <div className="p-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-fg-main tracking-tight font-sans">34</span>
                <span className="block text-[10px] text-fg-tertiary font-semibold mt-1">
                  Pending verification: 5
                </span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">Active Bookings</span>
                <div className="p-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                  <Car size={16} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-fg-main tracking-tight font-sans">1</span>
                <span className="block text-[10px] text-accent-primary font-semibold mt-1">
                  Tesla Model Y (Active)
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">Total Bookings</span>
                <div className="p-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                  <CalendarDays size={16} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-fg-main tracking-tight font-sans">8</span>
                <span className="block text-[10px] text-fg-tertiary font-semibold mt-1">
                  Joined since Jan 2026
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">Rewards Program</span>
                <div className="p-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                  <Award size={16} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-fg-main tracking-tight font-sans">2,450</span>
                <span className="block text-[10px] text-emerald-500 font-semibold mt-1">
                  Gold Tier Member Status
                </span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-secondary">Total Invested</span>
                <div className="p-2 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-primary">
                  <DollarSign size={16} />
                </div>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-fg-main tracking-tight font-mono">$1,840</span>
                <span className="block text-[10px] text-fg-tertiary font-semibold mt-1">
                  Average rental: $230
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-fg-main uppercase tracking-wider">
              {isAdmin ? 'System-Wide Revenue Growth' : 'Monthly Rental Usage'}
            </h3>
            <p className="text-xs text-fg-secondary mt-0.5">
              Visualizing performance trends across the workspace.
            </p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'var(--surface-card)', borderColor: 'var(--surface-border)', borderRadius: '12px', fontSize: '11px', color: 'var(--text-primary)' }} />
                <Area type="monotone" dataKey="revenue" stroke="var(--accent-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-fg-main uppercase tracking-wider mb-3">
              Quick Actions
            </h3>
            <div className="flex flex-col gap-2.5">
              {isAdmin ? (
                <>
                  <button className="btn-primary w-full text-xs h-11 min-h-0 rounded-xl cursor-pointer">Add New Vehicle</button>
                  <button className="btn-ghost w-full text-xs h-11 min-h-0 rounded-xl cursor-pointer">Generate Invoices</button>
                  <button className="btn-ghost w-full text-xs h-11 min-h-0 rounded-xl cursor-pointer">System Logs</button>
                </>
              ) : (
                <>
                  <button className="btn-primary w-full text-xs h-11 min-h-0 rounded-xl cursor-pointer">Browse Vehicles</button>
                  <button className="btn-ghost w-full text-xs h-11 min-h-0 rounded-xl cursor-pointer">View Loyalty Details</button>
                  <button className="btn-ghost w-full text-xs h-11 min-h-0 rounded-xl cursor-pointer">Contact Support</button>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border-surface/40 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-fg-tertiary block">System Health</span>
            <div className="flex items-center gap-2 text-xs text-fg-secondary">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>All backend API nodes functional</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-bg-card border border-border-surface/40 backdrop-blur-md">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-fg-main uppercase tracking-wider">
            {isAdmin ? 'Recent Operations Log' : 'My Rental History'}
          </h3>
          <p className="text-xs text-fg-secondary mt-0.5">
            A comprehensive grid compiled using TanStack Table.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id} className="border-b border-border-surface/60">
                  {headerGroup.headers.map(header => (
                    <th key={header.id} className="pb-3 font-bold uppercase tracking-wider text-fg-secondary">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-b border-border-surface/40 hover:bg-bg-inset/40 transition-all">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="py-3.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
