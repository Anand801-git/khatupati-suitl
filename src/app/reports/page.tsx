'use client';

import { useState, useMemo } from 'react';
import { useKhatupatiStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndianRupee, Search, Download, Loader2 } from 'lucide-react';
import { format, getMonth, getYear, parseISO } from 'date-fns';
import { generateCostReportPDF } from '@/lib/pdf-generator';

export default function ReportsPage() {
  const { purchases, allAssignments, calculateSuratMath, isLoaded } = useKhatupatiStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');

  const monthOptions = useMemo(() => {
    const options = new Set<string>();
    purchases.forEach(p => {
        const date = parseISO(p.purchaseDate);
        options.add(`${getYear(date)}-${getMonth(date)}`);
    });
    return Array.from(options).map(o => ({
        value: o,
        label: format(new Date(parseInt(o.split('-')[0]), parseInt(o.split('-')[1])), 'MMMM yyyy')
    })).sort((a,b) => b.value.localeCompare(a.value));
  }, [purchases]);

  const reportData = useMemo(() => {
    return purchases
      .filter(p => {
        const matchesSearch = p.qualityName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMonth = monthFilter === 'all' || `${getYear(parseISO(p.purchaseDate))}-${getMonth(parseISO(p.purchaseDate))}` === monthFilter;
        return matchesSearch && matchesMonth;
      })
      .map(p => {
        const assignments = allAssignments.filter(a => a.lotId === p.id);
        const fabricCost = (p.kurta.ratePerMeter * p.kurta.metersPerPiece) + 
                          (p.salwar.ratePerMeter * p.salwar.metersPerPiece) + 
                          (p.dupatta.ratePerMeter * p.dupatta.metersPerPiece) + 
                          (p.dupatta.dyingCharges || 0) + 
                          ((p.lace.ratePerMeter * p.lace.metersPerPiece) / (p.piecesCount || 1));
        
        const totalCost = calculateSuratMath(p, assignments);
        const processingCost = totalCost - fabricCost;
        const totalInvestment = totalCost * p.piecesCount;
        return {
          ...p,
          fabricCost,
          processingCost,
          totalCost,
          totalInvestment
        };
      })
      .sort((a, b) => b.totalInvestment - a.totalInvestment);
  }, [purchases, allAssignments, searchTerm, monthFilter, calculateSuratMath]);

  const grandTotal = useMemo(() => {
    return reportData.reduce((acc, lot) => {
        acc.pieces += lot.piecesCount;
        acc.investment += lot.totalInvestment;
        return acc;
    }, { pieces: 0, investment: 0 });
  }, [reportData]);

  if (!isLoaded) return <div className="flex flex-col items-center justify-center min-h-screen gap-4"><Loader2 className="w-10 h-10 animate-spin text-primary" /><p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Loading Report...</p></div>;

  const handleDownload = () => {
    generateCostReportPDF(reportData);
  };

  return (
    <div className="pb-24">
        <Header title="Costing Report" className="default-header" />
        <main className="container px-4 mt-8 space-y-6">
            <Card>
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <CardTitle>Lot Analysis</CardTitle>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-48">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search quality..." className="pl-10 h-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <Select value={monthFilter} onValueChange={setMonthFilter}>
                            <SelectTrigger className="w-full md:w-48 h-10">
                                <SelectValue placeholder="Filter month" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Months</SelectItem>
                                {monthOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button variant="outline" className="h-10 gap-2" onClick={handleDownload}>
                            <Download className="w-4 h-4" /> Export PDF
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Lot ID</TableHead>
                                    <TableHead>Quality Name</TableHead>
                                    <TableHead className="text-right">Pieces</TableHead>
                                    <TableHead className="text-right">Fabric/Pc</TableHead>
                                    <TableHead className="text-right">Proc/Pc</TableHead>
                                    <TableHead className="text-right">Total/Pc</TableHead>
                                    <TableHead className="text-right">Total Inv.</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportData.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No data found for selected filters.</TableCell>
                                    </TableRow>
                                ) : reportData.map(lot => (
                                    <TableRow key={lot.id}>
                                        <TableCell className="font-mono text-[10px] uppercase">#{lot.id.substr(-6)}</TableCell>
                                        <TableCell className="font-bold text-sm">{lot.qualityName}</TableCell>
                                        <TableCell className="text-right text-xs">{lot.piecesCount}</TableCell>
                                        <TableCell className="text-right text-xs">₹{lot.fabricCost.toFixed(1)}</TableCell>
                                        <TableCell className="text-right text-xs">₹{lot.processingCost.toFixed(1)}</TableCell>
                                        <TableCell className="text-right font-bold text-sm">₹{lot.totalCost.toFixed(1)}</TableCell>
                                        <TableCell className="text-right font-black text-primary text-sm">{lot.totalInvestment.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow className="font-bold bg-muted/50">
                                    <TableCell colSpan={2}>Grand Total</TableCell>
                                    <TableCell className="text-right">{grandTotal.pieces}</TableCell>
                                    <TableCell colSpan={3}></TableCell>
                                    <TableCell className="text-right text-primary text-base">{grandTotal.investment.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </main>
    </div>
  );
}
