
'use client';

import { useState, useEffect } from 'react';
import { useKhatupatiStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Search, 
  Loader2, 
  Sparkles, 
  Palette, 
  Tag, 
  Scissors, 
  IndianRupee, 
  CheckCircle2, 
  AlertCircle,
  History,
  LayoutGrid,
  AlertTriangle
} from 'lucide-react';
import { askLocalAI } from '@/lib/ai/local-runner';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';

interface MarketTrendData {
  trendingColors: { name: string; hex: string }[];
  designStyles: string[];
  fabricTypes: string[];
  recommendedPricePoints: string;
  marketSummary: string;
  timestamp: string;
}

export default function MarketTrends() {
  const { purchases, isLoaded } = useKhatupatiStore();
  const { toast } = useToast();
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [trendData, setTrendData] = useState<MarketTrendData | null>(null);
  const [comparison, setComparison] = useState<{ matched: string[], missing: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('lastTrendAnalysis');
    if (saved) {
      try {
        setTrendData(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('lastTrendAnalysis');
      }
    }
  }, []);

  const runAnalysis = async () => {
    setIsSearching(true);
    setError(null);
    setComparison(null);
    try {
      const systemPrompt = `You are a fashion market researcher in Surat. Analyze the user's query and provide current trends for ethnic wear. Return STRICT JSON matching this format exactly: { "trendingColors": [{ "name": "Color Name", "hex": "#HEXCODE" }], "designStyles": ["Style 1"], "fabricTypes": ["Fabric 1"], "recommendedPricePoints": "₹1500 - ₹3000", "marketSummary": "Short description" }. Return ONLY valid JSON.`;
      
      const rawResult = await askLocalAI(systemPrompt, searchQuery);
      
      let result;
      try {
        const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
        result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawResult);
      } catch (e) {
        throw new Error("Local AI failed to generate valid JSON.");
      }

      const trendWithTime = { ...result, timestamp: new Date().toISOString() };
      
      localStorage.setItem('lastTrendAnalysis', JSON.stringify(trendWithTime));
      setTrendData(trendWithTime);
      toast({ title: "Analysis Complete", description: "Fresh market trends identified on-device." });
    } catch (e) {
      console.error("Market Trend Analysis Error:", e);
      setError("The AI model could not complete the market trend analysis. This could be due to a network issue or the complexity of the query. Please simplify your search or try again later.");
      toast({ variant: "destructive", title: "AI Trend Analysis Failed", description: "Could not research market trends." });
    } finally {
      setIsSearching(false);
    }
  };

  const compareWithStock = () => {
    if (!trendData) return;
    
    const trendingTags = [...trendData.designStyles, ...trendData.fabricTypes, ...trendData.trendingColors.map(c => c.name)].map(t => t.toLowerCase());
    const myTags = purchases.flatMap(p => [
      ...(p.tags || []),
      p.range || '',
      p.kurta.qualityName,
      p.salwar.qualityName,
      p.dupatta.qualityName
    ]).filter(Boolean).map(t => t.toLowerCase());

    const matched = Array.from(new Set(trendingTags.filter(t => myTags.some(myT => myT.includes(t) || t.includes(myT)))));
    const missing = Array.from(new Set(trendingTags.filter(t => !matched.includes(t))));

    setComparison({ matched, missing });
    toast({ title: "Comparison Complete", description: `Matched ${matched.length} current market trends in your stock.` });
  };

  if (!isLoaded) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col gap-6 pb-24">
      <Header title="Market Trend Analyser" className="lots-gallery-header" />
      
      <main className="container px-4 space-y-6">
        <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Sparkles className="w-32 h-32" /></div>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-secondary" /> AI Market Intelligence
              </h2>
              <p className="text-sm opacity-70">Research trending fabrics, colors, and design styles in Surat.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 relative z-10">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="e.g. Silk suits for wedding season..." 
                  className="bg-slate-800 border-slate-700 text-white pl-10 h-12"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <Button 
                onClick={runAnalysis} 
                disabled={isSearching}
                className="bg-secondary hover:bg-secondary/90 text-white font-bold h-12 px-8 rounded-xl"
              >
                {isSearching ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Researching...</> : 'Search Trends'}
              </Button>
            </div>

            {trendData?.timestamp && (
              <p className="text-[10px] uppercase font-black opacity-40 flex items-center gap-1">
                <History className="w-3 h-3" /> Trends Last Updated: {format(parseISO(trendData.timestamp), 'dd MMM, hh:mm a')}
              </p>
            )}
          </CardContent>
        </Card>

        {error && (
            <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-6 text-center space-y-4">
                    <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
                    <h3 className="font-bold">Trend Analysis Failed</h3>
                    <p className="text-xs text-muted-foreground">{error}</p>
                    <Button onClick={runAnalysis} disabled={isSearching} variant="destructive" className="w-full sm:w-auto">
                        {isSearching ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Retrying...</> : 'Retry Analysis'}
                    </Button>
                </CardContent>
            </Card>
        )}

        {!trendData && !isSearching && !error && (
          <div className="py-20 text-center text-muted-foreground space-y-2">
            <LayoutGrid className="w-12 h-12 mx-auto opacity-10" />
            <p className="font-bold uppercase tracking-widest text-xs">No Trend Data</p>
            <p className="text-xs">Type a query above to analyze the current market landscape.</p>
          </div>
        )}

        {trendData && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up">
            <div className="lg:col-span-2 space-y-6">
              <section className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Surat Market Insight
                </h3>
                <Card className="border-none bg-muted/30">
                  <CardContent className="p-4 italic text-sm leading-relaxed text-muted-foreground">
                    "{trendData.marketSummary}"
                  </CardContent>
                </Card>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-sm">
                  <CardHeader className="pb-3"><CardTitle className="text-sm font-bold flex items-center gap-2"><Palette className="w-4 h-4" /> Trending Colors</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-4">
                      {trendData.trendingColors.map((color, i) => (
                        <div key={i} className="flex flex-col items-center gap-1.5">
                          <div className="w-12 h-12 rounded-full border shadow-sm" style={{ backgroundColor: color.hex }} />
                          <p className="text-[10px] font-bold text-center w-16 truncate">{color.name}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="pb-3"><CardTitle className="text-sm font-bold flex items-center gap-2"><Scissors className="w-4 h-4" /> Hot Fabric Types</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {trendData.fabricTypes.map((fabric, i) => (
                        <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700 border-none px-3 py-1">{fabric}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-sm font-bold flex items-center gap-2"><Tag className="w-4 h-4" /> Popular Design Styles</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {trendData.designStyles.map((style, i) => (
                      <Badge key={i} variant="outline" className="border-slate-200 text-slate-600 px-3 py-1 font-bold">{style}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-green-50 border-green-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-black uppercase text-green-800 tracking-widest flex items-center gap-2">
                    <IndianRupee className="w-3.5 h-3.5" /> Price Benchmarks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-bold text-green-900">{trendData.recommendedPricePoints}</p>
                  <p className="text-[10px] text-green-700/70 mt-2 italic">Based on current Surat wholesale volume.</p>
                </CardContent>
              </Card>

              <Button 
                onClick={compareWithStock} 
                className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl gap-2 shadow-lg"
              >
                <LayoutGrid className="w-5 h-5" /> Compare with My Stock
              </Button>

              {comparison && (
                <Card className="border-primary/20 shadow-lg animate-fade-up">
                  <CardHeader className="bg-primary/5 pb-3">
                    <CardTitle className="text-sm font-bold">Trend Compatibility</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold">Stock vs Market Analysis</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-6">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Winning Trends in Stock ({comparison.matched.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.matched.length > 0 ? comparison.matched.map(t => (
                          <Badge key={t} className="bg-green-100 text-green-700 border-none text-[9px]">{t}</Badge>
                        )) : <p className="text-[10px] italic text-muted-foreground">No direct matches found.</p>}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Missed Trend Gaps ({comparison.missing.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {comparison.missing.map(t => (
                          <Badge key={t} variant="outline" className="text-[9px] opacity-60">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
