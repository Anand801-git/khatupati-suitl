'use client';

import { useKhatupatiStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { IndianRupee, Warehouse, Factory, Scissors, Package, Loader2, TrendingUp, AlertCircle, BarChart3 } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { getLotStats } from '@/lib/lot-utils';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Badge } from '@/components/ui/badge';

export default function CashFlowTracker() {
  const { purchases, allAssignments, calculateSuratMath, isLoaded } = useKhatupatiStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const flowData = useMemo(() => {
    if (!isLoaded) return null;

    const summary = {
      warehouse: 0,
      embroidery: 0,
      va: 0,
      finished: 0,
      grandTotal: 0
    };

    const lotBreakdown = purchases.map((purchase: any) => {
      const relatedAssignments = allAssignments.filter((a: any) => a.lotId === purchase.id);
      const costPerPiece = calculateSuratMath(purchase, relatedAssignments);
      const stats = getLotStats(purchase, relatedAssignments);

      const lotInvestments = {
        name: purchase.qualityName,
        id: purchase.id,
        Warehouse: stats.inWhse * costPerPiece,
        Embroidery: stats.atEmb * costPerPiece,
        VA: stats.atVA * costPerPiece,
        Finished: stats.finished * costPerPiece,
        total: stats.total * costPerPiece,
        costPerPiece,
        purchaseDate: purchase.purchaseDate
      };

      summary.warehouse += lotInvestments.Warehouse;
      summary.embroidery += lotInvestments.Embroidery;
      summary.va += lotInvestments.VA;
      summary.finished += lotInvestments.Finished;
      summary.grandTotal += lotInvestments.total;

      // Calculate "Stuck" status
      const activityDates = [
        parseISO(purchase.purchaseDate),
        ...relatedAssignments.map((a: any) => parseISO(a.sentDate)),
        ...relatedAssignments.filter((a: any) => a.receivedDate).map((a: any) => parseISO(a.receivedDate!))
      ];
      const latestActivity = new Date(Math.max(...activityDates.map((d: any) => d.getTime())));
      const daysStuck = differenceInDays(new Date(), latestActivity);
      const isStuck = daysStuck > 30 && stats.finished < stats.total;

      return { ...lotInvestments, daysStuck, isStuck, currentStage: purchase.state };
    });

    return { summary, lotBreakdown };
  }, [purchases, allAssignments, calculateSuratMath, isLoaded]);

  if (!mounted || !isLoaded || !flowData) return <div className="flex flex-col items-center justify-center min-h-screen gap-4"><Loader2 className="w-10 h-10 animate-spin text-primary" /><p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Calculating Capital...</p></div>;

  const chartConfig = {
    Warehouse: { label: "Warehouse", color: "#AD1457" },
    Embroidery: { label: "Embroidery", color: "#283593" },
    VA: { label: "VA Stage", color: "#00695C" },
    Finished: { label: "Finished", color: "#2E7D32" }
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <Header title="Capital Allocation" className="default-header" />
      
      <main className="container px-4 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="Warehouse" value={flowData.summary.warehouse} icon={<Warehouse className="w-4 h-4" />} color="bg-[#FFF0F5] text-[#AD1457] border-[#F8BBD9]" />
          <StatCard title="Embroidery" value={flowData.summary.embroidery} icon={<Factory className="w-4 h-4" />} color="bg-[#EEF2FF] text-[#283593] border-[#C5CAE9]" />
          <StatCard title="VA Stage" value={flowData.summary.va} icon={<Scissors className="w-4 h-4" />} color="bg-[#E8FDF5] text-[#00695C] border-[#B2DFDB]" />
          <StatCard title="Finished" value={flowData.summary.finished} icon={<Package className="w-4 h-4" />} color="bg-[#F1FBE8] text-[#2E7D32] border-[#DCEDC8]" />
          <Card className="bg-primary text-white border-none shadow-lg col-span-2 lg:col-span-1">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
              <TrendingUp className="w-5 h-5 mb-1 opacity-50" />
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Total Capital Locked</p>
              <p className="text-2xl font-black">₹{flowData.summary.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-0 px-6 pt-6">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Capital per Lot by Stage
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={flowData.lotBreakdown.slice(0, 10)}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.3} />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700 }}
                  interval={0}
                  tickFormatter={(val: any) => val.length > 10 ? `${val.substring(0, 8)}...` : val}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(val: any) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 20 }} />
                <Bar dataKey="Warehouse" stackId="a" fill={chartConfig.Warehouse.color} />
                <Bar dataKey="Embroidery" stackId="a" fill={chartConfig.Embroidery.color} />
                <Bar dataKey="VA" stackId="a" fill={chartConfig.VA.color} />
                <Bar dataKey="Finished" stackId="a" fill={chartConfig.Finished.color} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Investment Inventory</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-[10px] font-black uppercase">Lot Details</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Cost/Pc</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Total Inv.</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Days Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flowData.lotBreakdown.map((lot: any) => (
                  <TableRow 
                    key={lot.id} 
                    className={`group transition-colors ${lot.isStuck ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-muted/30'}`}
                  >
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm flex items-center gap-1.5">
                          {lot.name}
                          {lot.isStuck && <AlertCircle className="w-3 h-3 text-red-500 animate-pulse" />}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground uppercase">#{lot.id.substring(lot.id.length - 6)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <span className="text-xs font-bold text-muted-foreground">₹{lot.costPerPiece.toFixed(1)}</span>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <span className="text-sm font-black text-primary">₹{lot.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </TableCell>
                    <TableCell className="text-right py-4">
                      <Badge variant={lot.isStuck ? "destructive" : "secondary"} className="text-[10px] rounded-[20px] font-black">
                        {lot.daysStuck}d
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Card className={`border-2 ${color}`}>
      <CardContent className="p-3 flex flex-col items-center justify-center text-center gap-1">
        <div className="p-1.5 rounded-full bg-white/50">{icon}</div>
        <p className="text-[9px] font-black uppercase tracking-widest opacity-70">{title}</p>
        <p className="text-base font-black leading-none">₹{(value / 1000).toFixed(0)}k</p>
      </CardContent>
    </Card>
  );
}
