"use client";

import { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { useKhatupatiStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, ArrowLeft, PlusCircle, Factory, Scissors, Package, Database, Info, Loader2, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { MasterEntry, MasterCategory, MasterSubCategory } from '@/lib/types';

export default function MasterDirectory() {
  const { directory, addDirectoryEntry, updateDirectoryEntry, deleteDirectoryEntry, isLoaded } = useKhatupatiStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | MasterCategory>('all');
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editEntryData, setEditEntryData] = useState<MasterEntry | null>(null);
  
  const [newEntryData, setNewEntryData] = useState<Omit<MasterEntry, 'id'>>({ 
    name: '', 
    category: 'Fabric', 
    subCategory: 'Kurta',
    supplierName: '',
    rate: 0,
    meters: 0,
    dying: 0
  });

  const filteredDirectory = useMemo(() => {
    return directory.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            e.supplierName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [directory, searchTerm, categoryFilter]);

  const handleAdd = async () => {
    if (!newEntryData.name.trim()) return;
    await addDirectoryEntry(newEntryData);
    setNewEntryData({ 
      name: '', 
      category: 'Fabric', 
      subCategory: 'Kurta',
      supplierName: '',
      rate: 0,
      meters: 0,
      dying: 0
    });
    setIsAddDialogOpen(false);
  };

  const handleEdit = async () => {
    if (!editEntryData || !editEntryData.name.trim()) return;
    await updateDirectoryEntry(editEntryData);
    setIsEditDialogOpen(false);
    setEditEntryData(null);
  };

  const openEdit = (entry: MasterEntry) => {
    setEditEntryData(entry);
    setIsEditDialogOpen(true);
  };

  const getSubCategoryIcon = (sub: MasterSubCategory) => {
    switch (sub) {
      case 'Embroidery': return <Factory className="w-3 h-3" />;
      case 'Value Addition': return <Scissors className="w-3 h-3" />;
      default: return <Package className="w-3 h-3" />;
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Loading Master Directory...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <Header title="Master Directory" className="default-header" />
      
      <main className="container px-4 space-y-6">
        <div className="p-4 bg-primary/5 border rounded-xl flex items-start gap-4">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-primary uppercase">About Unified Master</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This directory stores your <strong>Fabric Qualities</strong> and <strong>Production Vendors</strong>. 
              Adding qualities here enables <strong>Intelligent Autofill</strong> in purchase entries.
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full lg:max-w-3xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search name or supplier..." 
                className="pl-10 h-11" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v: any) => setCategoryFilter(v)}>
              <SelectTrigger className="w-full sm:w-[180px] h-11">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Fabric">Fabric Qualities</SelectItem>
                <SelectItem value="Vendor">Process Vendors</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2 w-full lg:w-auto">
            <Link href="/settings/vendors/performance">
              <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/5">
                <TrendingUp className="w-4 h-4" /> Performance Scorecard
              </Button>
            </Link>
            
            <Link href="/">
              <Button variant="outline" className="w-full gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 lg:flex-none gap-2 bg-primary">
                  <PlusCircle className="w-4 h-4" /> Add Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add Master Directory Entry</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={newEntryData.category} onValueChange={(v: MasterCategory) => setNewEntryData({...newEntryData, category: v, subCategory: v === 'Vendor' ? 'Embroidery' : 'Kurta'})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fabric">Fabric Quality</SelectItem>
                          <SelectItem value="Vendor">Vendor/Process</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Process/Component</Label>
                      <Select value={newEntryData.subCategory} onValueChange={(v: MasterSubCategory) => setNewEntryData({...newEntryData, subCategory: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {newEntryData.category === 'Fabric' ? (
                            <>
                              <SelectItem value="Kurta">Kurta</SelectItem>
                              <SelectItem value="Salwar">Salwar</SelectItem>
                              <SelectItem value="Dupatta">Dupatta</SelectItem>
                              <SelectItem value="Lace">Lace</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="Embroidery">Embroidery</SelectItem>
                              <SelectItem value="Value Addition">Value Addition</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{newEntryData.category === 'Fabric' ? 'Quality Name' : 'Vendor Name'}</Label>
                    <Input placeholder="Enter name" value={newEntryData.name} onChange={e => setNewEntryData({...newEntryData, name: e.target.value})} />
                  </div>

                  {newEntryData.category === 'Fabric' && (
                    <>
                      <div className="space-y-2">
                        <Label>Supplier Name</Label>
                        <Input placeholder="Who sells this?" value={newEntryData.supplierName} onChange={e => setNewEntryData({...newEntryData, supplierName: e.target.value})} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Rate (₹/m)</Label>
                          <Input type="number" value={newEntryData.rate} onChange={e => setNewEntryData({...newEntryData, rate: parseFloat(e.target.value) || 0})} />
                        </div>
                        <div className="space-y-2">
                          <Label>Meters/Piece</Label>
                          <Input type="number" step="0.05" value={newEntryData.meters} onChange={e => setNewEntryData({...newEntryData, meters: parseFloat(e.target.value) || 0})} />
                        </div>
                      </div>
                      {newEntryData.subCategory === 'Dupatta' && (
                        <div className="space-y-2">
                          <Label>Dying Charges (₹/pc)</Label>
                          <Input type="number" value={newEntryData.dying} onChange={e => setNewEntryData({...newEntryData, dying: parseFloat(e.target.value) || 0})} />
                        </div>
                      )}
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAdd} disabled={!newEntryData.name.trim()}>Save to Master</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-headline font-bold">Consolidated Directory</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDirectory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center gap-4">
                        <Database className="w-12 h-12 opacity-10" />
                        <div className="space-y-1">
                          <p className="font-bold text-foreground">Your Master Directory is empty</p>
                          <p className="text-xs">Add vendors and fabrics here to enable smart production features.</p>
                        </div>
                        <Button onClick={() => setIsAddDialogOpen(true)} variant="secondary" className="gap-2">
                          <PlusCircle className="w-4 h-4" /> Add Your First Entry
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDirectory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-bold">
                        <div className="flex flex-col">
                          <span>{entry.name}</span>
                          {entry.category === 'Fabric' && <span className="text-[10px] text-muted-foreground uppercase">{entry.supplierName}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`border-none flex items-center gap-1.5 ${entry.category === 'Vendor' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                            {getSubCategoryIcon(entry.subCategory)}
                            {entry.subCategory}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.category === 'Fabric' ? (
                          <div className="text-xs font-mono">
                            ₹{entry.rate}/m • {entry.meters}m
                            {entry.dying ? ` • ₹${entry.dying} dying` : ''}
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">Process Partner</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openEdit(entry)}><Pencil className="w-4 h-4" /></Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => { if (confirm(`Delete ${entry.name}?`)) deleteDirectoryEntry(entry.id); }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Directory Entry</DialogTitle></DialogHeader>
          {editEntryData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={editEntryData.category} onValueChange={(v: MasterCategory) => setEditEntryData({...editEntryData, category: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fabric">Fabric Quality</SelectItem>
                      <SelectItem value="Vendor">Vendor/Process</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={editEntryData.subCategory} onValueChange={(v: MasterSubCategory) => setEditEntryData({...editEntryData, subCategory: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {editEntryData.category === 'Fabric' ? (
                        <>
                          <SelectItem value="Kurta">Kurta</SelectItem>
                          <SelectItem value="Salwar">Salwar</SelectItem>
                          <SelectItem value="Dupatta">Dupatta</SelectItem>
                          <SelectItem value="Lace">Lace</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="Embroidery">Embroidery</SelectItem>
                          <SelectItem value="Value Addition">Value Addition</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={editEntryData.name} onChange={e => setEditEntryData({...editEntryData, name: e.target.value})} />
              </div>

              {editEntryData.category === 'Fabric' && (
                <>
                  <div className="space-y-2">
                    <Label>Supplier</Label>
                    <Input value={editEntryData.supplierName || ''} onChange={e => setEditEntryData({...editEntryData, supplierName: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Rate</Label>
                      <Input type="number" value={editEntryData.rate} onChange={e => setEditEntryData({...editEntryData, rate: parseFloat(e.target.value) || 0})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Meters</Label>
                      <Input type="number" step="0.05" value={editEntryData.meters} onChange={e => setEditEntryData({...editEntryData, meters: parseFloat(e.target.value) || 0})} />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit}>Update Master</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}