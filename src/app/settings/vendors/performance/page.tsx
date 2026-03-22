'use client';

import { useMemo } from 'react';
import { useKhatupatiStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Award, Clock, Package, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { differenceInDays, parseISO } from 'date-fns';

export default function VendorPerformance() {
  const { allAssignments, directory, isLoaded } = useKhatupatiStore();

  const performanceData = useMemo(() => {
    const vendorEntries = directory.filter(e => e.category === 'Vendor');
    
    const stats = vendorEntries.map(vendor => {
      const vendorJobs = allAssignments.filter(a => 
        a.vendorName === vendor.name && a.receivedDate
      );
      
      if (vendorJobs.length === 0) return null;

      let totalDays = 0;
      let totalPieces = 0;
      let totalRate = 0;
      let onTimeJobs = 0;
      let fastest = Infinity;
      let slowest = -Infinity;

      vendorJobs.forEach(job => {
        const days = differenceInDays(parseISO(job.receivedDate!), parseISO(job.sentDate));
        totalDays += days;
        fastest = Math.min(fastest, days);
        slowest = Math.max(slowest, days);
        
        const qty = job.receivedQty || Math.max(...job.components.map(c => c.quantity), 0);
        totalPieces += qty;
        totalRate += job.rate;

        if (days <= 15) onTimeJobs++;
      });

      const avgTurnaround = totalDays / vendorJobs.length;
      const onTimeRate = (onTimeJobs / vendorJobs.length) * 100;
      const avgRate = totalRate / vendorJobs.length;

      return {
        id: vendor.id,
        name: vendor.name,
        type: vendor.subCategory,
        totalJobs: vendorJobs.length,
        totalPieces,
        avgTurnaround,
        fastest,
        slowest,
        avgRate,
        onTimeRate
      };
    });

    return stats
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .sort((a, b) => b.onTimeRate - a.onTimeRate);
  }, [allAssignments, directory]);

  if (!isLoaded) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-sm font-bold text-muted-foreground animate-pulse uppercase tracking-widest">Calculating Metrics...</p>
    </div>
  );

  return (
    <div className="pb-20">
      <Header title="Vendor Scorecard" className="default-header" />
      <main className="container px-4 mt-8 space-y-6">
        <div className="flex justify-between items-center">
          <Link href="/settings/vendors">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Directory
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-green-50/50 border-green-100">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-2 bg-green-100 rounded-lg text-green-700"><Award className="w-5 h-5" /></div>
                    <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground leading-none mb-1">Top Performer</p>
                        <p className="text-sm font-black truncate max-w-[150px]">{performanceData[0]?.name || 'N/A'}</p>
                    </div>
                </CardContent>
            </Card>
            <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-700"><Clock className="w-5 h-5" /></div>
                    <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground leading-none mb-1">Avg Turnaround</p>
                        <p className="text-sm font-black">
                            {performanceData.length > 0 
                              ? (performanceData.reduce((acc, curr) => acc + curr.avgTurnaround, 0) / performanceData.length).toFixed(1) 
                              : '0'} days
                        </p>
                    </div>
                </CardContent>
            </Card>
            <Card className="bg-purple-50/50 border-purple-100">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="p-2 bg-purple-100 rounded-lg text-purple-700"><Package className="w-5 h-5" /></div>
                    <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground leading-none mb-1">Pieces Processed</p>
                        <p className="text-sm font-black">
                            {performanceData.reduce((acc, curr) => acc + curr.totalPieces, 0).toLocaleString()}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>

        <Card className="border-none shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Reliability Ranking
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead className="font-bold uppercase text-[10px]">Vendor</TableHead>
                    <TableHead className="text-right font-bold uppercase text-[10px]">Jobs</TableHead>
                    <TableHead className="text-right font-bold uppercase text-[10px]">Pieces</TableHead>
                    <TableHead className="text-right font-bold uppercase text-[10px]">Avg Days</TableHead>
                    <TableHead className="text-right font-bold uppercase text-[10px]">Fast/Slow</TableHead>
                    <TableHead className="text-right font-bold uppercase text-[10px]">Avg Rate</TableHead>
                    <TableHead className="text-right font-bold uppercase text-[10px]">On-Time %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performanceData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20 text-muted-foreground font-bold">
                        No completed jobs found to calculate performance.
                      </TableCell>
                    </TableRow>
                  ) : (
                    performanceData.map((v) => (
                      <TableRow key={v.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{v.name}</span>
                            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">{v.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{v.totalJobs}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{v.totalPieces.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-bold">{v.avgTurnaround.toFixed(1)}</TableCell>
                        <TableCell className="text-right text-[10px] font-mono tabular-nums">
                            <span className="text-green-600 font-bold">{v.fastest}d</span> / <span className="text-red-600 font-bold">{v.slowest}d</span>
                        </TableCell>
                        <TableCell className="text-right font-bold">₹{v.avgRate.toFixed(0)}</TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={v.onTimeRate >= 80 ? 'default' : v.onTimeRate < 50 ? 'destructive' : 'secondary'}
                            className={v.onTimeRate >= 80 ? 'bg-green-600 border-none' : ''}
                          >
                            {v.onTimeRate.toFixed(0)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
