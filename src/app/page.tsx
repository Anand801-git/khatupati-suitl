
'use client';

import { useKhatupatiStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Factory, Scissors, Package, Warehouse, History, Loader2, Sparkles, AlertCircle, IndianRupee, BarChart3, Map, LayoutList, ArrowRight, TrendingUp, Target } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, useEffect, ReactNode } from 'react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { useRouter } from 'next/navigation';
import { getLotStats, getDelayedJobs } from '@/lib/lot-utils';
import PWAInstallButton from '@/components/PWAInstallButton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Dashboard() {
  const router = useRouter();
  const { purchases, allAssignments, isLoaded } = useKhatupatiStore();
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState('Good morning');
  const [selectedMonth, setSelectedMonth] = useState('All Time');
  const [briefingAlerts, setBriefingAlerts] = useState(0);

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) setGreeting('Good afternoon');
    else if (hour >= 17) setGreeting('Good evening');

    const savedAlerts = localStorage.getItem('briefingAlertCount');
    if (savedAlerts) setBriefingAlerts(parseInt(savedAlerts) || 0);
  }, []);

  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    purchases.forEach(p => {
      months.add(format(parseISO(p.purchaseDate), 'yyyy-MM'));
    });
    const sortedMonths = Array.from(months).sort((a, b) => b.localeCompare(a));
    return ['All Time', ...sortedMonths];
  }, [purchases]);

  const { filteredPurchases, filteredAssignments } = useMemo(() => {
    if (selectedMonth === 'All Time') {
      return { filteredPurchases: purchases, filteredAssignments: allAssignments };
    }
    const selectedDate = parseISO(`${selectedMonth}-01`);
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);

    const _filteredPurchases = purchases.filter(p => {
      const purchaseDate = parseISO(p.purchaseDate);
      return purchaseDate >= monthStart && purchaseDate <= monthEnd;
    });

    const filteredLotIds = new Set(_filteredPurchases.map(p => p.id));
    const _filteredAssignments = allAssignments.filter(a => a.lotId && filteredLotIds.has(a.lotId));
    
    return { filteredPurchases: _filteredPurchases, filteredAssignments: _filteredAssignments };
  }, [purchases, allAssignments, selectedMonth]);

  const stats = useMemo(() => {
    const global = filteredPurchases.reduce((acc, p) => {
      const lotStats = getLotStats(p, filteredAssignments.filter(a => a.lotId === p.id));
      return { 
        whse: acc.whse + lotStats.inWhse, 
        emb: acc.emb + lotStats.atEmb, 
        va: acc.va + lotStats.atVA, 
        fin: acc.fin + lotStats.finished 
      };
    }, { whse: 0, emb: 0, va: 0, fin: 0 });

    const finishingSoon = filteredAssignments.filter(a => 
      a.processType === 'Value Addition' && !a.receivedDate && a.isFinalStep !== false
    ).reduce((sum, a) => sum + Math.max(...a.components.map(c => c.quantity)), 0);

    return { ...global, finishingSoon };
  }, [filteredPurchases, filteredAssignments]);

  if (!mounted || !isLoaded) return <div className="flex flex-col items-center justify-center min-h-screen gap-4"><Loader2 className="w-10 h-10 animate-spin text-primary" /><p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Connecting...</p></div>;

  return (
    <div className="flex flex-col gap-6 pb-24">
      <Header 
        title="Khatupati Suits" 
        className="dashboard-header" 
        greeting={greeting}
        subtitle={
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"> {stats.whse + stats.emb + stats.va + stats.fin} units active</span>
            <span className="opacity-30">|</span>
            <span>{stats.finishingSoon} units finishing soon</span>
          </div>
        }
      />
      
      <main className="container px-4 flex flex-col gap-8">
        <div className="flex justify-end">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px] bg-card border-primary/10 shadow-sm">
                    <SelectValue placeholder="Select Month" />
                </SelectTrigger>
                <SelectContent>
                    {monthOptions.map(month => (
                        <SelectItem key={month} value={month}>
                            {month === 'All Time' ? 'All Time' : format(parseISO(`${month}-01`), 'MMMM yyyy')}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>

        <PWAInstallButton />

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/briefing" className="w-full">
            <Button variant="outline" className="w-full h-16 bg-white border-2 border-primary/10 hover:border-primary/30 flex justify-between px-6 rounded-2xl relative text-left">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-secondary animate-pulse" />
                <div className="text-left">
                  <p className="text-sm font-black uppercase text-primary tracking-tight">AI Production Briefing</p>
                  <p className="text-[10px] text-muted-foreground font-bold">Autonomous analysis</p>
                </div>
              </div>
              {briefingAlerts > 0 && (
                <Badge className="bg-red-500 text-white border-none rounded-full px-2 py-0.5 text-[10px] animate-bounce">
                  {briefingAlerts} Urgent
                </Badge>
              )}
              <ArrowRight className="w-4 h-4 opacity-30" />
            </Button>
          </Link>
          <Link href="/trends" className="w-full">
            <Button variant="outline" className="w-full h-16 bg-white border-2 border-purple-100 hover:border-purple-300 flex justify-between px-6 rounded-2xl text-left">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <div className="text-left">
                  <p className="text-sm font-black uppercase text-purple-900 tracking-tight">Market Trend Analyser</p>
                  <p className="text-[10px] text-muted-foreground font-bold">What's hot in Surat?</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 opacity-30 text-purple-900" />
            </Button>
          </Link>
        </section>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Warehouse" count={stats.whse} icon={<Warehouse className="w-4 h-4" />} href="/purchases" styles={{ bg: 'bg-[#FFF0F5]', border: 'border-[#F8BBD9]', text: 'text-[#AD1457]' }} />
          <StatCard title="Embroidery" count={stats.emb} icon={<Factory className="w-4 h-4" />} href="/jobs/embroidery" styles={{ bg: 'bg-[#EEF2FF]', border: 'border-[#C5CAE9]', text: 'text-[#283593]' }} />
          <StatCard title="VA Stage" count={stats.va} icon={<Scissors className="w-4 h-4" />} href="/jobs/va" styles={{ bg: 'bg-[#E8FDF5]', border: 'border-[#B2DFDB]', text: 'text-[#00695C]' }} />
          <StatCard title="Finished" count={stats.fin} icon={<Package className="w-4 h-4" />} href="/purchases" styles={{ bg: 'bg-[#F1FBE8]', border: 'border-[#DCEDC8]', text: 'text-[#2E7D32]' }} />
        </div>

        <section className="flex flex-col gap-4">
          <Link href="/lots/new" className="w-full">
            <Button className="w-full h-[52px] text-lg font-bold rounded-[14px] bg-[linear-gradient(90deg,#AD1457,#E91E63)] shadow-lg hover:shadow-xl transition-all relative overflow-hidden group">
              <Plus className="w-6 h-6 mr-2" /> 
              <span>New Entry</span>
              <Badge className="absolute top-2 right-2 bg-white/20 text-white border-none text-[8px] uppercase tracking-tighter">AI Active</Badge>
            </Button>
          </Link>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <Link href="/jobs/embroidery"><Button variant="outline" className="w-full h-20 flex flex-col gap-1 border-primary/10 bg-card hover:bg-primary/5 rounded-xl"><Factory className="w-5 h-5 text-[#283593]" /><span className="text-[9px] font-bold uppercase text-muted-foreground">Emb</span></Button></Link>
            <Link href="/jobs/va"><Button variant="outline" className="w-full h-20 flex flex-col gap-1 border-primary/10 bg-card hover:bg-primary/5 rounded-xl"><Scissors className="w-5 h-5 text-[#00695C]" /><span className="text-[9px] font-bold uppercase text-muted-foreground">VA</span></Button></Link>
            <Link href="/production-map"><Button variant="outline" className="w-full h-20 flex flex-col gap-1 border-primary/10 bg-card hover:bg-primary/5 rounded-xl bg-blue-50/50"><Map className="w-5 h-5 text-blue-600 animate-pulse" /><span className="text-[9px] font-bold uppercase text-blue-600">Map</span></Button></Link>
            <Link href="/forecast"><Button variant="outline" className="w-full h-20 flex flex-col gap-1 border-primary/10 bg-card hover:bg-primary/5 rounded-xl bg-green-50/50"><Target className="w-5 h-5 text-green-600" /><span className="text-[9px] font-bold uppercase text-green-600">Forecast</span></Button></Link>
            <Link href="/cashflow"><Button variant="outline" className="w-full h-20 flex flex-col gap-1 border-primary/10 bg-card hover:bg-primary/5 rounded-xl"><BarChart3 className="w-5 h-5 text-primary" /><span className="text-[9px] font-bold uppercase text-muted-foreground">Cash</span></Button></Link>
            <Link href="/purchases"><Button variant="outline" className="w-full h-20 flex flex-col gap-1 border-primary/10 bg-card hover:bg-primary/5 rounded-xl"><History className="w-5 h-5 text-muted-foreground" /><span className="text-[9px] font-bold uppercase text-muted-foreground">Lots</span></Button></Link>
          </div>
        </section>

        <section>
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="pb-2 px-4">
              <CardTitle className="text-sm font-headline font-black uppercase tracking-widest text-muted-foreground">
                {selectedMonth === 'All Time' ? 'Recent Activity' : `Activity for ${format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy')}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  {filteredPurchases.slice(0, 8).map((p, index) => {
                    const lStats = getLotStats(p, filteredAssignments.filter(a => a.lotId === p.id));
                    return (
                      <TableRow 
                        key={p.id} 
                        className="cursor-pointer hover:bg-muted/30 transition-all"
                        onClick={() => router.push(`/purchases/${p.id}`)}
                      >
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-mono text-muted-foreground">#{p.id.substr(-4).toUpperCase()}</span>
                            <span className="font-bold text-sm truncate max-w-[120px]">{p.qualityName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <div className="flex flex-wrap justify-end gap-1">
                            {lStats.inWhse > 0 && <span className="text-[9px] bg-[#FFF0F5] text-[#AD1457] px-2 py-0.5 rounded-[20px] font-black uppercase">{lStats.inWhse} WH</span>}
                            {lStats.atEmb > 0 && <span className="text-[9px] bg-[#EEF2FF] text-[#283593] px-2 py-0.5 rounded-[20px] font-black uppercase">{lStats.atEmb} EMB</span>}
                            {lStats.atVA > 0 && <span className="text-[9px] bg-[#E8FDF5] text-[#00695C] px-2 py-0.5 rounded-[20px] font-black uppercase">{lStats.atVA} VA</span>}
                            {lStats.finished > 0 && <span className="text-[9px] bg-[#F1FBE8] text-[#2E7D32] px-2 py-0.5 rounded-[20px] font-black uppercase">{lStats.finished} FIN</span>}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

interface StatCardProps {
  title: string;
  count: number;
  icon: ReactNode;
  href?: string;
  styles: {
    bg: string;
    border: string;
    text: string;
  };
  style?: React.CSSProperties;
}

function StatCard({ title, count, icon, href, styles, style }: StatCardProps) {
  const displayCount = isNaN(count) ? 0 : count;
  const content = (
    <Card 
      className={`h-full border-2 ${styles.border} ${styles.bg} transition-all cursor-pointer hover:scale-[1.05] hover:shadow-md`}
      style={style}
    >
      <CardContent className="p-4 flex flex-col items-center justify-center gap-1 text-center">
        <div className={`p-1.5 rounded-full bg-white/50 ${styles.text}`}>{icon}</div>
        <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tighter">{title}</p>
        <p className={`text-[28px] font-extrabold leading-none ${styles.text}`}>{displayCount}</p>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
