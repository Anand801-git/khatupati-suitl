'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { useKhatupatiStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Search, Send, Upload, Trash2, Printer, Share2, Loader2, CheckCircle, AlertCircle, Check } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { ProductionJob, Purchase, DispatchedComponent } from '@/lib/types';
import { resizeImage } from '@/lib/utils';

export default function VAJobs() {
  const { purchases, vendors, addVendor, allAssignments, addAssignment, deleteAssignment, updateAssignment, isLoaded } = useKhatupatiStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [printData, setPrintData] = useState<{ purchase: Purchase, job: ProductionJob } | null>(null);

  useEffect(() => {
    if (printData) {
      window.print();
      const timer = setTimeout(() => setPrintData(null), 500);
      return () => clearTimeout(timer);
    }
  }, [printData]);

  const getRemainingQty = (purchase: Purchase, type: string) => {
    const lotAssignments = allAssignments.filter(a => a.lotId === purchase.id);
    
    const receivedFromEmb = lotAssignments
      .filter(j => j.processType === 'Embroidery' && j.receivedDate)
      .reduce((sum, j) => sum + (j.components.find(c => c.type === type)?.quantity || 0), 0);

    const receivedFromNonFinalVA = lotAssignments
      .filter(j => j.processType === 'Value Addition' && j.receivedDate && j.isFinalStep === false)
      .reduce((sum, j) => sum + (j.components.find(c => c.type === type)?.quantity || 0), 0);

    const sentToVA = lotAssignments
      .filter(j => j.processType === 'Value Addition')
      .reduce((sum, job) => sum + (job.components.find(c => c.type === type)?.quantity || 0), 0);
    
    return Math.max(0, (receivedFromEmb + receivedFromNonFinalVA) - sentToVA);
  };

  const getSubLotLabel = (lotId: string, jobId: string) => {
    const lotAssignments = allAssignments
      .filter(a => a.lotId === lotId && a.processType === 'Value Addition')
      .sort((a, b) => new Date(a.sentDate).getTime() - new Date(b.sentDate).getTime());
    
    const index = lotAssignments.findIndex(a => a.id === jobId);
    return index !== -1 ? String.fromCharCode(65 + index) : '';
  };

  const vendorStockSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    allAssignments.forEach(j => {
      if (j.processType === 'Value Addition' && !j.receivedDate) {
        summary[j.vendorName] = (summary[j.vendorName] || 0) + Math.max(...j.components.map(c => c.quantity), 0);
      }
    });
    return summary;
  }, [allAssignments]);

  const totalAtVendors = (Object.values(vendorStockSummary) as number[]).reduce((a, b) => a + b, 0);

  const pendingVA = useMemo(() => {
    return purchases.filter(p => {
      const matchesSearch = p.qualityName.toLowerCase().includes(searchTerm.toLowerCase());
      const hasReady = ['Kurta', 'Salwar', 'Dupatta', 'Lace'].some(t => getRemainingQty(p, t) > 0);
      return hasReady && matchesSearch && p.state !== 'Finished Stock';
    });
  }, [purchases, searchTerm, allAssignments]);

  const activeVA = useMemo(() => {
    return purchases.filter(p => {
      const pAssignments = allAssignments.filter(a => a.lotId === p.id && a.processType === 'Value Addition' && !a.receivedDate);
      return pAssignments.some(j => {
        const matchesVendor = vendorFilter === 'all' || j.vendorName === vendorFilter;
        const matchesSearch = p.qualityName.toLowerCase().includes(searchTerm.toLowerCase()) || j.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesVendor && matchesSearch;
      });
    });
  }, [purchases, searchTerm, vendorFilter, allAssignments]);
  
  if (!isLoaded) return <div className="flex flex-col items-center justify-center min-h-screen gap-4"><Loader2 className="w-10 h-10 animate-spin text-primary" /><p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Connecting...</p></div>;

  return (
    <div className="flex flex-col gap-6 pb-20">
      <Header title="VA Stage (Handwork)" className="va-stage-header" />
      <main className="container px-4 space-y-6">
        <div className="flex flex-col gap-4 no-print">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search Lot or Vendor..." className="pl-10 h-12" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>

          <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
            <Card 
              className={`min-w-[120px] cursor-pointer border-2 ${vendorFilter === 'all' ? 'border-[#00897B] bg-[#E8FDF5]' : 'bg-white border-[#F0EAF8]'} clickable-card`}
              onClick={() => setVendorFilter('all')}
              style={{ animation: `fade-up 0.4s ease-out 0ms both` }}
            >
              <CardContent className="p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Total VA Units</p>
                <p className="text-xl font-bold">{totalAtVendors}</p>
              </CardContent>
            </Card>
            {Object.entries(vendorStockSummary).map(([vendor, count], index) => (
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

        <Tabs defaultValue="pending" className="w-full no-print">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-[#E8F5E9]">
            <TabsTrigger value="pending" className="data-[state=active]:bg-white data-[state=active]:text-[#2E7D32]">Ready Pool ({pendingVA.length})</TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-white data-[state=active]:text-[#2E7D32]">In Production ({activeVA.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-4">
            {pendingVA.length === 0 ? (
              <div className="text-center py-20 flex flex-col items-center gap-4 text-muted-foreground">
                <CheckCircle className="w-10 h-10" />
                <p className="font-bold">No lots available for VA.</p>
                <p className="text-sm -mt-2">Lots will appear here after being received from embroidery.</p>
              </div>
            ) : pendingVA.map((p, index) => (
              <VACard 
                key={p.id} 
                purchase={p} 
                type="pending" 
                vendors={vendors} 
                addAssignment={addAssignment} 
                addVendor={addVendor} 
                getRemainingQty={getRemainingQty} 
                allAssignments={allAssignments}
                style={{ animation: `fade-up 0.4s ease-out ${index * 50}ms both` }}
              />
            ))}
          </TabsContent>

          <TabsContent value="active" className="mt-4 space-y-4">
            {activeVA.length === 0 ? (
              <div className="text-center py-20 flex flex-col items-center gap-4 text-green-600">
                <CheckCircle className="w-10 h-10" />
                <p className="font-bold text-lg">All Clear!</p>
                <p className="text-sm -mt-2 text-muted-foreground">No lots are currently at any VA vendor.</p>
              </div>
            ) : activeVA.map((p, index) => (
              <VACard 
                key={p.id} 
                purchase={p} 
                type="active" 
                vendors={vendors} 
                allAssignments={allAssignments} 
                updateAssignment={updateAssignment} 
                addAssignment={addAssignment} 
                deleteAssignment={deleteAssignment} 
                vendorFilter={vendorFilter} 
                getSubLotLabel={getSubLotLabel} 
                getRemainingQty={getRemainingQty}
                onPrint={(job: ProductionJob) => setPrintData({ purchase: p, job })}
                style={{ animation: `fade-up 0.4s ease-out ${index * 50}ms both` }}
              />
            ))}
          </TabsContent>
        </Tabs>

        {/* Print Layout */}
        {printData && <PrintLayout data={printData} />}
      </main>
    </div>
  );
}

function VACard({ purchase, type, vendors, addAssignment, updateAssignment, deleteAssignment, allAssignments, addVendor, getRemainingQty, vendorFilter, getSubLotLabel, onPrint, style }: any) {
  const kurtaRem = getRemainingQty ? getRemainingQty(purchase, 'Kurta') : 0;
  const activeJobs = allAssignments?.filter((j: any) => j.lotId === purchase.id && j.processType === 'Value Addition' && !j.receivedDate)
    .filter((j: any) => vendorFilter === 'all' || !vendorFilter || j.vendorName === vendorFilter) || [];
  const [isReceived, setIsReceived] = useState(false);

  const handleReceive = () => {
    setIsReceived(true);
  };

  return (
    <Card style={style} className={`border-l-4 ${type === 'pending' ? 'border-l-secondary' : 'border-l-green-600'} transition-all duration-300 ${isReceived ? 'opacity-50' : ''}`}>
      <CardContent className="p-4 space-y-4">
        <div className="flex justify-between items-start">
          <div onClick={() => window.location.href=`/purchases/view?id=${purchase.id}`} className="cursor-pointer clickable-card p-1 -m-1 rounded-lg">
            <h3 className="text-lg font-bold">{purchase.qualityName}</h3>
            <div className="flex gap-2 items-center mt-1">
              <Badge variant="outline" className="text-[10px] font-mono">#{purchase.id.substr(-4).toUpperCase()}</Badge>
              {purchase.range && <Badge variant="secondary" className="text-[10px] bg-secondary/10 text-secondary border-none">{purchase.range}</Badge>}
            </div>
            {type === 'pending' && (
               <p className="text-[10px] font-bold uppercase text-muted-foreground mt-2">Ready Pool: {kurtaRem} pcs</p>
            )}
          </div>
          <Badge variant="secondary" className="bg-secondary/10 text-secondary border-none">{type === 'pending' ? 'Ready Pool' : 'In Production'}</Badge>
        </div>

        {type === 'pending' ? (
          <VASendDialog purchase={purchase} vendors={vendors} addAssignment={addAssignment} addVendor={addVendor} getRemainingQty={getRemainingQty} />
        ) : (
          <div className="space-y-3">
            {activeJobs.map((job: any) => {
              const daysOut = differenceInDays(new Date(), new Date(job.sentDate));
              const isDelayed = daysOut > 15;
              const progress = Math.min((daysOut / 14) * 100, 100);
              const progressBarColor = daysOut < 8 ? 'bg-[#66BB6A]' : daysOut <= 14 ? 'bg-[#FFA726]' : 'bg-[#EF5350]';
              const [barWidth, setBarWidth] = useState(0);

              useEffect(() => {
                const timer = setTimeout(() => setBarWidth(progress), 100);
                return () => clearTimeout(timer);
              }, [progress]);
              
              return (
                <div key={job.id} className="p-3 bg-muted/30 rounded-lg border-2 border-dashed space-y-3">
                  {isDelayed && (
                    <div className="-mx-3 -mt-3 px-3 py-2 bg-[#FFEBEE] border-b-2 border-dashed flex items-center justify-between rounded-t-lg">
                      <h3 className="font-bold text-sm text-[#B71C1C]">Delayed Job</h3>
                      <Badge variant="destructive">Delayed</Badge>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-green-600 uppercase">{job.challanNumber || `VA-Lot ${getSubLotLabel(purchase.id, job.id)}`}</span>
                      <span className="text-xs font-bold text-muted-foreground">{job.vendorName}</span>
                    </div>
                    <div className="flex items-center gap-1 no-print">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          const text = `*VA Dispatch (Handwork)*%0A%0A*Lot:* ${purchase.qualityName}%0A*Vendor:* ${job.vendorName}%0A*Challan:* ${job.challanNumber || 'N/A'}%0A*Qty:* ${job.components.map((c: any) => `${c.type}: ${c.quantity}`).join(', ')}%0A*Date:* ${new Date(job.sentDate).toLocaleDateString()}`;
                          window.open(`https://wa.me/?text=${text}`, '_blank');
                      }}><Share2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPrint?.(job)}><Printer className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => deleteAssignment(job.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {job.components.map((c: any) => (
                      <Badge key={c.type} variant="secondary" className="text-[9px] h-4 bg-green-50 text-green-700">{c.type}: {c.quantity}</Badge>
                    ))}
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-medium text-muted-foreground">Days Out</label>
                      <span className="text-xs font-bold">{daysOut} day{daysOut !== 1 && 's'}</span>
                    </div>
                    <div className="w-full h-[5px] bg-gray-200 rounded-[3px] overflow-hidden">
                        <div 
                            className={`h-full ${progressBarColor}`}
                            style={{ width: `${barWidth}%`, transition: 'width 1s ease-out' }}
                        />
                    </div>
                   </div>

                  {job.receivedDate ? (
                     <Button disabled className="w-full bg-green-100 text-green-700"><Check className="w-5 h-5 mr-2"/> Received</Button>
                  ) : (
                     <VAReceiveDialog purchase={purchase} job={job} updateAssignment={updateAssignment} addAssignment={addAssignment} onReceive={handleReceive} />
                  )}
                </div>
            )})}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function VASendDialog({ purchase, vendors, addAssignment, addVendor, getRemainingQty }: any) {
  const [open, setOpen] = useState(false);
  const [vendor, setVendor] = useState('');
  const [rate, setRate] = useState('');
  const [challan, setChallan] = useState('');
  const [quantities, setQuantities] = useState({
    Kurta: getRemainingQty ? getRemainingQty(purchase, 'Kurta') : 0,
    Salwar: getRemainingQty ? getRemainingQty(purchase, 'Salwar') : 0,
    Dupatta: getRemainingQty ? getRemainingQty(purchase, 'Dupatta') : 0,
    Lace: getRemainingQty ? getRemainingQty(purchase, 'Lace') : 0,
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleQuantityChange = (type: string, value: string) => {
    setQuantities(prev => ({ ...prev, [type]: parseInt(value) || 0 }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessing(true);
      try {
        const compressed = await resizeImage(e.target.files[0]);
        setPhoto(compressed);
      } catch (error) {
        console.error("Error resizing image:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSend = async () => {
    const components: DispatchedComponent[] = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([type, quantity]) => ({ type: type as DispatchedComponent['type'], quantity }));

    if (components.length === 0) return;

    const job: Omit<ProductionJob, 'id' | 'lotId'> = {
      vendorName: vendor,
      rate: parseFloat(rate) || 0,
      challanNumber: challan,
      sentDate: new Date().toISOString(),
      processType: 'Value Addition',
      challanPhoto: photo || undefined,
      components,
    };
    await addAssignment(purchase.id, job);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="w-full gap-2 bg-secondary hover:bg-secondary/90"><Send className="w-4 h-4" /> Dispatch for Handwork</Button></DialogTrigger>
      <DialogContent className="dialog-content">
        <DialogHeader><DialogTitle>VA Assignment #{purchase.id.substr(-4).toUpperCase()}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>VA Vendor</Label>
            <Input list="va-vendors" value={vendor} onChange={e => setVendor(e.target.value)} placeholder="Select vendor..." />
            <datalist id="va-vendors">{vendors.filter((v: any) => v.type === 'Value Addition').map((v: any) => <option key={v.id} value={v.name} />)}</datalist>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Job Rate (₹/pc)</Label><Input type="number" value={rate} onChange={e => setRate(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Object.keys(quantities).map(type => (
              <div key={type} className="space-y-2">
                <Label>{type} Qty</Label>
                <Input 
                  type="number" 
                  value={quantities[type as keyof typeof quantities]} 
                  onChange={e => handleQuantityChange(type, e.target.value)} 
                  max={getRemainingQty ? getRemainingQty(purchase, type) : 0} 
                />
              </div>
            ))}
          </div>
          <div className="space-y-2"><Label>Challan Number</Label><Input value={challan} onChange={e => setChallan(e.target.value)} placeholder="e.g. VA-556" /></div>
          <div className="space-y-2">
             <Label>Dispatch Photo</Label>
             <div className="relative aspect-video bg-muted rounded border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 animate-spin opacity-20" />
                ) : photo ? (
                  <Image src={photo} alt="Dispatch" fill className="object-cover" />
                ) : (
                  <Upload className="opacity-20" />
                )}
             </div>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
          </div>
        </div>
        <DialogFooter><Button onClick={handleSend} disabled={!vendor || isProcessing}>Confirm VA Dispatch</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VAReceiveDialog({ purchase, job, updateAssignment, addAssignment, onReceive }: any) {
  const [open, setOpen] = useState(false);
  const [receivedQty, setReceivedQty] = useState(Math.max(...job.components.map((c: any) => c.quantity)));
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessing(true);
      try {
        const compressed = await resizeImage(e.target.files[0]);
        setPhoto(compressed);
      } catch (error) {
        console.error("Error resizing image:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleReceive = async () => {
    const originalQty = Math.max(...job.components.map((c: any) => c.quantity));
    
    if (receivedQty < originalQty) {
      // Partial receive
      const remainingQty = originalQty - receivedQty;
      
      await updateAssignment(job.id, {
        ...job,
        receivedQty: receivedQty,
        receivedDate: new Date(receivedDate).toISOString(),
        receivedPhoto: photo || undefined,
        isFinalStep: isFinal,
        components: job.components.map((c: any) => ({ ...c, quantity: receivedQty }))
      });

      const remainingJob: Omit<ProductionJob, 'id' | 'lotId'> = {
        vendorName: job.vendorName,
        rate: job.rate,
        challanNumber: job.challanNumber,
        sentDate: job.sentDate,
        processType: 'Value Addition',
        components: job.components.map((c: any) => ({ ...c, quantity: remainingQty })),
      };
      await addAssignment(purchase.id, remainingJob);
    } else {
      // Full receive
      await updateAssignment(job.id, {
        ...job,
        receivedQty: receivedQty,
        receivedDate: new Date(receivedDate).toISOString(),
        receivedPhoto: photo || undefined,
        isFinalStep: isFinal,
      });
    }
    onReceive?.();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
         <Button className="w-full bg-[#EEF2FF] text-[#283593] hover:bg-[#E8EAF6] transition-all duration-200">Mark as Received</Button>
      </DialogTrigger>
      <DialogContent className="dialog-content">
        <DialogHeader><DialogTitle>VA Reception - {job.vendorName}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2"><Label>Qty Received</Label><Input type="number" value={receivedQty} onChange={e => setReceivedQty(parseInt(e.target.value) || 0)} /></div>
             <div className="space-y-2"><Label>Date Received</Label><Input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} /></div>
          </div>
          <div className="space-y-2">
             <Label>Reception Photo</Label>
             <div className="relative aspect-video bg-muted rounded border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 animate-spin opacity-20" />
                ) : photo ? (
                  <Image src={photo} alt="Reception" fill className="object-cover" />
                ) : (
                  <Upload className="opacity-20" />
                )}
             </div>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-sm">Final VA Step?</Label>
              <p className="text-[10px] text-muted-foreground">Toggle off if pieces need another VA vendor.</p>
            </div>
            <Switch 
              checked={isFinal} 
              onCheckedChange={setIsFinal} 
              className="transition-all duration-200 data-[state=checked]:bg-[#A5D6A7] data-[state=unchecked]:bg-[#E0E0E0] [&>span]:data-[state=checked]:bg-[#2E7D32]"
            />
          </div>
        </div>
        <DialogFooter><Button onClick={handleReceive} disabled={isProcessing}>Complete Reception</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PrintLayout({ data }: { data: { purchase: Purchase, job: ProductionJob }}) {
  return (
    <div className="print-only">
      <div className="p-8 space-y-8 border-2 border-green-600 rounded-3xl">
        <div className="text-center border-b-2 border-green-600 pb-6">
          <h1 className="text-4xl font-black tracking-widest uppercase text-green-700">KHATUPATI SUITS</h1>
          <p className="text-sm font-bold tracking-tight uppercase text-muted-foreground mt-1">VA Stage (Handwork) Challan</p>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground">VA Vendor</p>
              <p className="text-xl font-black text-green-700">{data.job.vendorName}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground">Lot Quality</p>
              <p className="text-lg font-bold">{data.purchase.qualityName}</p>
            </div>
          </div>
          <div className="space-y-4 text-right">
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground">VA Challan No.</p>
              <p className="text-xl font-black text-green-700">{data.job.challanNumber || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground">Dispatch Date</p>
              <p className="text-lg font-bold">{format(new Date(data.job.sentDate), 'dd MMMM yyyy')}</p>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-green-600 pt-6">
          <h3 className="text-sm font-black uppercase mb-4 text-green-700 tracking-widest">Component Breakdown</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-green-600/20">
                <th className="py-2 text-[10px] font-black uppercase">Component</th>
                <th className="py-2 text-[10px] font-black uppercase text-right">Quantity (Pcs)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.job.components.map((c: any) => (
                <tr key={c.type}>
                  <td className="py-3 font-bold">{c.type}</td>
                  <td className="py-3 font-black text-right">{c.quantity}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-green-600">
                <td className="py-4 font-black uppercase text-green-700">Total Pieces</td>
                <td className="py-4 font-black text-2xl text-right text-green-700">
                  {Math.max(...data.job.components.map((c: any) => c.quantity))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-8 pt-12">
          <div className="border-t border-dashed border-green-600 pt-4 text-center">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Production Manager</p>
          </div>
          <div className="border-t border-dashed border-green-600 pt-4 text-center">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">VA Artisan Signature</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Add this to your globals.css or a relevant stylesheet
const globalStyles = `
  @keyframes progress-bar-anim {
    from { width: 0%; }
  }
`;

if (typeof window !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = globalStyles;
  document.head.appendChild(styleSheet);
}
