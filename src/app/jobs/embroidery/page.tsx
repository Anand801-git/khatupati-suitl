'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useKhatupatiStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, AlertCircle, Clock, Check, Loader2, Share2, Printer } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { generateChallanPDF } from '@/lib/pdf-generator';

export default function EmbroideryPage() {
  const { allAssignments, updateAssignment, vendors, addVendor, isLoaded, purchases } = useKhatupatiStore();
  const [vendorFilter, setVendorFilter] = useState('all');

  const { pending, inProgress, completed, vendorStockSummary, totalAtVendors } = useMemo(() => {
    const embAssignments = allAssignments.filter((a: any) => a.processType === 'Embroidery');
    const pending = embAssignments.filter((a: any) => !a.vendorId);
    const inProgress = embAssignments.filter((a: any) => a.vendorId && !a.receivedDate);
    const completed = embAssignments.filter((a: any) => a.receivedDate);

    const vendorStockSummary = inProgress.reduce((acc: any, a: any) => {
      const vendorName = vendors.find((v: any) => v.id === a.vendorId)?.name || 'Unknown Vendor';
      const jobQuantity = Math.max(0, ...a.components.map((c: any) => c.quantity));
      acc[vendorName] = (acc[vendorName] || 0) + jobQuantity;
      return acc;
    }, {} as { [key: string]: number });

    const totalAtVendors = (Object.values(vendorStockSummary) as number[]).reduce((sum: number, count: number) => sum + count, 0);

    return { pending, inProgress, completed, vendorStockSummary, totalAtVendors };
  }, [allAssignments, vendors]);

  const filteredInProgress = useMemo(() => {
    if (vendorFilter === 'all') return inProgress;
    return inProgress.filter((a: any) => vendors.find((v: any) => v.id === a.vendorId)?.name === vendorFilter);
  }, [inProgress, vendorFilter, vendors]);

  if (!isLoaded) return <div className="flex flex-col items-center justify-center min-h-screen gap-4"><Loader2 className="w-10 h-10 animate-spin text-primary" /><p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Connecting...</p></div>;

  return (
    <div className="pb-24">
      <Header title="Embroidery Jobs" className="embroidery-header" />

      <main className="container px-4 mt-8 flex flex-col gap-6">
        <div className="bg-white/70 backdrop-blur-sm sticky top-24 z-10 py-4 -mt-4">
            <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
                <Card 
                  className={`min-w-[120px] cursor-pointer border-2 ${vendorFilter === 'all' ? 'border-[#00897B] bg-[#E8FDF5]' : 'bg-white border-[#F0EAF8]'} clickable-card`}
                  onClick={() => setVendorFilter('all')}
                  style={{ animation: `fade-up 0.4s ease-out 0ms both` }}
                >
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Units</p>
                    <p className="text-xl font-bold">{totalAtVendors}</p>
                  </CardContent>
                </Card>
                {(Object.entries(vendorStockSummary) as [string, number][]).map(([vendor, count]: [string, number], index) => (
                  <Card 
                    key={vendor} 
                    className={`min-w-[120px] cursor-pointer border-2 ${vendorFilter === vendor ? 'border-[#00897B] bg-[#E8FDF5]' : 'bg-white border-[#F0EAF8]'} clickable-card`}
                    onClick={() => setVendorFilter(vendor)}
                    style={{ animation: `fade-up 0.4s ease-out ${(index + 1) * 50}ms both` }}
                  >
                    <CardContent className="p-3 text-center">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground truncate">{vendor}</p>
                      <p className="text-xl font-bold">{count}</p>
                    </CardContent>
                  </Card>
                ))}
            </div>
        </div>
        
        <Tabs defaultValue="in-progress" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-[#E8FDF5]">
            <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:text-[#00695C]">Pending</TabsTrigger>
            <TabsTrigger value="in-progress" className="data-[state=active]:bg-white data-[state=active]:text-[#00695C]">In Progress</TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-white data-[state=active]:text-[#00695C]">Completed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending">
             {/* ... Pending content ... */}
          </TabsContent>

          <TabsContent value="in-progress" className="mt-4 space-y-4">
            {filteredInProgress.length === 0 ? (
              <div className="text-center py-20 flex flex-col items-center gap-4 text-muted-foreground">
                <CheckCircle className="w-10 h-10" />
                <p className="font-bold">All clear!</p>
                <p className="text-sm -mt-2">No lots currently at embroidery.</p>
              </div>
            ) : filteredInProgress.map((p: any, index: number) => {
                const purchase = purchases.find((purchase: any) => purchase.id === p.lotId)
                if(!purchase) return null;
                return <EmbroideryCard key={p.id} assignment={p} purchase={purchase} style={{ animation: `fade-up 0.4s ease-out ${index * 50}ms both` }} />
            })}
          </TabsContent>

          <TabsContent value="completed">
             {/* ... Completed content ... */}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function EmbroideryCard({ assignment, purchase, style }: { assignment: any, purchase: any, style: React.CSSProperties }) {
  const { vendors, updateAssignment } = useKhatupatiStore();
  const [isReceived, setIsReceived] = useState(false);
  const vendorName = vendors.find((v: any) => v.id === assignment.vendorId)?.name || 'Unknown';
  const daysOut = differenceInDays(new Date(), new Date(assignment.sentDate));
  const isDelayed = daysOut > 20;

  const handleReceive = () => {
    updateAssignment(assignment.id, { receivedDate: new Date().toISOString() });
    setIsReceived(true);
  };

  const handleWhatsAppShare = () => {
    const componentsText = assignment.components.map((c:any) => `${c.type}: ${c.quantity}`).join(', ');
    const text = `*Embroidery Dispatch*%0A%0A*Lot:* ${purchase.qualityName}%0A*Vendor:* ${vendorName}%0A*Challan:* ${assignment.challanNumber || 'N/A'}%0A*Qty:* ${componentsText}%0A*Date:* ${new Date(assignment.sentDate).toLocaleDateString()}`;
    window.open(`https.wa.me/?text=${text}`, '_blank');
  };

  const handleDownloadPDF = () => {
    generateChallanPDF(purchase, assignment);
  };

  const progress = Math.min((daysOut / 14) * 100, 100);
  const progressBarColor = daysOut < 8 ? 'bg-[#66BB6A]' : daysOut <= 14 ? 'bg-[#FFA726]' : 'bg-[#EF5350]';

  return (
    <Card 
      className={`transition-all duration-300 ${isReceived ? 'opacity-50' : ''}`}
      style={style}
    >
      {isDelayed && (
        <div className="px-4 py-2 bg-[#FFEBEE] border-l-4 border-l-[#EF5350] rounded-t-lg flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#B71C1C]">Delayed Job</h3>
          <Badge variant="destructive">Delayed</Badge>
        </div>
      )}
      <CardContent className="p-4 flex flex-col gap-4">
        <div className="flex justify-between items-start">
            <div>
                <p className="font-bold text-lg">{purchase.qualityName}</p>
                <p className="text-sm text-muted-foreground">{Math.max(0, ...assignment.components.map((c:any) => c.quantity))} units with <span className='font-semibold'>{vendorName}</span></p>
            </div>
            <div className="flex items-center gap-1 no-print">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleWhatsAppShare}><Share2 className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownloadPDF}><Printer className="w-3.5 h-3.5" /></Button>
            </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-xs font-medium text-muted-foreground">Days Out</label>
            <span className="text-xs font-bold">{daysOut} day{daysOut !== 1 && 's'}</span>
          </div>
          <div className="w-full h-[5px] bg-gray-200 rounded-[3px] overflow-hidden">
            <div 
                className={`h-full ${progressBarColor} transition-all duration-1000 ease-out`}
                style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <Button 
          onClick={handleReceive} 
          disabled={isReceived}
          className="w-full bg-[#EEF2FF] text-[#283593] hover:bg-[#E8EAF6] transition-all duration-200"
        >
          {isReceived ? <><Check className="w-5 h-5 mr-2" /> Received</> : 'Mark as Received'}
        </Button>
      </CardContent>
    </Card>
  )
}
