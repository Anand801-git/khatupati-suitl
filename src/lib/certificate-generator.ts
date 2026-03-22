import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';
import { Purchase, ProductionJob } from './types';
import { format } from 'date-fns';

export async function generateLotHash(purchase: Purchase, assignments: ProductionJob[]): Promise<string> {
  const sortedAssignments = [...assignments].sort((a, b) => new Date(a.sentDate).getTime() - new Date(b.sentDate).getTime());
  const dataString = JSON.stringify({
    id: purchase.id,
    date: purchase.purchaseDate,
    quality: purchase.qualityName,
    steps: sortedAssignments.map(a => ({ v: a.vendorName, d: a.sentDate, r: a.receivedDate }))
  });

  const msgUint8 = new TextEncoder().encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateTraceabilityCertificate(purchase: Purchase, assignments: ProductionJob[]) {
  const hash = await generateLotHash(purchase, assignments);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  doc.setDrawColor(23, 56, 128); 
  doc.setLineWidth(1.5);
  doc.rect(margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));
  doc.setLineWidth(0.5);
  doc.rect(margin + 2, margin + 2, pageWidth - (margin * 2) - 4, pageHeight - (margin * 2) - 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(23, 56, 128);
  doc.text('KHATUPATI SUITS', pageWidth / 2, margin + 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text('PREMIUM ETHNIC WEAR | SURAT, INDIA', pageWidth / 2, margin + 26, { align: 'center' });

  doc.setDrawColor(200);
  doc.line(margin + 10, margin + 35, pageWidth - margin - 10, margin + 35);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.text('CERTIFICATE OF TRACEABILITY', pageWidth / 2, margin + 50, { align: 'center' });

  doc.setFontSize(11);
  doc.text('LOT SPECIFICATIONS', margin + 15, margin + 65);
  
  const lotDetails = [
    ['Lot Reference', `#${purchase.id.substr(-6).toUpperCase()}`],
    ['Quality Name', purchase.qualityName],
    ['Color Range', purchase.range || 'N/A'],
    ['Production Origin', 'Surat, Gujarat, India'],
    ['Authentication Date', format(new Date(), 'dd MMMM yyyy')]
  ];

  (doc as any).autoTable({
    startY: margin + 70,
    margin: { left: margin + 15, right: margin + 15 },
    body: lotDetails,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: 'bold', width: 40 } }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('VERIFIED PRODUCTION CHAIN', margin + 15, currentY);
  
  const sortedAssignments = [...assignments].sort((a, b) => new Date(a.sentDate).getTime() - new Date(b.sentDate).getTime());
  
  const chainData = [
    ['1', 'Fabric Purchase', 'Khatupati Warehouse', format(new Date(purchase.purchaseDate), 'dd/MM/yyyy'), 'Initial Inventory']
  ];

  sortedAssignments.forEach((a, i) => {
    chainData.push([
      (i + 2).toString(),
      a.processType,
      a.vendorName,
      format(new Date(a.sentDate), 'dd/MM/yyyy'),
      a.challanNumber || 'Direct'
    ]);
  });

  chainData.push([
    (chainData.length + 1).toString(),
    'Quality Check',
    'Khatupati QC Dept',
    format(new Date(), 'dd/MM/yyyy'),
    'Certified Ready'
  ]);

  (doc as any).autoTable({
    startY: currentY + 5,
    margin: { left: margin + 15, right: margin + 15 },
    head: [['Step', 'Process', 'Entity', 'Date', 'Challan']],
    body: chainData,
    theme: 'striped',
    headStyles: { fillColor: [23, 56, 128], textColor: 255, fontSize: 9 },
    styles: { fontSize: 8 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 20;
  
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://khatupati.vercel.app';
  const qrUrl = `${origin}/verify/${hash}`;
  const qrCodeDataUrl = await QRCode.toDataURL(qrUrl);
  
  doc.addImage(qrCodeDataUrl, 'PNG', pageWidth / 2 - 20, currentY, 40, 40);
  
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('DIGITAL FINGERPRINT (SHA-256)', pageWidth / 2, currentY + 45, { align: 'center' });
  doc.setFont('courier', 'normal');
  doc.text(hash, pageWidth / 2, currentY + 50, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('This document is a digitally generated production record. The unique fingerprint and QR code', pageWidth / 2, pageHeight - margin - 15, { align: 'center' });
  doc.text('can be used to verify the authenticity of this lot on the official Khatupati Suits portal.', pageWidth / 2, pageHeight - margin - 11, { align: 'center' });

  doc.save(`Khatupati-Traceability-#${purchase.id.substr(-6).toUpperCase()}.pdf`);
  return hash;
}
