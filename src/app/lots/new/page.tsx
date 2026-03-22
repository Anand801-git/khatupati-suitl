'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useKhatupatiStore } from '@/lib/store';
import { Purchase } from '@/lib/types';
import { Upload, Loader2, Sparkles, Tag, Palette, AlertTriangle, ScanSearch } from 'lucide-react';
import Image from 'next/image';
import { resizeImage } from '@/lib/utils';
import { handleAiDesignInsight, handleCostAnomalyDetection } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function NewPurchase() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addPurchase, directory, purchases, allAssignments, calculateSuratMath } = useKhatupatiStore();
  
  const [designPhoto, setDesignPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCheckingAnomaly, setIsCheckingAnomaly] = useState(false);
  
  const [anomalyData, setAnomalyData] = useState<{
    isAnomaly: boolean;
    anomalyDetails?: any[];
    overallMessage: string;
  } | null>(null);

  const [analysisResult, setAnalysisResult] = useState<{
    keywords: string[];
    themes: string[];
    classification: string;
    summary: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    piecesCount: 480,
    purchaseDate: '',
    range: '',
    tagsInput: '',
    kQuality: '', kSupplier: '', kRate: 0, kMeters: 0,
    sQuality: '', sSupplier: '', sRate: 0, sMeters: 0,
    dQuality: '', dSupplier: '', dRate: 0, dMeters: 0, dDying: 0,
    lQuality: '', lSupplier: '', lRate: 0, lMeters: 0,
  });

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFormData(prev => ({
      ...prev,
      purchaseDate: today,
    }));
  }, []);

  const runAiAnalysis = async (photoUri: string) => {
    setIsAnalyzing(true);
    try {
      const result = await handleAiDesignInsight({ 
        photoDataUri: photoUri,
        description: formData.kQuality 
      });
      
      setAnalysisResult(result);
      
      if (result.keywords && result.keywords.length > 0) {
        const currentTags = formData.tagsInput.split(',').map(t => t.trim()).filter(Boolean);
        const newTags = Array.from(new Set([...currentTags, ...result.keywords])).join(', ');
        setFormData(prev => ({ ...prev, tagsInput: newTags }));
      }

      if (result.classification && !formData.range) {
        setFormData(prev => ({ ...prev, range: result.classification }));
      }

      toast({
        title: "AI Analysis Complete",
        description: `Detected: ${result.keywords.slice(0, 3).join(', ')}...`,
      });
    } catch (error) {
      console.error("AI Analysis failed:", error);
      toast({
        variant: "destructive",
        title: "AI Analysis Failed",
        description: "Could not analyze the design photo automatically."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      try {
        const compressed = await resizeImage(file);
        setDesignPhoto(compressed);
        runAiAnalysis(compressed);
      } catch (error) {
        console.error("Compression failed:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleQualitySelect = (type: 'Kurta' | 'Salwar' | 'Dupatta' | 'Lace', name: string) => {
    const fieldMap: Record<string, any> = {
      Kurta: { q: 'kQuality', s: 'kSupplier', r: 'kRate', m: 'kMeters' },
      Salwar: { q: 'sQuality', s: 'sSupplier', r: 'sRate', m: 'sMeters' },
      Dupatta: { q: 'dQuality', s: 'dSupplier', r: 'dRate', m: 'dMeters', dy: 'dDying' },
      Lace: { q: 'lQuality', s: 'lSupplier', r: 'lRate', m: 'lMeters' }
    };

    const fields = fieldMap[type];
    
    setFormData(prev => {
      const next = { ...prev, [fields.q]: name } as typeof formData;
      const existing = directory.find(e => 
        e.category === 'Fabric' && 
        e.subCategory === type && 
        e.name.toLowerCase().trim() === name.toLowerCase().trim()
      );
      
      if (existing) {
        (next as any)[fields.s] = existing.supplierName || '';
        (next as any)[fields.r] = existing.rate || 0;
        (next as any)[fields.m] = existing.meters || 0;
        if (type === 'Dupatta') (next as any)[fields.dy] = existing.dying || 0;
      }
      return next;
    });
  };

  const savePurchase = () => {
    const manualTags = formData.tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const aiTags = analysisResult?.keywords || [];
    const combinedTags = Array.from(new Set([...manualTags, ...aiTags]));

    const purchase: Omit<Purchase, 'id' | 'createdAt' | 'owner'> = {
      qualityName: formData.kQuality || "Unspecified Lot",
      piecesCount: formData.piecesCount || 0,
      purchaseDate: formData.purchaseDate,
      range: formData.range,
      state: 'Purchased',
      designPhoto: designPhoto || undefined,
      kurta: { qualityName: formData.kQuality, supplierName: formData.kSupplier, ratePerMeter: formData.kRate, metersPerPiece: formData.kMeters },
      salwar: { qualityName: formData.sQuality, supplierName: formData.sSupplier, ratePerMeter: formData.sRate, metersPerPiece: formData.sMeters },
      dupatta: { qualityName: formData.dQuality, supplierName: formData.dSupplier, ratePerMeter: formData.dRate, metersPerPiece: formData.dMeters, dyingCharges: formData.dDying },
      lace: { qualityName: formData.lQuality, supplierName: formData.lSupplier, ratePerMeter: formData.lRate, metersPerPiece: formData.lMeters },
      tags: combinedTags.length > 0 ? combinedTags : undefined
    };
    addPurchase(purchase);
    router.push('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCheckingAnomaly(true);

    try {
      const historicalFabricRates = purchases.map(p => p.kurta.ratePerMeter).filter(Boolean);
      const historicalDyingCharges = purchases.map(p => p.dupatta.dyingCharges || 0).filter(Boolean);
      const historicalTotalLandingCosts = purchases.map(p => {
        const related = allAssignments.filter(a => a.lotId === p.id);
        return calculateSuratMath(p, related);
      }).filter(cost => cost > 0);

      const currentKurtaCost = (formData.kRate * formData.kMeters);
      const currentSalwarCost = (formData.sRate * formData.sMeters);
      const currentDupattaCost = (formData.dRate * formData.dMeters) + formData.dDying;
      const currentLaceCost = ((formData.lRate * formData.lMeters) / (formData.piecesCount || 1));
      const currentLandingCost = currentKurtaCost + currentSalwarCost + currentDupattaCost + currentLaceCost;

      const result = await handleCostAnomalyDetection({
        historicalFabricRates,
        historicalDyingCharges,
        historicalTotalLandingCosts,
        currentFabricRate: formData.kRate,
        currentDyingCharge: formData.dDying,
        currentTotalLandingCost: currentLandingCost,
        componentType: 'Kurta',
      });

      if (result.isAnomaly) {
        setAnomalyData(result);
        setIsCheckingAnomaly(false);
        return;
      }
    } catch (error) {
      console.error("Anomaly check failed, proceeding with standard save", error);
    }

    setIsCheckingAnomaly(false);
    savePurchase();
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      <Header title="New Purchase Entry" className="default-header" />
      <main className="container px-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <Card className="overflow-hidden border-primary/20">
                <CardHeader className="bg-primary/5 pb-4">
                  <CardTitle className="text-lg flex justify-between items-center">
                    Design Photo
                    {isAnalyzing && (
                      <Badge className="bg-secondary animate-pulse gap-1.5 border-none">
                        <ScanSearch className="w-3 h-3" /> AI Scanning...
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4 pt-4">
                  <div className="relative w-full aspect-square bg-muted rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden group clickable-card" onClick={() => fileInputRef.current?.click()}>
                    {isProcessing ? (
                      <Loader2 className="w-10 h-10 animate-spin opacity-20" />
                    ) : designPhoto ? (
                      <>
                        <Image src={designPhoto} alt="Preview" fill className="object-cover" />
                        {isAnalyzing && (
                          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center">
                            <div className="bg-white/90 p-3 rounded-full shadow-xl">
                              <Loader2 className="w-8 h-8 animate-spin text-secondary" />
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <p className="text-white text-xs font-bold">Change Photo</p>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 opacity-20">
                        <Upload className="w-10 h-10" />
                        <p className="text-xs font-bold">Tap to upload design</p>
                      </div>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
                </CardContent>
              </Card>

              {analysisResult && (
                <Card className="border-secondary/20 shadow-sm animate-fade-up">
                    <CardHeader className="pb-3"><CardTitle className="text-base font-bold flex items-center gap-2"><Sparkles className="w-4 h-4 text-secondary" /> AI Insights</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Classification</p>
                            <Badge className="bg-secondary/10 text-secondary border-none">{analysisResult.classification}</Badge>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Suggested Keywords</p>
                            <div className="flex flex-wrap gap-1.5">
                                {analysisResult.keywords.map(tag => (
                                    <Badge key={tag} variant="outline" className="cursor-pointer hover:bg-secondary/5 transition-colors" onClick={() => {
                                      const current = formData.tagsInput.split(',').map(t => t.trim()).filter(Boolean);
                                      if (!current.includes(tag)) {
                                        setFormData(p => ({...p, tagsInput: p.tagsInput ? `${p.tagsInput}, ${tag}` : tag}));
                                      }
                                    }}>
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader><CardTitle className="text-lg">Lot Summary</CardTitle></CardHeader>
                <CardContent className="grid gap-4">
                  <div className="space-y-2">
                    <Label>Purchase Date</Label>
                    <Input type="date" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Lot Quantity (Pieces)</Label>
                    <Input 
                      type="number" 
                      value={formData.piecesCount} 
                      onChange={e => setFormData({...formData, piecesCount: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Palette className="w-3.5 h-3.5" /> Color Range</Label>
                    <Input 
                      placeholder="e.g. Pastel, Bright, Earthy" 
                      value={formData.range} 
                      onChange={e => setFormData({...formData, range: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Tag className="w-3.5 h-3.5" /> Tags (comma separated)</Label>
                    <Input 
                      placeholder="e.g. Floral, Party Wear, Cotton" 
                      value={formData.tagsInput} 
                      onChange={e => setFormData({...formData, tagsInput: e.target.value})}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FabricSection title="Kurta" quality={formData.kQuality} supplier={formData.kSupplier} rate={formData.kRate} meters={formData.kMeters} masterQualities={directory.filter(e => e.subCategory === 'Kurta')} piecesCount={formData.piecesCount} onChangeQuality={(v: string) => handleQualitySelect('Kurta', v)} onChangeSupplier={(v: string) => setFormData({...formData, kSupplier: v})} onChangeRate={(v: number) => setFormData({...formData, kRate: v})} onChangeMeters={(v: number) => setFormData({...formData, kMeters: v})} />
                <FabricSection title="Salwar" quality={formData.sQuality} supplier={formData.sSupplier} rate={formData.sRate} meters={formData.sMeters} masterQualities={directory.filter(e => e.subCategory === 'Salwar')} piecesCount={formData.piecesCount} onChangeQuality={(v: string) => handleQualitySelect('Salwar', v)} onChangeSupplier={(v: string) => setFormData({...formData, sSupplier: v})} onChangeRate={(v: number) => setFormData({...formData, sRate: v})} onChangeMeters={(v: number) => setFormData({...formData, sMeters: v})} />
                <FabricSection title="Dupatta" quality={formData.dQuality} supplier={formData.dSupplier} rate={formData.dRate} meters={formData.dMeters} dying={formData.dDying} masterQualities={directory.filter(e => e.subCategory === 'Dupatta')} piecesCount={formData.piecesCount} onChangeQuality={(v: string) => handleQualitySelect('Dupatta', v)} onChangeSupplier={(v: string) => setFormData({...formData, dSupplier: v})} onChangeRate={(v: number) => setFormData({...formData, dRate: v})} onChangeMeters={(v: number) => setFormData({...formData, dMeters: v})} onChangeDying={(v: number) => setFormData({...formData, dDying: v})} />
                <FabricSection title="Lace" quality={formData.lQuality} supplier={formData.lSupplier} rate={formData.lRate} meters={formData.lMeters} masterQualities={directory.filter(e => e.subCategory === 'Lace')} piecesCount={formData.piecesCount} onChangeQuality={(v: string) => handleQualitySelect('Lace', v)} onChangeSupplier={(v: string) => setFormData({...formData, lSupplier: v})} onChangeRate={(v: number) => setFormData({...formData, lRate: v})} onChangeMeters={(v: number) => setFormData({...formData, lMeters: v})} />
              </div>
              <Button type="submit" disabled={isCheckingAnomaly} className="w-full h-14 text-lg font-bold shadow-xl bg-primary hover:bg-primary/90">
                {isCheckingAnomaly ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Checking rates...</>
                ) : (
                  'Confirm Purchase & Save Lot'
                )}
              </Button>
            </div>
          </div>
        </form>
      </main>

      <AlertDialog open={!!anomalyData} onOpenChange={(open) => !open && setAnomalyData(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" /> Cost Anomaly Detected
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p className="font-medium text-foreground">{anomalyData?.overallMessage}</p>
              <div className="space-y-3">
                {anomalyData?.anomalyDetails?.map((detail, idx) => (
                  <div key={idx} className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-xs">
                    <p className="font-bold uppercase text-amber-800 mb-1">{detail.field.replace(/([A-Z])/g, ' $1')}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-muted-foreground">Current Value</p>
                        <p className="font-black text-sm">₹{detail.currentValue}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Historical Avg</p>
                        <p className="font-bold">₹{detail.averageHistoricalValue.toFixed(1)}</p>
                      </div>
                    </div>
                    <p className="mt-2 font-medium text-amber-700">Deviation: {detail.deviationPercentage.toFixed(1)}%</p>
                    <p className="italic mt-1 text-amber-600">"{detail.reason}"</p>
                  </div>
                ))}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="grid grid-cols-2 gap-2">
            <AlertDialogCancel className="w-full" onClick={() => setAnomalyData(null)}>Go Back to Fix</AlertDialogCancel>
            <AlertDialogAction className="w-full bg-amber-600 hover:bg-amber-700" onClick={savePurchase}>Save Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FabricSection({ title, quality, supplier, rate, meters, dying, masterQualities, piecesCount, onChangeQuality, onChangeSupplier, onChangeRate, onChangeMeters, onChangeDying }: any) {
  const cost = title === 'Lace' ? (((meters || 0) / (piecesCount || 1)) * (rate || 0)) : (((rate || 0) * (meters || 0)) + (dying || 0));
  const listId = `master-${title.toLowerCase()}`;
  return (
    <Card className="h-full border-l-4 border-l-primary/40">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <CardTitle className="text-sm flex justify-between items-center uppercase tracking-tight font-bold">
          {title} <Badge variant="secondary" className="bg-primary/5 text-primary border-none">₹{cost.toFixed(2)}/pc</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 pt-4">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground font-bold">Quality Name</Label>
          <Input list={listId} value={quality} onChange={e => onChangeQuality(e.target.value)} placeholder="Type or select quality..." required />
          <datalist id={listId}>{masterQualities.map((e: any) => <option key={e.id} value={e.name}>{e.supplierName}</option>)}</datalist>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase text-muted-foreground font-bold">Supplier</Label>
          <Input value={supplier} onChange={e => onChangeSupplier(e.target.value)} placeholder="Supplier name" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Rate (₹/m)</Label>
            <Input type="number" value={rate || ""} onChange={e => onChangeRate(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground font-bold">{title === 'Lace' ? 'Total Mtr' : 'Mtr/Pc'}</Label>
            <Input type="number" step="0.05" value={meters || ""} onChange={e => onChangeMeters(parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        {title === 'Dupatta' && (
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground font-bold">Dying (₹/pc)</Label>
            <Input type="number" value={dying || ""} onChange={e => onChangeDying(parseFloat(e.target.value) || 0)} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
