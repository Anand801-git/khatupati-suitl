'use client';

import { useKhatupatiStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Warehouse, 
  Factory, 
  Scissors, 
  Package, 
  ArrowLeft, 
  AlertCircle, 
  Activity,
  Timer,
  User
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { getLotStats } from '@/lib/lot-utils';

export default function ProductionMap() {
  const { purchases, allAssignments, directory, isLoaded } = useKhatupatiStore();
  const [now, setNow] = useState(new Date());

  // Auto-refresh clock for delay calculations every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const mapData = useMemo(() => {
    if (!isLoaded) return null;

    const activeAssignments = allAssignments.filter(a => !a.receivedDate);
    
    // 1. Calculate Node Data
    const vendors = directory.filter(e => e.category === 'Vendor');
    const embVendors = vendors.filter(v => v.subCategory === 'Embroidery');
    const vaVendors = vendors.filter(v => v.subCategory === 'Value Addition');

    const getVendorStats = (vendorName: string) => {
      const jobs = activeAssignments.filter(a => a.vendorName === vendorName);
      const totalPieces = jobs.reduce((sum, j) => sum + Math.max(...j.components.map(c => c.quantity)), 0);
      
      let status: 'green' | 'amber' | 'red' = 'green';
      let maxDays = 0;

      if (jobs.length > 0) {
        maxDays = Math.max(...jobs.map(j => differenceInDays(now, parseISO(j.sentDate))));
        if (maxDays > 15) status = 'red';
        else if (maxDays > 10) status = 'amber';
      }

      return { totalPieces, status, maxDays, jobCount: jobs.length };
    };

    const warehousePieces = purchases.reduce((sum, p) => {
      const stats = getLotStats(p, allAssignments.filter(a => a.lotId === p.id));
      return sum + stats.inWhse;
    }, 0);

    const finishedPieces = purchases.reduce((sum, p) => {
      const stats = getLotStats(p, allAssignments.filter(a => a.lotId === p.id));
      return sum + stats.finished;
    }, 0);

    // 2. Sidebar Stats
    const piecesInMotion = activeAssignments.reduce((sum, j) => sum + Math.max(...j.components.map(c => c.quantity)), 0);
    
    const vendorPerformance = vendors.map(v => ({ name: v.name, ...getVendorStats(v.name) }));
    const busiestVendor = [...vendorPerformance].sort((a, b) => b.totalPieces - a.totalPieces)[0];
    const mostDelayedJob = [...activeAssignments]
      .sort((a, b) => differenceInDays(now, parseISO(b.sentDate)) - differenceInDays(now, parseISO(a.sentDate)))[0];

    const finishingThisWeek = activeAssignments.filter(a => {
      const days = differenceInDays(now, parseISO(a.sentDate));
      return a.processType === 'Value Addition' && days >= 10;
    }).reduce((sum, j) => sum + Math.max(...j.components.map(c => c.quantity)), 0);

    return {
      warehousePieces,
      finishedPieces,
      embVendors: embVendors.map(v => ({ ...v, stats: getVendorStats(v.name) })),
      vaVendors: vaVendors.map(v => ({ ...v, stats: getVendorStats(v.name) })),
      piecesInMotion,
      busiestVendor,
      mostDelayedJob,
      finishingThisWeek
    };
  }, [purchases, allAssignments, directory, isLoaded, now]);

  if (!isLoaded || !mapData) return null;

  // Map Constants
  const width = 800;
  const height = 600;
  const centerX = width / 2;
  const centerY = height / 2.5;
  const embRadius = 140;
  const vaRadius = 260;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white pb-20">
      <Header title="Production Digital Twin" className="border-b border-white/10" />
      
      <main className="flex-1 flex flex-col lg:flex-row p-4 gap-4">
        {/* Sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          <Link href="/">
            <Button variant="ghost" className="text-white/60 hover:text-white mb-2"><ArrowLeft className="w-4 h-4 mr-2" /> Dashboard</Button>
          </Link>
          
          <Card className="bg-slate-900 border-white/10 text-white">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-black uppercase tracking-widest text-white/50">Floor Metrics</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <MetricItem label="Pieces in Motion" value={mapData.piecesInMotion} icon={<Activity className="w-4 h-4 text-blue-400" />} />
              <MetricItem label="Finishing Soon" value={mapData.finishingThisWeek} icon={<Timer className="w-4 h-4 text-green-400" />} />
              
              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] font-black uppercase text-white/30 mb-2">Busiest Artisan</p>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20"><User className="w-4 h-4 text-blue-400" /></div>
                  <div>
                    <p className="text-sm font-bold">{mapData.busiestVendor?.name || 'N/A'}</p>
                    <p className="text-[10px] text-white/50">{mapData.busiestVendor?.totalPieces || 0} units active</p>
                  </div>
                </div>
              </div>

              {mapData.mostDelayedJob && (
                <div className="pt-4 border-t border-white/5">
                  <p className="text-[10px] font-black uppercase text-red-400/50 mb-2">Critical Delay</p>
                  <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                    <p className="text-xs font-bold text-red-400">{mapData.mostDelayedJob.vendorName}</p>
                    <p className="text-[10px] text-white/60 mt-1">{differenceInDays(now, parseISO(mapData.mostDelayedJob.sentDate))} days since dispatch</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Map Visualization */}
        <Card className="flex-1 bg-slate-900 border-white/10 relative overflow-hidden flex items-center justify-center p-0">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full max-h-[70vh]">
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                <path d="M0,0 L0,10 L10,5 Z" fill="rgba(255,255,255,0.2)" />
              </marker>
            </defs>

            {/* Stage Rings */}
            <circle cx={centerX} cy={centerY} r={embRadius} fill="none" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="1" strokeDasharray="5,5" />
            <circle cx={centerX} cy={centerY} r={vaRadius} fill="none" stroke="rgba(34, 197, 94, 0.1)" strokeWidth="1" strokeDasharray="5,5" />

            {/* Connections & Flows */}
            {/* Warehouse to Embroidery */}
            {mapData.embVendors.map((v, i) => {
              const angle = (i / mapData.embVendors.length) * 2 * Math.PI - Math.PI / 2;
              const x = centerX + embRadius * Math.cos(angle);
              const y = centerY + embRadius * Math.sin(angle);
              return (
                <g key={`flow-emb-${v.id}`}>
                  <line x1={centerX} y1={centerY} x2={x} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  {v.stats.totalPieces > 0 && (
                    <text x={(centerX + x) / 2} y={(centerY + y) / 2} textAnchor="middle" fill="#60a5fa" fontSize="10" fontWeight="bold" dy="-5">
                      {v.stats.totalPieces}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Warehouse to VA directly */}
            {mapData.vaVendors.map((v, i) => {
              const angle = (i / mapData.vaVendors.length) * 2 * Math.PI - Math.PI / 2;
              const x = centerX + vaRadius * Math.cos(angle);
              const y = centerY + vaRadius * Math.sin(angle);
              return (
                <g key={`flow-va-${v.id}`}>
                  <line x1={centerX} y1={centerY} x2={x} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                </g>
              );
            })}

            {/* Final Flow to Stock */}
            <line x1={centerX} y1={centerY + vaRadius} x2={centerX} y2={height - 80} stroke="rgba(34, 197, 94, 0.2)" strokeWidth="2" strokeDasharray="4,2" />

            {/* Warehouse Node */}
            <g transform={`translate(${centerX}, ${centerY})`}>
              <circle r="45" fill="#1e293b" stroke="#334155" strokeWidth="2" />
              <circle r="38" fill="#1e1b4b" className="animate-pulse" opacity="0.5" />
              <foreignObject x="-20" y="-20" width="40" height="40">
                <div className="flex items-center justify-center w-full h-full"><Warehouse className="text-white w-6 h-6" /></div>
              </foreignObject>
              <text y="60" textAnchor="middle" fill="white" fontSize="12" fontWeight="black" className="uppercase tracking-tighter">Warehouse</text>
              <text y="75" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontWeight="bold">{mapData.warehousePieces} Units</text>
            </g>

            {/* Embroidery Vendor Nodes */}
            {mapData.embVendors.map((v, i) => {
              const angle = (i / mapData.embVendors.length) * 2 * Math.PI - Math.PI / 2;
              const x = centerX + embRadius * Math.cos(angle);
              const y = centerY + embRadius * Math.sin(angle);
              const nodeSize = 25 + Math.min(v.stats.totalPieces / 10, 20);
              const color = v.stats.status === 'red' ? '#ef4444' : v.stats.status === 'amber' ? '#f59e0b' : '#3b82f6';
              
              return (
                <g key={v.id} transform={`translate(${x}, ${y})`}>
                  <circle r={nodeSize} fill="#0f172a" stroke={color} strokeWidth="2" />
                  <foreignObject x="-10" y="-10" width="20" height="20">
                    <div className="flex items-center justify-center w-full h-full"><Factory style={{color}} className="w-4 h-4" /></div>
                  </foreignObject>
                  <text y={nodeSize + 15} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">{v.name}</text>
                  <text y={nodeSize + 26} textAnchor="middle" fill={color} fontSize="8" fontWeight="black">{v.stats.totalPieces} Pcs</text>
                </g>
              );
            })}

            {/* VA Vendor Nodes */}
            {mapData.vaVendors.map((v, i) => {
              const angle = (i / mapData.vaVendors.length) * 2 * Math.PI - Math.PI / 2;
              const x = centerX + vaRadius * Math.cos(angle);
              const y = centerY + vaRadius * Math.sin(angle);
              const nodeSize = 25 + Math.min(v.stats.totalPieces / 10, 20);
              const color = v.stats.status === 'red' ? '#ef4444' : v.stats.status === 'amber' ? '#f59e0b' : '#22c55e';
              
              return (
                <g key={v.id} transform={`translate(${x}, ${y})`}>
                  <circle r={nodeSize} fill="#0f172a" stroke={color} strokeWidth="2" />
                  <foreignObject x="-10" y="-10" width="20" height="20">
                    <div className="flex items-center justify-center w-full h-full"><Scissors style={{color}} className="w-4 h-4" /></div>
                  </foreignObject>
                  <text y={nodeSize + 15} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">{v.name}</text>
                  <text y={nodeSize + 26} textAnchor="middle" fill={color} fontSize="8" fontWeight="black">{v.stats.totalPieces} Pcs</text>
                </g>
              );
            })}

            {/* Finished Stock Node */}
            <g transform={`translate(${centerX}, ${height - 80})`}>
              <rect x="-60" y="-25" width="120" height="50" rx="25" fill="#064e3b" stroke="#059669" strokeWidth="2" />
              <foreignObject x="-12" y="-12" width="24" height="24">
                <div className="flex items-center justify-center w-full h-full"><Package className="text-white w-5 h-5" /></div>
              </foreignObject>
              <text y="40" textAnchor="middle" fill="white" fontSize="12" fontWeight="black" className="uppercase tracking-tighter">Finished Stock</text>
              <text y="55" textAnchor="middle" fill="#059669" fontSize="10" fontWeight="bold">{mapData.finishedPieces} Ready</text>
            </g>
          </svg>

          {/* Legend Overlay */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-2 p-3 bg-slate-950/80 backdrop-blur rounded-xl border border-white/10">
            <LegendItem color="bg-blue-500" label="Embroidery" />
            <LegendItem color="bg-green-500" label="VA Stage" />
            <div className="h-px bg-white/10 my-1" />
            <LegendItem color="bg-red-500" label="Delayed (>15d)" />
            <LegendItem color="bg-amber-500" label="Attention (>10d)" />
          </div>
        </Card>
      </main>
    </div>
  );
}

function MetricItem({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/5 transition-colors group-hover:bg-white/10">{icon}</div>
        <p className="text-sm font-medium text-white/60">{label}</p>
      </div>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-[10px] font-bold text-white/50 uppercase tracking-tight">{label}</span>
    </div>
  );
}
