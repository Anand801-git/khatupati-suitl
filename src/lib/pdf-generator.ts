
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Purchase, ProductionJob } from './types';

// NOTE: A lot of `any` types here because the jspdf-autotable library is not well-typed

const addHeader = (doc: jsPDF) => {
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Khatupati Suits', 14, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Production Management', 14, 26);
};

const addFooter = (doc: jsPDF) => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(8);
  doc.text(`Page ${pageCount}`, 196, doc.internal.pageSize.height - 10, { align: 'right' });
  doc.text(new Date().toLocaleDateString(), 14, doc.internal.pageSize.height - 10);
}

export function generateCostReportPDF(reportData: any[]) {
  const doc = new jsPDF('landscape');
  addHeader(doc);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Financial Costing Report', 14, 40);

  const tableData = reportData.map(lot => [
    `#${lot.id.substr(-6)}`,
    lot.qualityName,
    lot.piecesCount,
    `₹${lot.fabricCost.toFixed(1)}`,
    `₹${lot.processingCost.toFixed(1)}`,
    `₹${lot.totalCost.toFixed(1)}`,
    `₹${lot.totalInvestment.toLocaleString('en-IN')}`,
  ]);

  (doc as any).autoTable({
    startY: 45,
    head: [['Lot ID', 'Quality Name', 'Pieces', 'Fabric/Pc', 'Proc/Pc', 'Total/Pc', 'Total Investment']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8 },
    didDrawPage: () => addFooter(doc)
  });

  doc.save(`Cost-Report-${new Date().toISOString().split('T')[0]}.pdf`);
}


export function generateLotSummaryPDF(
  purchase: Purchase,
  assignments: ProductionJob[],
  landingCost: number
) {
  const doc = new jsPDF();
  addHeader(doc);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Lot Summary', 14, 40);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const lotDetails = [
    ['Lot Reference', `#${purchase.id.substr(-6).toUpperCase()}`],
    ['Quality Name', purchase.qualityName],
    ['Total Pieces', String(purchase.piecesCount)],
    ['Purchase Date', purchase.purchaseDate],
    ['Current State', purchase.state],
  ];

  (doc as any).autoTable({
    startY: 45,
    head: [['Detail', 'Value']],
    body: lotDetails,
    theme: 'grid',
    styles: { fontSize: 9 },
  });

  let startY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Status Breakdown', 14, startY);
  startY += 5;

  const statusCounts = assignments.reduce((acc, job) => {
    const status = job.processType;
    const quantity = job.receivedQty ?? Math.max(0, ...job.components.map(c => c.quantity));
    acc[status] = (acc[status] || 0) + (job.receivedDate ? 0 : quantity);
    return acc;
  }, {} as { [key: string]: number });

  const statusData = Object.entries(statusCounts).map(([status, count]) => [status, String(count)]);

  (doc as any).autoTable({
    startY,
    head: [['Current Stage', 'Active Units']],
    body: statusData,
    theme: 'grid',
    styles: { fontSize: 9 },
  });

  startY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Estimated Landing Cost', 14, startY);
  startY += 5;
  
  (doc as any).autoTable({
      startY,
      head: [['Metric', 'Value']],
      body: [['Cost per Piece', `₹ ${landingCost.toFixed(2)}`]],
      theme: 'grid',
      styles: { fontSize: 9 },
  });

  startY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Production History', 14, startY);
  startY += 5;

  const productionHistory = assignments.map(job => [
    job.vendorName,
    job.processType,
    job.challanNumber || 'N/A',
    job.sentDate ? new Date(job.sentDate).toLocaleDateString() : 'N/A',
    job.receivedQty ?? 'N/A',
    `₹ ${job.rate}`,
    `₹ ${(job.receivedQty || 0) * job.rate}`,
  ]);

  (doc as any).autoTable({
    startY,
    head: [['Vendor', 'Process', 'Challan', 'Sent', 'Received', 'Rate', 'Total']],
    body: productionHistory,
    theme: 'striped',
    styles: { fontSize: 8 },
  });

  doc.save(`Lot-Summary-${purchase.id.substr(-6).toUpperCase()}.pdf`);
}

export function generateChallanPDF(
  purchase: Purchase,
  job: ProductionJob
) {
  const doc = new jsPDF();
  addHeader(doc);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Dispatch Challan', 14, 40);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const challanDetails = [
    ['Challan Number', job.challanNumber || 'N/A'],
    ['Vendor', job.vendorName],
    ['Date', job.sentDate ? new Date(job.sentDate).toLocaleDateString() : 'N/A'],
    ['Lot Reference', `#${purchase.id.substr(-6).toUpperCase()}`],
    ['Quality Name', purchase.qualityName],
  ];

  (doc as any).autoTable({
    startY: 45,
    head: [['Detail', 'Value']],
    body: challanDetails,
    theme: 'grid',
    styles: { fontSize: 9 },
  });

  let startY = (doc as any).lastAutoTable.finalY + 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Components Dispatched', 14, startY);
  startY += 5;

  const componentsData = job.components.map(c => [
    c.type,
    String(c.quantity),
    '',
  ]);

  (doc as any).autoTable({
    startY,
    head: [['Component', 'Quantity', 'Notes']],
    body: componentsData,
    theme: 'striped',
    styles: { fontSize: 9 },
  });

  startY = (doc as any).lastAutoTable.finalY + 30;

  doc.line(14, startY, 80, startY);
  doc.text("Sender's Signature", 14, startY + 5);

  doc.line(130, startY, 196, startY);
  doc.text("Receiver's Signature", 130, startY + 5);

  doc.save(`Challan-${job.challanNumber || job.id.substr(-4)}.pdf`);
}
