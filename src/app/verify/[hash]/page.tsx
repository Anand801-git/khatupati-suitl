
'use client';

import React, { use, useEffect, useState, useMemo } from 'react';
import { useKhatupatiStore } from '@/lib/store';
import { generateLotHash } from '@/lib/certificate-generator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, ShieldCheck, Factory, Package, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

export default function VerifyCertificate({ params }: { params: Promise<{ hash: string }> }) {
  const resolvedParams = use(params);
  const { purchases, allAssignments, isLoaded } = useKhatupatiStore();
  const [matchingLot, setMatchingLot] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    async function checkHash() {
      if (!isLoaded) return;
      
      let found = null;
      for (const p of purchases) {
        const assignments = allAssignments.filter(a => a.lotId === p.id);
        const computedHash = await generateLotHash(p, assignments);
        if (computedHash === resolvedParams.hash) {
          found = { lot: p, assignments };
          break;
        }
      }
      setMatchingLot(found);
      setIsVerifying(false);
    }
    
    checkHash();
  }, [isLoaded, purchases, allAssignments, resolvedParams.hash]);

  if (!isLoaded || isVerifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="font-bold text-slate-500 uppercase tracking-widest">Authenticating Fingerprint...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12 flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-primary tracking-tighter uppercase">Khatupati Authenticator</h1>
          <p className="text-slate-500 text-sm font-medium">Digital Production Traceability Verification</p>
        </div>

        {matchingLot ? (
          <div className="space-y-6 animate-fade-up">
            <Card className="border-green-200 bg-green-50/30 overflow-hidden shadow-xl">
              <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                <div className="bg-green-100 p-4 rounded-full">
                  <ShieldCheck className="w-12 h-12 text-green-600" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-green-800">AUTHENTICATED</h2>
                  <p className="text-green-700/70 font-medium">This lot is a verified original Khatupati production.</p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] break-all border-green-200 text-green-700 bg-white/50 p-2">
                  {resolvedParams.hash}
                </Badge>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg overflow-hidden">
              <CardHeader className="bg-slate-900 text-white py-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Package className="w-4 h-4" /> Lot Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-2 divide-x divide-y border-b">
                  <SpecItem label="Collection" value={matchingLot.lot.qualityName} />
                  <SpecItem label="ID Reference" value={`#${matchingLot.lot.id.substr(-6).toUpperCase()}`} />
                  <SpecItem label="Color Range" value={matchingLot.lot.range || 'Standard'} />
                  <SpecItem label="Origin" value="Surat, India" />
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 leading-none">Purchase Date</p>
                      <p className="font-bold">{format(new Date(matchingLot.lot.purchaseDate), 'dd MMMM yyyy')}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-dashed">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-3">Production Milestones</p>
                    <div className="space-y-3">
                      <Milestone icon={<Package />} text="Fabric Sourcing" sub="Warehouse Entry" color="text-slate-400" />
                      {matchingLot.assignments.map((a: any, i: number) => (
                        <Milestone key={i} icon={<Factory />} text={a.processType} sub={a.vendorName} color="text-primary" />
                      ))}
                      <Milestone icon={<CheckCircle2 />} text="Final QC Pass" sub="Ready for Market" color="text-green-600" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-red-200 bg-red-50/30 overflow-hidden shadow-xl animate-fade-up">
            <CardContent className="p-12 flex flex-col items-center text-center gap-4">
              <div className="bg-red-100 p-4 rounded-full">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-red-800">VERIFICATION FAILED</h2>
                <p className="text-red-700/70 font-medium">The fingerprint provided does not match any official production records.</p>
              </div>
              <p className="text-xs text-red-600/50 mt-4">If you believe this is an error, please contact support with your Lot ID.</p>
            </CardContent>
          </Card>
        )}

        <div className="text-center pt-8">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">© 2024 Khatupati Suits | Secure Traceability Portal</p>
        </div>
      </div>
    </div>
  );
}

function SpecItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="p-4 bg-white">
      <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">{label}</p>
      <p className="font-bold text-slate-800 truncate">{value}</p>
    </div>
  );
}

function Milestone({ icon, text, sub, color }: { icon: any, text: string, sub: string, color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`p-1.5 rounded-lg bg-slate-50 ${color}`}>
        {React.cloneElement(icon, { className: "w-3.5 h-3.5" })}
      </div>
      <div>
        <p className="text-xs font-bold leading-none">{text}</p>
        <p className="text-[10px] font-medium text-slate-400">{sub}</p>
      </div>
    </div>
  );
}
