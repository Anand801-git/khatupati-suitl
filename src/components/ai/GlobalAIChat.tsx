
"use client";

import { useState, useRef, useEffect } from 'react';
import { useKhatupatiStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Sparkles, Send, Loader2, Bot, AlertTriangle } from 'lucide-react';
import { handleProductionAssistant } from '@/app/actions';
import { getLotStats } from '@/lib/lot-utils';
import { differenceInDays, parseISO, isValid } from 'date-fns';

interface Message { role: 'user' | 'ai'; text: string; isError?: boolean; }

export function GlobalAIChat() {
  const { purchases, allAssignments, calculateSuratMath } = useKhatupatiStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUserQuery, setLastUserQuery] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (query?: string) => {
    const userQuery = query || input.trim();
    if (!userQuery || isLoading) return;

    setIsLoading(true);
    if (!query) {
        setMessages(prev => [...prev.filter(m => !m.isError), { role: 'user', text: userQuery }]);
        setInput('');
    }
    setLastUserQuery(userQuery);

    try {
      const now = new Date();
      const lotDetails = purchases.map(p => {
        const related = allAssignments.filter(a => a.lotId === p.id);
        const landingCost = calculateSuratMath(p, related);
        const stats = getLotStats(p, related);
        return {
          id: p.id,
          qualityName: p.qualityName,
          piecesCount: p.piecesCount,
          purchaseDate: p.purchaseDate,
          state: p.state,
          range: p.range || 'N/A',
          tags: p.tags || [],
          landingCost: landingCost.toFixed(2),
          stats: {
            warehouse: stats.inWhse,
            embroidery: stats.atEmb,
            va: stats.atVA,
            finished: stats.finished
          }
        };
      });

      const assignmentDetails = allAssignments.map(a => {
        const sentDate = a.sentDate ? parseISO(a.sentDate) : null;
        const isDelayed = sentDate && isValid(sentDate) ? !a.receivedDate && differenceInDays(now, sentDate) > 15 : false;

        return {
          vendor: a.vendorName,
          type: a.processType,
          components: a.components.map(c => ({ type: c.type, qty: c.quantity })),
          sent: a.sentDate,
          received: a.receivedDate || 'Pending',
          rate: a.rate,
          challan: a.challanNumber || 'N/A',
          isDelayed
        };
      });

      const totalPiecesByStage = lotDetails.reduce((acc, l) => ({
        warehouse: acc.warehouse + l.stats.warehouse,
        embroidery: acc.embroidery + l.stats.embroidery,
        va: acc.va + l.stats.va,
        finished: acc.finished + l.stats.finished
      }), { warehouse: 0, embroidery: 0, va: 0, finished: 0 });

      const vendorVolumeMap = allAssignments.reduce((acc, a) => {
        const qty = Math.max(...a.components.map(c => c.quantity), 0);
        acc[a.vendorName] = (acc[a.vendorName] || 0) + qty;
        return acc;
      }, {} as Record<string, number>);

      const topVendors = Object.entries(vendorVolumeMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, qty]) => ({ name, totalPiecesProcessed: qty }));

      const topExpensiveLots = [...lotDetails]
        .sort((a, b) => parseFloat(b.landingCost) - parseFloat(a.landingCost))
        .slice(0, 3)
        .map(l => ({ name: l.qualityName, cost: l.landingCost }));

      const context = JSON.stringify({
        summary: {
          totalPiecesByStage,
          delayedJobsCount: assignmentDetails.filter(a => a.isDelayed).length,
          topExpensiveLots,
          topVendorsByThroughput: topVendors
        },
        allLots: lotDetails,
        allAssignments: assignmentDetails
      });

      const result = await handleProductionAssistant({ query: userQuery, context });
      setMessages(prev => [...prev.filter(m => !m.isError), { role: 'ai', text: result.response }]);
    } catch (e) {
      console.error("AI Production Assistant Error:", e);
      setMessages(prev => [...prev.filter(m => !m.isError), {
        role: 'ai',
        text: "Sorry, I wasn't able to process that request. The AI model might be temporarily unavailable.",
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 bg-primary hover:bg-primary/90 text-white border-none no-print" size="icon">
          <Sparkles className="h-6 w-6 animate-pulse" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-6 border-b bg-primary/5">
          <SheetTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" /> Khatupati AI Manager
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <p className="text-sm font-bold uppercase tracking-widest opacity-30">Production Assistant</p>
                <p className="text-xs mt-2">Ask me about pending lots, vendor stock, or estimated landing costs.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : (msg.isError ? 'bg-destructive/10 border border-destructive/20' : 'bg-muted border shadow-sm')}`}>
                  {msg.isError && <p className='font-bold text-destructive mb-1 flex items-center gap-2'><AlertTriangle className="w-4 h-4" /> Request Failed</p>}
                  {msg.text}
                </div>
                {msg.isError && lastUserQuery && (
                  <Button variant="outline" size="sm" onClick={() => handleSend(lastUserQuery)} className="h-8">Retry</Button>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted p-3 rounded-2xl flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-widest opacity-50">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
        <div className="p-6 border-t bg-background">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
            <Input 
              placeholder="Who is the busiest vendor?" 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              disabled={isLoading} 
              className="rounded-xl h-12 focus:ring-primary"
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="h-12 w-12 rounded-xl bg-primary">
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
