'use client';

import { useState, useEffect, useMemo } from 'react';
import { useKhatupatiStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2, 
  MessageCircle, 
  ClipboardList, 
  TrendingDown, 
  History,
  ArrowRight,
  Send
} from 'lucide-react';
import { handleProductionAgent } from '@/app/actions';
import { getLotStats } from '@/lib/lot-utils';
import { differenceInDays, parseISO, format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface BriefingData {
  urgentAlerts: any[];
  costWarnings: any[];
  recommendedActions: any[];
  dailySummary: string;
  whatsappDrafts: any[];
  timestamp: string;
}

export default function ProductionBriefing() {
  const { purchases, allAssignments, calculateSuratMath, isLoaded } = useKhatupatiStore();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('lastProductionBriefing');
    if (saved) {
      try {
        setBriefing(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load saved briefing", e);
        localStorage.removeItem('lastProductionBriefing');
      }
    }
  }, []);

  const runBriefing = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const now = new Date();
      const lotDetails = purchases.map((p: any) => {
        const related = allAssignments.filter((a: any) => a.lotId === p.id);
        const landingCost = calculateSuratMath(p, related);
        const stats = getLotStats(p, related);
        return {
          id: p.id,
          qualityName: p.qualityName,
          piecesCount: p.piecesCount,
          purchaseDate: p.purchaseDate,
          state: p.state,
          landingCost: landingCost.toFixed(2),
          stats: {
            warehouse: stats.inWhse,
            embroidery: stats.atEmb,
            va: stats.atVA,
            finished: stats.finished
          }
        };
      });

      const assignmentDetails = allAssignments.map((a: any) => ({
        vendor: a.vendorName,
        type: a.processType,
        lot: purchases.find((p: any) => p.id === a.lotId)?.qualityName || 'Unknown',
        sent: a.sentDate,
        received: a.receivedDate || 'Pending',
        rate: a.rate,
        isDelayed: !a.receivedDate && differenceInDays(now, parseISO(a.sentDate)) > 15,
        daysOut: differenceInDays(now, parseISO(a.sentDate))
      }));

      const vendorStockSummary: Record<string, number> = {};
      allAssignments.forEach((j: any) => {
        if (!j.receivedDate) {
          const qty = Math.max(...j.components.map((c: any) => c.quantity), 0);
          vendorStockSummary[j.vendorName] = (vendorStockSummary[j.vendorName] || 0) + qty;
        }
      });

      const context = JSON.stringify({
        summary: {
          totalLots: purchases.length,
          delayedJobs: assignmentDetails.filter((a: any) => a.isDelayed).length,
        },
        vendorStock: vendorStockSummary,
        allLots: lotDetails,
        allAssignments: assignmentDetails
      });

      const result = await handleProductionAgent({ context });
      const briefingWithTime = { ...result, timestamp: new Date().toISOString() };
      
      setBriefing(briefingWithTime);
      localStorage.setItem('lastProductionBriefing', JSON.stringify(briefingWithTime));
      localStorage.setItem('briefingAlertCount', String(result.urgentAlerts.length));
      
      toast({ title: "Briefing Complete", description: "AI Agent has analyzed your production floor." });
    } catch (e) {
      console.error("Briefing Generation Error:", e);
      setError("The AI agent failed to generate the briefing. This could be a temporary issue with the model or network. Please try again.");
      toast({ variant: "destructive", title: "AI Briefing Failed", description: "Could not generate the production briefing." });
    } finally {
      setIsRunning(false);
    }
  };

  const handleWhatsApp = (vendor: string, message: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (!isLoaded) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col gap-6 pb-24">
      <Header title="Daily Production Briefing" className="dashboard-header" />
      
      <main className="container px-4 space-y-6">
        <Card className="bg-primary text-white border-none overflow-hidden shadow-xl">
          <CardContent className="p-6 flex flex-col items-center text-center gap-4">
            <Sparkles className="w-12 h-12 text-secondary animate-pulse" />
            <div className="space-y-1">
              <h2 className="text-xl font-black uppercase tracking-tight">AI Production Agent</h2>
              <p className="text-sm opacity-80">Analyze delays, costs, and priority actions across the floor.</p>
            </div>
            <Button 
              onClick={runBriefing} 
              disabled={isRunning}
              className="w-full bg-white text-primary hover:bg-white/90 font-bold h-12 rounded-xl"
            >
              {isRunning ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analyzing Operations...</> : 'Run Morning Briefing'}
            </Button>
            {briefing?.timestamp && (
              <p className="text-[10px] uppercase font-bold opacity-50 flex items-center gap-1">
                <History className="w-3 h-3" /> Last Run: {format(parseISO(briefing.timestamp), 'dd MMM, hh:mm a')}
              </p>
            )}
          </CardContent>
        </Card>

        {error && (
            <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-6 text-center space-y-4">
                    <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
                    <h3 className="font-bold">Briefing Failed</h3>
                    <p className="text-xs text-muted-foreground">{error}</p>
                    <Button onClick={runBriefing} disabled={isRunning} variant="destructive" className="w-full sm:w-auto">
                        {isRunning ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Retrying...</> : 'Retry Now'}
                    </Button>
                </CardContent>
            </Card>
        )}

        {!briefing && !isRunning && !error && (
          <div className="py-20 text-center text-muted-foreground space-y-2">
            <ClipboardList className="w-12 h-12 mx-auto opacity-10" />
            <p className="font-bold uppercase tracking-widest text-xs">No Recent Briefing</p>
            <p className="text-xs">Tap the button above to start your daily audit.</p>
          </div>
        )}

        {briefing && (
          <div className="space-y-6 animate-fade-up">
            <section className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Agent Summary
              </h3>
              <Card className="border-none bg-muted/30">
                <CardContent className="p-4 italic text-sm leading-relaxed text-muted-foreground">
                  "{briefing.dailySummary}"
                </CardContent>
              </Card>
            </section>

            {briefing.urgentAlerts.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-red-600 flex items-center gap-2 px-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Urgent Delay Alerts ({briefing.urgentAlerts.length})
                </h3>
                <div className="grid gap-3">
                  {briefing.urgentAlerts.map((alert, i) => (
                    <Card key={i} className="border-l-4 border-l-red-500 shadow-sm">
                      <CardContent className="p-4 flex justify-between items-center">
                        <div>
                          <p className="text-xs font-black text-red-600 uppercase">{alert.severity} Severity</p>
                          <h4 className="font-bold text-sm">{alert.vendorName}</h4>
                          <p className="text-[10px] text-muted-foreground">{alert.lotName} - {alert.daysDelayed} days delayed</p>
                        </div>
                        <Badge variant="destructive" className="rounded-full h-6 px-2 text-[10px]">{alert.daysDelayed}d</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 px-1">
                <ArrowRight className="w-3.5 h-3.5" /> Priority Next Actions
              </h3>
              <div className="space-y-2">
                {briefing.recommendedActions.sort((a,b) => a.priority - b.priority).map((action, i) => (
                  <Card key={i} className="border-none shadow-sm bg-blue-50/50">
                    <CardContent className="p-4 flex gap-4">
                      <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-black text-xs shrink-0">{action.priority}</div>
                      <div>
                        <p className="font-bold text-sm text-primary">{action.action}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{action.reason}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {briefing.costWarnings.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-amber-600 flex items-center gap-2 px-1">
                  <TrendingDown className="w-3.5 h-3.5" /> Cost Anomalies
                </h3>
                <div className="space-y-2">
                  {briefing.costWarnings.map((warning, i) => (
                    <Card key={i} className="border-amber-200 bg-amber-50/30">
                      <CardContent className="p-4">
                        <p className="text-[10px] font-black uppercase text-amber-700">{warning.lotName}</p>
                        <p className="text-sm font-bold mt-1">{warning.issue}</p>
                        <div className="mt-2 p-2 bg-white/50 rounded border border-amber-100 text-[10px] italic">
                          💡 Suggestion: {warning.suggestedFix}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {briefing.whatsappDrafts.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-green-600 flex items-center gap-2 px-1">
                  <MessageCircle className="w-3.5 h-3.5" /> Vendor Follow-ups
                </h3>
                <div className="space-y-3">
                  {briefing.whatsappDrafts.map((draft, i) => (
                    <Card key={i} className="border-none shadow-md overflow-hidden">
                      <CardHeader className="bg-green-50 py-2 border-b">
                        <CardTitle className="text-[10px] font-black uppercase text-green-700 flex justify-between items-center">
                          Draft for {draft.vendorName}
                          <Send className="w-3 h-3" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">{draft.message}</p>
                        <Button 
                          onClick={() => handleWhatsApp(draft.vendorName, draft.message)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white gap-2 h-10 text-xs"
                        >
                          <MessageCircle className="w-4 h-4" /> Send on WhatsApp
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
