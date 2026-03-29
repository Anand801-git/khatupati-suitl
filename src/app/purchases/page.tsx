'use client';

import { useKhatupatiStore } from '@/lib/store';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ArrowRight, Sparkles, Loader2, Warehouse, Factory, Clock, CheckCircle2, Package, LayoutGrid, List, Pencil, CalendarDays, Palette, Tag } from 'lucide-react';
import { useState, useMemo, useEffect, ReactNode } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { useRouter } from 'next/navigation';
import { LocalImage } from '@/components/ui/local-image';
import { askLocalAI } from '@/lib/ai/local-runner';
import { getLotStats } from '@/lib/lot-utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const formatDate = (dateString: string) => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return 'N/A';
    return format(date, 'MMMM yyyy');
  } catch (error) {
    return 'N/A';
  }
};

export default function PurchaseHistory() {
  const { purchases, allAssignments } = useKhatupatiStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'gallery' | 'table'>('gallery');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isAiFiltering, setIsAiFiltering] = useState(false);
  const [aiMatchingIds, setAiMatchingIds] = useState<string[] | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => { setMounted(true); }, []);

  const handleAiSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsAiFiltering(true);
    try {
      const lotContext = purchases.map(p => ({
        id: p.id,
        name: p.qualityName,
        status: p.state,
        vendorNames: allAssignments.filter(a => a.lotId === p.id).map(a => a.vendorName)
      }));

      const systemPrompt = `You are an intelligent search assistant for Khatupati Suits. The user is searching their production lots. Look at the provided JSON list of lots and figure out which lot IDs match their natural language query (e.g. "show me lots at embroidery", "find pastel suits"). Return a STRICT JSON response exactly matching this format: { "matchingIds": ["id1", "id2"], "explanation": "Why these matched" }. Return ONLY valid JSON block.
      Available Lots Context:
      ${JSON.stringify(lotContext)}
      `;

      const rawResult = await askLocalAI(systemPrompt, `Search Query: ${searchTerm}`);
      
      let parsedResult;
      try {
        const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
        parsedResult = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawResult);
      } catch (e) {
        throw new Error("Failed to parse local AI search results.");
      }

      setAiMatchingIds(parsedResult.matchingIds || []);
      toast({ title: "AI Filter Applied", description: parsedResult.explanation || "Filtered successfully." });
    } catch (error) {
      toast({ variant: "destructive", title: "Search Failed", description: "Local AI couldn't process this request." });
    } finally { setIsAiFiltering(false); }
  };

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    purchases.forEach(p => p.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [purchases]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      if (aiMatchingIds) return aiMatchingIds.includes(p.id);
      
      const matchesSearch = p.qualityName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMonth = selectedMonth === 'all' || (p.purchaseDate && formatDate(p.purchaseDate) === selectedMonth);
      const matchesStatus = statusFilter === 'all' || p.state === statusFilter;
      const matchesTags = selectedTags.length === 0 || selectedTags.every(t => p.tags?.includes(t));
      
      return matchesSearch && matchesMonth && matchesStatus && matchesTags;
    }).sort((a, b) => {
        try {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        } catch(e) { return 0; }
    });
  }, [purchases, searchTerm, selectedMonth, statusFilter, aiMatchingIds, selectedTags]);

  if (!mounted) return null;

  return (
    <div className="flex flex-col gap-6 pb-24">
      <Header title="Design Collections" className="lots-gallery-header" />
      <main className="container px-4 flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              {isAiFiltering ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Search className="h-5 w-5 text-muted-foreground" />}
            </div>
            <Input 
              placeholder="Type natural query..." 
              className="pl-12 h-14 text-lg bg-card rounded-xl border-2 border-primary/10 focus:border-primary/30" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              onKeyDown={e => e.key === 'Enter' && handleAiSearch()} 
            />
            <div className="absolute inset-y-0 right-2 flex items-center gap-2">
              <Button onClick={handleAiSearch} disabled={isAiFiltering || !searchTerm} className="h-10 gap-2 bg-primary"><Sparkles className="w-4 h-4" /> Ask Gemini</Button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-9 w-[140px] bg-card"><CalendarDays className="w-3.5 h-3.5 mr-2" /><SelectValue placeholder="All Time" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    {Array.from(new Set(purchases.map(p => p.purchaseDate ? formatDate(p.purchaseDate) : null).filter(Boolean))).map(m => <SelectItem key={m as string} value={m as string}>{m as string}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex bg-muted p-1 rounded-lg">
                  <Button variant={viewMode === 'gallery' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('gallery')} className="h-7 text-[10px] gap-1.5"><LayoutGrid className="w-3 h-3" /> Gallery</Button>
                  <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => setViewMode('table')} className="h-7 text-[10px] gap-1.5"><List className="w-3 h-3" /> Table</Button>
                </div>
              </div>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest hidden sm:block">{filteredPurchases.length} Collections</p>
            </div>

            {allTags.length > 0 && (
              <ScrollArea className="w-full whitespace-nowrap pb-2">
                <div className="flex gap-2">
                  {allTags.map(tag => (
                    <Badge 
                      key={tag} 
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="cursor-pointer transition-all active:scale-95"
                      onClick={() => toggleTag(tag)}
                    >
                      <Tag className="w-2.5 h-2.5 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                  {selectedTags.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTags([])} className="h-6 px-2 text-[10px] uppercase font-bold text-destructive">
                      Clear Filters
                    </Button>
                  )}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </div>
        </div>

        {viewMode === 'gallery' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {filteredPurchases.map((p, i) => {
              const lotStats = getLotStats(p, allAssignments.filter(a => a.lotId === p.id));
              return (
                <div key={p.id} 
                     className="group relative flex flex-col gap-4 transition-all duration-400 ease-out hover:translate-x-[2px] hover:shadow-xl"
                     style={{ animation: `fade-up 0.4s ease-out ${i * 50}ms both` }}>
                  <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted shadow-lg cursor-pointer clickable-card" onClick={() => router.push(`/purchases/view?id=${p.id}`)}>
                    {p.designPhoto ? <LocalImage uri={p.designPhoto} alt={p.qualityName} className="object-cover transition-transform group-hover:scale-105" /> : <div className="flex items-center justify-center h-full opacity-10"><Package className="w-20 h-20" /></div>}
                    <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                      <Badge className="bg-white/95 text-primary border-none shadow-xl uppercase font-black text-[10px] rounded-[20px]">{p.state}</Badge>
                      {p.range && (
                        <Badge className="bg-secondary/95 text-white border-none shadow-xl uppercase font-black text-[9px] rounded-[20px] flex items-center gap-1">
                          <Palette className="w-2.5 h-2.5" /> {p.range}
                        </Badge>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6"><Button variant="secondary" className="w-full bg-white text-primary font-bold gap-2">View Details <ArrowRight className="w-4 h-4" /></Button></div>
                  </div>
                  <div className="flex flex-col gap-1 px-1">
                    <h3 className="text-lg font-headline font-black uppercase tracking-tight truncate">{p.qualityName}</h3>
                    <div className="grid grid-cols-4 gap-2 border-t pt-3">
                      <StatMini label="Whse" val={lotStats.inWhse} icon={<Warehouse className="w-3 h-3" />} />
                      <StatMini label="Emb" val={lotStats.atEmb} icon={<Factory className="w-3 h-3" />} />
                      <StatMini label="VA" val={lotStats.atVA} icon={<Clock className="w-3 h-3" />} />
                      <StatMini label="Fin" val={lotStats.finished} icon={<CheckCircle2 className="w-3 h-3" />} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card className="border-none shadow-sm overflow-hidden" style={{ animation: `fade-up 0.4s ease-out 0ms both` }}>
            <CardContent className="p-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="p-4 font-black uppercase text-[10px]">Lot</th>
                    <th className="p-4 font-black uppercase text-[10px]">Quality</th>
                    <th className="p-4 font-black uppercase text-[10px]">Range</th>
                    <th className="p-4 font-black uppercase text-[10px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map((p, index) => (
                    <tr key={p.id} className="border-b hover:bg-muted/30 cursor-pointer transition-all hover:translate-x-[2px]" onClick={() => router.push(`/purchases/view?id=${p.id}`)} style={{ animation: `fade-up 0.4s ease-out ${index * 50}ms both` }}>
                      <td className="p-4">#{p.id.substr(-4).toUpperCase()}</td>
                      <td className="p-4 font-bold">
                        <div className="flex flex-col">
                          <span>{p.qualityName}</span>
                          {p.tags && <span className="text-[10px] text-muted-foreground">{p.tags.join(', ')}</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        {p.range ? <Badge variant="secondary" className="text-[10px]">{p.range}</Badge> : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); router.push(`/purchases/edit?id=${p.id}`); }}><Pencil className="w-3 h-3" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

interface StatMiniProps {
  label: 'Whse' | 'Emb' | 'VA' | 'Fin';
  val: number;
  icon: ReactNode;
}

function StatMini({ label, val, icon }: StatMiniProps) {
  const styles = {
    'Whse': { bg: 'bg-[#FFF0F5]', text: 'text-[#AD1457]' },
    'Emb': { bg: 'bg-[#EEF2FF]', text: 'text-[#283593]' },
    'VA': { bg: 'bg-[#E8FDF5]', text: 'text-[#00695C]' },
    'Fin': { bg: 'bg-[#F1FBE8]', text: 'text-[#2E7D32]' }
  }[label] || { bg: 'bg-muted', text: 'text-muted-foreground' };

  return (
    <div className={`flex flex-col items-center gap-1 ${val === 0 ? 'opacity-20' : ''}`}>
      <div className={`p-1.5 rounded-[20px] ${styles.bg} ${styles.text}`}>
        {icon}
      </div>
      <span className={`text-[11px] font-black ${styles.text}`}>{val}</span>
    </div>
  );
}
