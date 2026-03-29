'use client';

import { useKhatupatiStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, HardDrive, ArrowLeft, Trash2, Smartphone, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';

export default function StorageSettings() {
  const router = useRouter();
  const { purchases, allAssignments, directory } = useKhatupatiStore();
  const { toast } = useToast();
  
  const [dbSize, setDbSize] = useState<string>('Calculating...');
  const [mediaSize, setMediaSize] = useState<string>('Calculating...');
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    // Calculate DB Size roughly from stringified JSON representation of in-memory data
    // since accessing raw SQLite file size via plugin is complex
    const roughDbBytes = new TextEncoder().encode(
      JSON.stringify(purchases) + JSON.stringify(allAssignments) + JSON.stringify(directory)
    ).length;
    setDbSize((roughDbBytes / 1024 / 1024).toFixed(2) + ' MB');

    // Calculate Media Size
    const calcMedia = async () => {
      try {
        const result = await Filesystem.readdir({
          path: '',
          directory: Directory.Data,
        });
        
        // Sum sizes of files starting with 'media_' or 'lot_'
        let totalMediaBytes = 0;
        for (const file of result.files) {
          if (file.name.startsWith('lot_') || file.name.startsWith('media_')) {
            totalMediaBytes += file.size || 0;
          }
        }
        setMediaSize((totalMediaBytes / 1024 / 1024).toFixed(2) + ' MB');
      } catch (e) {
        setMediaSize('Unknown');
      }
    };

    if (Capacitor.isNativePlatform()) {
      calcMedia();
    } else {
      setMediaSize('N/A (Web App)');
    }
  }, [purchases, allAssignments, directory]);

  const handleClearCache = async () => {
    if (!confirm("Are you sure? This will not delete data, but clears temporary UI state.")) return;
    setIsClearing(true);
    try {
      localStorage.removeItem('briefingHistory');
      localStorage.removeItem('marketTrendsRaw');
      localStorage.removeItem('demandForecastCache');
      toast({ title: "Cache Cleared", description: "Browser temporary memory freed up." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Could not clear cache." });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <Header title="Device Storage" />
      <main className="container px-4 flex flex-col gap-6">
        <Button variant="ghost" className="w-fit gap-2 -ml-2" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" /> Back to App
        </Button>

        <section className="grid gap-4">
          <Card className="border-2 border-primary/10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-headline font-black flex justify-between items-center">
                <span><Database className="w-5 h-5 inline-block mr-2 text-primary" /> SQLite Database</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 mb-4">
                <span className="text-4xl font-black text-primary">{dbSize}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">
                <div className="bg-muted p-2 rounded-lg"><span className="text-black block text-base">{purchases.length}</span> Lots</div>
                <div className="bg-muted p-2 rounded-lg"><span className="text-black block text-base">{allAssignments.length}</span> Jobs</div>
                <div className="bg-muted p-2 rounded-lg"><span className="text-black block text-base">{directory.length}</span> Masters</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-secondary/20 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-headline font-black flex justify-between items-center">
                <span><HardDrive className="w-5 h-5 inline-block mr-2 text-secondary" /> Media & Photos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-4xl font-black text-secondary">{mediaSize}</span>
                <span className="text-sm pb-1 text-muted-foreground font-bold">Filesystem</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Saved photos of designs and documents. No cloud backups.</p>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-muted overflow-hidden">
             <CardHeader className="pb-2">
              <CardTitle className="text-xl font-headline font-black flex justify-between items-center">
                <span><Smartphone className="w-5 h-5 inline-block mr-2 text-muted-foreground" /> Memory Cache</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4 font-bold">Local AI inferences and generated reports.</p>
              <Button variant="outline" className="w-full gap-2 border-primary/20 text-primary hover:bg-primary/5" onClick={handleClearCache} disabled={isClearing}>
                {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Clear AI Cache
              </Button>
            </CardContent>
          </Card>
        </section>

        <div className="text-center mt-6">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 uppercase font-black tracking-widest px-4 py-1 flex w-fit mx-auto items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> 100% Offline Mode Active
            </Badge>
        </div>
      </main>
    </div>
  );
}
