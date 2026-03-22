
"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useKhatupatiStore } from '@/lib/store';
import { Purchase } from '@/lib/types';
import { Upload, X, Save, ArrowLeft, Trash2, CalendarIcon, Loader2, Tag, Palette, ScanSearch } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { resizeImage } from '@/lib/utils';
import { handleAiDesignInsight } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

function EditPurchaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { purchases, updatePurchase, directory, deletePurchase, isLoaded } = useKhatupatiStore();
  const [mounted, setMounted] = useState(false);
  const [designPhoto, setDesignPhoto] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [formData, setFormData] = useState({
    piecesCount: 0,
    purchaseDate: '',
    range: '',
    tagsInput: '',
    kQuality: '', kSupplier: '', kRate: 0, kMeters: 0,
    sQuality: '', sSupplier: '', sRate: 0, sMeters: 0,
    dQuality: '', dSupplier: '', dRate: 0, dMeters: 0, dDying: 0,
    lQuality: '', lSupplier: '', lRate: 0, lMeters: 0,
  });

  const purchase = useMemo(() => purchases.find(p => p.id === id), [purchases, id]);
  const qualities = useMemo(() => directory.filter(e => e.category === 'Fabric'), [directory]);

  useEffect(() => {
    setMounted(true);
    if (purchase) {
      setDesignPhoto(purchase.designPhoto || null);
      setFormData({
        piecesCount: purchase.piecesCount,
        purchaseDate: purchase.purchaseDate || '',
        range: purchase.range || '',
        tagsInput: purchase.tags?.join(', ') || '',
        kQuality: purchase.kurta.qualityName,
        kSupplier: purchase.kurta.supplierName,
        kRate: purchase.kurta.ratePerMeter,
        kMeters: purchase.kurta.metersPerPiece,
        sQuality: purchase.salwar.qualityName,
        sSupplier: purchase.salwar.supplierName,
        sRate: purchase.salwar.ratePerMeter,
        sMeters: purchase.salwar.metersPerPiece,
        dQuality: purchase.dupatta.qualityName,
        dSupplier: purchase.dupatta.supplierName,
        dRate: purchase.dupatta.ratePerMeter,
        dMeters: purchase.dupatta.metersPerPiece,
        dDying: purchase.dupatta.dyingCharges || 0,
        lQuality: purchase.lace?.qualityName || '',
        lSupplier: purchase.lace?.supplierName || '',
        lRate: purchase.lace?.ratePerMeter || 0,
        lMeters: purchase.lace?.metersPerPiece || 0,
      });
    }
  }, [purchase]);

  if (!mounted || !isLoaded) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  if (!purchase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground">Purchase not found.</p>
        <Link href="/purchases">
          <Button>Back to History</Button>
        </Link>
      </div>
    );
  }

  const runAiAnalysis = async (photoUri: string) => {
    setIsAnalyzing(true);
    try {
      const result = await handleAiDesignInsight({ 
        photoDataUri: photoUri,
        description: formData.kQuality 
      });
      
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

  const removePhoto = () => {
    setDesignPhoto(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      const existing = qualities.find(q => q.name.toLowerCase().trim() === name.toLowerCase().trim() && q.subCategory === type);
      
      if (existing) {
        (next as any)[fields.s] = existing.supplierName || '';
        (next as any)[fields.r] = existing.rate || 0;
        (next as any)[fields.m] = existing.meters || 0;
        if (type === 'Dupatta') {
          (next as any)[fields.dy] = existing.dying || 0;
        }
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const tags = formData.tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    const updatedPurchase: Partial<Purchase> & { id: string } = {
      id: purchase.id,
      qualityName: formData.kQuality,
      piecesCount: formData.piecesCount || 0,
      purchaseDate: formData.purchaseDate,
      range: formData.range,
      tags: tags.length > 0 ? tags : undefined,
      designPhoto: designPhoto || undefined,
      kurta: { 
        qualityName: formData.kQuality, 
        supplierName: formData.kSupplier,
        ratePerMeter: formData.kRate || 0, 
        metersPerPiece: formData.kMeters || 0 
      },
      salwar: { 
        qualityName: formData.sQuality, 
        supplierName: formData.sSupplier,
        ratePerMeter: formData.sRate || 0, 
        metersPerPiece: formData.sMeters || 0 
      },
      dupatta: { 
        qualityName: formData.dQuality, 
        supplierName: formData.dSupplier,
        ratePerMeter: formData.dRate || 0, 
        metersPerPiece: formData.dMeters || 0, 
        dyingCharges: formData.dDying || 0 
      },
      lace: {
        qualityName: formData.lQuality,
        supplierName: formData.lSupplier,
        ratePerMeter: formData.lRate || 0,
        metersPerPiece: formData.lMeters || 0
      },
    };
    updatePurchase(updatedPurchase);
    router.push(`/purchases/view?id=${purchase.id}`);
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      <Header title={`Edit ${purchase.qualityName}`} />
      <main className="container px-4">
        <div className="mb-6 flex justify-between items-center">
          <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10 gap-2" onClick={() => { if(confirm("Delete lot?")) { deletePurchase(purchase.id); router.push('/purchases'); } }}>
            <Trash2 className="w-4 h-4" /> Delete Lot
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg flex justify-between items-center">
                    Design Photo
                    {isAnalyzing && (
                      <Badge className="bg-secondary animate-pulse gap-1.5 border-none">
                        <ScanSearch className="w-3 h-3" /> AI Scanning...
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <div 
                    className="relative w-full aspect-square bg-muted rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
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
                        <Button 
                          type="button"
                          variant="destructive" 
                          size="icon" 
                          className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg z-10"
                          onClick={(e) => { e.stopPropagation(); removePhoto(); }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-muted-foreground p-6 text-center">
                        <Upload className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-sm font-medium">Click to upload design photo</p>
                      </div>
                    )}
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">General Info</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <CalendarIcon className="w-3 h-3" /> Purchase Date
                    </Label>
                    <Input type="date" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Pieces</Label>
                    <Input type="number" value={formData.piecesCount} onChange={e => setFormData({...formData, piecesCount: parseInt(e.target.value) || 0})} />
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
                <FabricSection title="Kurta" quality={formData.kQuality} supplier={formData.kSupplier} rate={formData.kRate} meters={formData.kMeters} masterQualities={qualities.filter(q => q.subCategory === 'Kurta')} piecesCount={formData.piecesCount} onChangeQuality={(val: string) => handleQualitySelect('Kurta', val)} onChangeSupplier={(val: string) => setFormData({...formData, kSupplier: val})} onChangeRate={(val: number) => setFormData({...formData, kRate: val})} onChangeMeters={(val: number) => setFormData({...formData, kMeters: val})} />
                <FabricSection title="Salwar" quality={formData.sQuality} supplier={formData.sSupplier} rate={formData.sRate} meters={formData.sMeters} masterQualities={qualities.filter(q => q.subCategory === 'Salwar')} piecesCount={formData.piecesCount} onChangeQuality={(val: string) => handleQualitySelect('Salwar', val)} onChangeSupplier={(val: string) => setFormData({...formData, sSupplier: val})} onChangeRate={(val: number) => setFormData({...formData, sRate: val})} onChangeMeters={(val: number) => setFormData({...formData, sMeters: val})} />
                <FabricSection title="Dupatta" quality={formData.dQuality} supplier={formData.dSupplier} rate={formData.dRate} meters={formData.dMeters} dying={formData.dDying} masterQualities={qualities.filter(q => q.subCategory === 'Dupatta')} piecesCount={formData.piecesCount} onChangeQuality={(val: string) => handleQualitySelect('Dupatta', val)} onChangeSupplier={(val: string) => setFormData({...formData, dSupplier: val})} onChangeRate={(val: number) => setFormData({...formData, dRate: val})} onChangeMeters={(val: number) => setFormData({...formData, dMeters: val})} onChangeDying={(val: number) => setFormData({...formData, dDying: val})} />
                <FabricSection title="Lace" quality={formData.lQuality} supplier={formData.lSupplier} rate={formData.lRate} meters={formData.lMeters} masterQualities={qualities.filter(q => q.subCategory === 'Lace')} piecesCount={formData.piecesCount} onChangeQuality={(val: string) => handleQualitySelect('Lace', val)} onChangeSupplier={(val: string) => setFormData({...formData, lSupplier: val})} onChangeRate={(val: number) => setFormData({...formData, lRate: val})} onChangeMeters={(val: number) => setFormData({...formData, lMeters: val})} />
              </div>
              <Button type="submit" className="w-full h-14 text-lg font-bold shadow-xl bg-secondary hover:bg-secondary/90">
                <Save className="w-5 h-5 mr-2" /> Save Changes
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function EditPurchase() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <EditPurchaseContent />
    </Suspense>
  );
}

function FabricSection({ title, quality, supplier, rate, meters, dying, masterQualities, piecesCount, onChangeQuality, onChangeSupplier, onChangeRate, onChangeMeters, onChangeDying }: any) {
  const cost = title === 'Lace' ? (((meters || 0) / (piecesCount || 1)) * (rate || 0)) : (((rate || 0) * (meters || 0)) + (dying || 0));
  return (
    <Card className="h-full">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <CardTitle className="text-md flex justify-between items-center">
          <span className="font-headline font-bold uppercase tracking-tight">{title}</span>
          <Badge variant="outline" className="text-primary border-primary bg-background font-mono">₹{cost.toFixed(2)}/pc</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Quality Name</Label>
          <Input value={quality} list={`list-${title}`} onChange={e => onChangeQuality(e.target.value)} placeholder={`Select ${title}...`} required />
          <datalist id={`list-${title}`}>{masterQualities.map((q: any) => <option key={q.id} value={q.name}>{q.supplierName}</option>)}</datalist>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Supplier Name</Label>
          <Input value={supplier} onChange={e => onChangeSupplier(e.target.value)} placeholder="Supplier" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Rate (₹/m)</Label>
            <Input type="number" value={rate || ""} onChange={e => onChangeRate(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase font-bold tracking-widest">{title === 'Lace' ? 'Total Mtr' : 'Mtr/Pc'}</Label>
            <Input type="number" step="0.05" value={meters || ""} onChange={e => onChangeMeters(parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        {title === 'Dupatta' && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Dying (₹/pc)</Label>
            <Input type="number" value={dying || ""} onChange={e => onChangeDying(parseFloat(e.target.value) || 0)} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
