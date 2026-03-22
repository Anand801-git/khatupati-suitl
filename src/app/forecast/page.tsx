'use client';

import { useState, useEffect } from 'react';
import { useKhatupatiStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  Loader2, 
  Sparkles, 
  CalendarDays, 
  Target, 
  IndianRupee, 
  CheckCircle2, 
  History,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { handleDemandForecast } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { format, parseISO } from 'date-fns';

interface ForecastData {
  recommendations: { quality: string; quantity: number; reason: string; confidence: number }[];
  designStyles: string[];
  buyingCalendar: { month: string; action: string; priority: string }[];
  summary: string;
  timestamp: string;
}

export default function DemandForecastPage() {
  const { purchases, isLoaded } = useKhatupatiStore();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [horizon, setHorizon] = useState('3');
  const [budget, setBudget] = useState('500000');
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatest = async () => {
      if (!db) return;
      try {
        const q = query(collection(db, 'forecasts'), orderBy('timestamp', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setForecast(snapshot.docs[0].data() as ForecastData);
        }
      } catch (e) {
        console.error("Failed to fetch latest forecast", e);
      }
    };
    fetchLatest();
  }, [db]);

  const runForecast = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      let latestTrends = "No current trend data available.";
      if (db) {
        const trendQ = query(collection(db, 'trends'), orderBy('timestamp', 'desc'), limit(1));
        const trendSnap = await getDocs(trendQ);
        if (!trendSnap.empty) {
          latestTrends = JSON.stringify(trendSnap.docs[0].data());
        }
      }

      const input = {
        historicalPurchases: JSON.stringify(purchases.slice(0, 20).map((p: any) => ({ q: p.qualityName, d: p.purchaseDate, c: p.piecesCount }))),
        currentMarketTrends: latestTrends,
        horizon: parseInt(horizon),
        budgetLimit: parseFloat(budget)
      };

      const result = await handleDemandForecast(input);
      const forecastWithTime = { ...result, timestamp: new Date().toISOString() };
      
      if (db) {
        await addDoc(collection(db, 'forecasts'), forecastWithTime);
      }
      
      setForecast(forecastWithTime);
      toast({ title: "Forecast Ready", description: "AI has projected your inventory needs." });
    } catch (e) {
      console.error("Demand Forecast Error:", e);
      setError("The AI model failed to generate a forecast. This might be due to a temporary network issue or unusual data. Please try again in a moment.");
      toast({ variant: "destructive", title: "Forecast Failed", description: "Could not generate the demand forecast." });
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isLoaded) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col gap-6 pb-24">
      <Header title="AI Demand Forecaster" className="dashboard-header" />
      
      <main className="container px-4 space-y-6">
        <Card className="border-none shadow-xl bg-[#173880] text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp className="w-32 h-32" /></div>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <Target className="w-5 h-5 text-[#634CCB]" /> Inventory Intelligence
              </h2>
              <p className="text-sm opacity-70">Predict seasonal demand using historical sales and Surat market trends.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
               <div className="space-y-2">
                <p className="text-[10px] font-black uppercase opacity-50">Forecast Horizon</p>
                <Select value={horizon} onValueChange={setHorizon}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white h-12">
                    <SelectValue placeholder="Horizon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Month (Next Cycle)</SelectItem>
                    <SelectItem value="3">3 Months (Next Season)</SelectItem>
                    <SelectItem value="6">6 Months (Half Year)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase opacity-50">Budget Estimate (₹)</p>
                <Input 
                  type="number" 
                  value={budget} 
                  onChange={e => setBudget(e.target.value)}
                  className="bg-white/10 border-white/20 text-white h-12 placeholder:text-white/30"
                  placeholder="e.g. 500000"
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={runForecast} 
                  disabled={isGenerating}
                  className="w-full bg-[#634CCB] hover:bg-[#634CCB]/90 text-white font-bold h-12 rounded-xl shadow-lg"
                >
                  {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Projecting...</> : 'Generate Forecast'}
                </Button>
              </div>
            </div>

            {forecast?.timestamp && (
              <p className="text-[10px] uppercase font-black opacity-40 flex items-center gap-1">
                <History className="w-3 h-3" /> Last Forecast: {format(parseISO(forecast.timestamp), 'dd MMM, hh:mm a')}
              </p>
            )}
          </CardContent>
        </Card>

        {error && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-6 text-center space-y-4">
              <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
              <h3 className="font-bold">Forecast Failed</h3>
              <p className="text-xs text-muted-foreground">{error}</p>
              <Button onClick={runForecast} disabled={isGenerating} variant="destructive" className="w-full sm:w-auto">
                {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Retrying...</> : 'Retry Forecast'}
              </Button>
            </CardContent>
          </Card>
        )}

        {!forecast && !isGenerating && !error && (
          <div className="py-20 text-center text-muted-foreground space-y-2">
            <ShoppingBag className="w-12 h-12 mx-auto opacity-10" />
            <p className="font-bold uppercase tracking-widest text-xs">No Active Forecast</p>
            <p className="text-xs">Adjust parameters and tap Generate to see recommendations.</p>
          </div>
        )}

        {forecast && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up">
            <div className="lg:col-span-2 space-y-6">
              <section className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Strategy Overview
                </h3>
                <Card className="border-none bg-muted/30">
                  <CardContent className="p-4 italic text-sm leading-relaxed text-muted-foreground">
                    "{forecast.summary}"
                  </CardContent>
                </Card>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#173880] flex items-center gap-2 px-1">
                  <ShoppingBag className="w-3.5 h-3.5" /> Recommended Procurement
                </h3>
                <div className="grid gap-4">
                  {forecast.recommendations.map((rec: any, i: number) => (
                    <Card key={i} className="border-l-4 border-l-[#173880] shadow-sm overflow-hidden">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-lg">{rec.quality}</h4>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rec.reason}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="secondary" className="bg-[#173880]/10 text-[#173880] border-none font-black text-xs">
                              {rec.quantity} Pcs
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-bold uppercase text-muted-foreground">
                            <span>Confidence Score</span>
                            <span className={rec.confidence > 80 ? 'text-green-600' : 'text-amber-600'}>{rec.confidence}%</span>
                          </div>
                          <Progress value={rec.confidence} className="h-1.5" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <Card className="shadow-lg border-none">
                <CardHeader className="bg-[#F9FAFC] border-b">
                  <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[#173880]" /> Buying Roadmap
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {forecast.buyingCalendar.map((item: any, i: number) => (
                      <div key={i} className="p-4 flex gap-4 hover:bg-muted/10 transition-colors">
                        <div className="text-center w-12 shrink-0">
                          <p className="text-[10px] font-black uppercase text-muted-foreground leading-none">{item.month.substring(0, 3)}</p>
                          <p className="text-lg font-black text-[#173880] mt-1">{String(i+1).padStart(2, '0')}</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold">{item.action}</p>
                            <Badge className={`text-[8px] h-4 px-1.5 border-none uppercase ${
                              item.priority === 'High' ? 'bg-red-500' : item.priority === 'Medium' ? 'bg-amber-500' : 'bg-blue-500'
                            }`}>
                              {item.priority}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Priority procurement window.</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#634CCB]" /> Trending Styles
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {forecast.designStyles.map((style: any, i: number) => (
                      <Badge key={i} variant="outline" className="border-[#634CCB]/30 text-[#634CCB] px-3 py-1 font-bold text-[10px]">
                        {style}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="p-4 bg-green-50 border border-green-100 rounded-xl flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-[10px] text-green-800 leading-relaxed">
                  This forecast uses <strong>Surat Market Intelligence</strong> and your historical velocity to minimize dead-stock risk.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
