
'use client';

import { useKhatupatiStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { IndianRupee, ArrowLeft, Package, Factory, Pencil, ImageIcon, LayoutGrid, CheckCircle2, Clock, Printer, Share2, AlertCircle, Sparkles, Loader2, Download, Palette, Tag, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { DeleteLotModal } from '@/components/modals/DeleteLotModal';
import { getLotStats } from '@/lib/lot-utils';
import { generateLotSummaryPDF } from '@/lib/pdf-generator';
import { generateTraceabilityCertificate, generateLotHash } from '@/lib/certificate-generator';
import { handleAiDesignInsight } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

function PurchaseDetailsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { toast } = useToast();
  const { purchases, allAssignments, calculateSuratMath, deletePurchase, isLoaded } = useKhatupatiStore();
  const [mounted, setMounted] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingCert, setIsGeneratingCert] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    keywords: string[];
    themes: string[];
    classification: string;
    summary: string;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const purchase = useMemo(() => purchases.find(p => p.id === id), [purchases, id]);
  const assignments = useMemo(() => allAssignments.filter(a => a.lotId === id), [allAssignments, id]);

  const distribution = useMemo(() => {
    if (!purchase) return null;
    return getLotStats(purchase, assignments);
  }, [purchase, assignments]);

  const landingCost = useMemo(() => {
    if (!purchase) return 0;
    return calculateSuratMath(purchase, assignments);
  }, [purchase, assignments, calculateSuratMath]);

  const handleAnalyze = async () => {
    if (!purchase?.designPhoto) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await handleAiDesignInsight({ 
        photoDataUri: purchase.designPhoto,
        description: purchase.qualityName 
      });
      setAnalysisResult(result);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "AI Analysis Failed",
        description: "Could not analyze the design photo. Please try again."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateCertificate = async () => {
    if (!purchase) return;
    setIsGeneratingCert(true);
    try {
      await generateTraceabilityCertificate(purchase, assignments);
      toast({ title: "Certificate Generated", description: "Traceability PDF has been downloaded." });
    } catch (error) {
      toast({ variant: "destructive", title: "Generation Failed", description: "Could not create traceability certificate." });
    } finally {
      setIsGeneratingCert(false);
    }
  };

  const handleShareCertificate = async () => {
    if (!purchase) return;
    const hash = await generateLotHash(purchase, assignments);
    const verifyUrl = `${window.location.origin}/verify/view?hash=${hash}`;
    const text = `*Khatupati Verified Traceability*%0A%0A*Lot:* ${purchase.qualityName}%0A*ID:* #${purchase.id.substr(-6).toUpperCase()}%0A%0AYou can verify the production journey of this suit using the digital certificate below:%0A${verifyUrl}`;
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (!mounted || !isLoaded || !purchase || !distribution) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  const handleWhatsAppShare = () => {
    const text = `*Khatupati Suits - Lot Details*%0A%0A*Lot:* ${purchase.qualityName}%0A*ID:* #${purchase.id.substr(-6).toUpperCase()}%0A*Total Pieces:* ${purchase.piecesCount}%0A*Est. Landing:* ₹${landingCost.toFixed(2)}/pc%0A%0A*Status:*%0A- Warehouse: ${distribution.inWhse}%0A- At Embroidery: ${distribution.atEmb}%0A- At VA Stage: ${distribution.atVA}%0A- Finished: ${distribution.finished}`;
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleDownloadPDF = () => {
    if (purchase) {
      generateLotSummaryPDF(purchase, assignments, landingCost);
    }
  };
  
  const statCards = [
    { label: "Lot Size", value: distribution.total, icon: <LayoutGrid className="w-4 h-4" /> },
    { label: "Whse Pool", value: distribution.inWhse, icon: <Package className="w-4 h-4" />, color: "text-amber-600" },
    { label: "At Vendors", value: distribution.atEmb + distribution.atVA, icon: <Clock className="w-4 h-4" />, color: "text-secondary" },
    { label: "Finished", value: distribution.finished, icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-600" }
  ];

  const isFinished = purchase.state === 'Finished Stock';

  return (
    <div className="flex flex-col gap-6 pb-20">
      <Header title={`Lot #${purchase.id.substr(-6).toUpperCase()}`} className="default-header" />
      <main className="container px-4 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between no-print">
          <Link href="/purchases"><Button variant="ghost" className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button></Link>
          <div className="flex items-center gap-2">
            {isFinished && (
              <Button 
                variant="default" 
                className="bg-green-600 hover:bg-green-700 gap-2" 
                onClick={handleGenerateCertificate}
                disabled={isGeneratingCert}
              >
                {isGeneratingCert ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Certificate
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={handleDownloadPDF} title="Download PDF"><Download className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" onClick={handleShareCertificate} title="Share Traceability"><Share2 className="w-4 h-4" /></Button>
            <Button variant="outline" className="gap-2" onClick={() => router.push(`/purchases/edit?id=${purchase.id}`)}><Pencil className="w-4 h-4" /> Edit Order</Button>
            <DeleteLotModal 
              lotName={purchase.qualityName} pieceCount={purchase.piecesCount} assignmentCount={assignments.length}
              onConfirm={async () => { await deletePurchase(purchase.id); router.push('/purchases'); }}
            />
          </div>
        </div>

        <div className="print-only mb-8 text-center border-b pb-4">
          <h1 className="text-3xl font-black uppercase tracking-widest text-primary">Khatupati Flow</h1>
          <p className="text-sm font-bold uppercase tracking-tight text-muted-foreground mt-1">Lot Summary Report</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <Card className="overflow-hidden border-primary/20 shadow-md animate-fade-up">
              <CardHeader className="bg-primary/5 pb-4"><CardTitle className="text-sm font-bold uppercase tracking-tight text-primary flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Design Photo</CardTitle></CardHeader>
              <div className="relative aspect-square bg-muted flex items-center justify-center">
                {purchase.designPhoto ? <Image src={purchase.designPhoto} alt="Order" fill className="object-cover" /> : <Package className="w-12 h-12 opacity-20" />}
              </div>
              {purchase.designPhoto && (
                <CardFooter className="p-2 bg-primary/5">
                    <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full gap-2 bg-secondary hover:bg-secondary/90">
                        {isAnalyzing ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
                        ) : (
                            <><Sparkles className="w-4 h-4" /> Analyze Design</>
                        )}
                    </Button>
                </CardFooter>
              )}
            </Card>

            <Card className="border-none shadow-sm animate-fade-up">
              <CardHeader className="pb-3"><CardTitle className="text-base font-bold flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-primary" /> Categorization</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                  {purchase.range && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Color Range</p>
                      <Badge className="bg-primary/10 text-primary border-none flex items-center gap-1.5 w-fit">
                        <Palette className="w-3 h-3" /> {purchase.range}
                      </Badge>
                    </div>
                  )}
                  {purchase.tags && purchase.tags.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Design Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {purchase.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5" /> {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {analysisResult && (
                    <div className="space-y-1 pt-2 border-t border-dashed">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3 text-secondary" /> AI Summary</p>
                        <p className="text-xs italic leading-relaxed text-muted-foreground">{analysisResult.summary}</p>
                    </div>
                  )}
              </CardContent>
            </Card>

            <Card className="bg-primary text-primary-foreground shadow-lg border-none overflow-hidden relative animate-fade-up">
              <div className="absolute top-0 right-0 p-4 opacity-10"><IndianRupee className="w-16 h-16" /></div>
              <CardContent className="p-6">
                <p className="text-xs font-bold uppercase opacity-80 mb-1">Estimated Landing</p>
                <p className="text-4xl font-black">₹{landingCost.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {statCards.map((stat, index) => (
                <StatMiniCard key={stat.label} {...stat} style={{ animation: `fade-up 0.4s ease-out ${index * 50}ms both` }} />
              ))}
            </div>

            <Card className="animate-fade-up">
              <CardHeader className="border-b"><CardTitle className="text-lg font-bold flex items-center gap-2"><Factory className="w-5 h-5 text-primary" /> Production History</CardTitle></CardHeader>
              <CardContent className="space-y-4 pt-4">
                {assignments.map((job, index) => {
                  const isDelayed = !job.receivedDate && differenceInDays(new Date(), new Date(job.sentDate)) > 20;
                  return (
                    <div key={job.id} 
                         className={`p-4 border rounded-xl space-y-2 ${job.receivedDate ? 'opacity-60 bg-muted/20' : 'border-l-4 border-l-primary shadow-sm'}`}
                         style={{ animation: `fade-up 0.4s ease-out ${index * 50}ms both` }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">{job.processType}</p>
                          <h4 className="font-bold">{job.vendorName}</h4>
                          <p className="text-[9px] text-muted-foreground">{job.challanNumber || `ID: ${job.id.substr(-4).toUpperCase()}`}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge variant="outline">₹{job.rate}/pc</Badge>
                          {isDelayed && <Badge variant="destructive" className="text-[9px]">Delayed</Badge>}
                          <p className="text-[8px] mt-1 text-muted-foreground">Sent: {format(new Date(job.sentDate), 'dd MMM')}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {job.components.map(c => <Badge key={c.type} variant="secondary" className="text-[8px] h-3.5">{c.type}: {c.quantity}</Badge>)}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <ProductionTimeline purchase={purchase} assignments={assignments} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PurchaseDetails() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <PurchaseDetailsContent />
    </Suspense>
  );
}

function StatMiniCard({ label, value, icon, color = "text-foreground", style }: any) {
  return (
    <Card className="border-none bg-muted/30" style={style}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-background ${color}`}>{icon}</div>
        <div><p className="text-[10px] font-bold uppercase text-muted-foreground leading-none mb-1">{label}</p><p className={`text-xl font-black ${color}`}>{value}</p></div>
      </CardContent>
    </Card>
  );
}

function ProductionTimeline({ purchase, assignments }: { purchase: any, assignments: any[] }) {
  const timelineEvents = useMemo(() => {
    const events = [];
    events.push({ date: purchase.purchaseDate, title: 'Lot Purchased', description: `${purchase.piecesCount} pieces`, status: 'completed', isDelayed: false, daysDelayed: 0 });

    const sortedAssignments = [...assignments].sort((a,b) => new Date(a.sentDate).getTime() - new Date(b.sentDate).getTime());

    sortedAssignments.forEach(job => {
      const daysOut = differenceInDays(new Date(), parseISO(job.sentDate));
      const isDelayed = !job.receivedDate && daysOut > 20;

      events.push({
        date: job.sentDate,
        title: `Sent to ${job.processType}`,
        description: `${job.vendorName} (${job.components[0].quantity} pcs)`,
        status: job.receivedDate ? 'completed' : 'in-progress',
        isDelayed: isDelayed,
        daysDelayed: isDelayed ? daysOut - 20 : 0
      });

      if(job.receivedDate) {
        events.push({ 
          date: job.receivedDate, 
          title: `Received from ${job.processType}`, 
          description: `${job.receivedQty} pcs received`, 
          status: 'completed', 
          isDelayed: false,
          daysDelayed: 0
        });
      }
    });
    
    const isFinished = purchase.state === 'Finished Stock';
    events.push({ date: null, title: 'Finished Stock', description: '', status: isFinished ? 'completed' : 'future', isDelayed: false, daysDelayed: 0 });

    return events.sort((a,b) => a.date && b.date ? new Date(a.date).getTime() - new Date(b.date).getTime() : a.date ? -1 : 1);
  }, [purchase, assignments]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-bold flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Production Timeline</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="relative pl-4">
          {timelineEvents.map((event, index) => (
            <div key={index} className="relative flex items-start pb-8">
              {index < timelineEvents.length - 1 && <div className="absolute left-[5px] top-[5px] h-full w-[2px] bg-muted-foreground/20"></div>}
              <div className="relative z-10">
                <div className={`w-3 h-3 rounded-full ${ 
                  event.isDelayed ? 'bg-red-500' : 
                  event.status === 'completed' ? 'bg-green-500' : 
                  event.status === 'in-progress' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
                }`}></div>
              </div>
              <div className="pl-6 -mt-1">
                <p className="font-bold text-sm">{event.title}</p>
                <p className="text-xs text-muted-foreground">{event.description}</p>
                {event.date && <p className="text-[10px] text-muted-foreground/80 mt-0.5">{format(parseISO(event.date), 'dd MMM yyyy')}</p>}
                {event.isDelayed && <p className="text-xs font-bold text-red-500">Delayed by {event.daysDelayed} days</p>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
