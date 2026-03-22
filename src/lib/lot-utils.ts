
import { ProductionJob, Purchase } from '@/lib/types';
import { differenceInDays, parseISO } from 'date-fns';

// Helper to safely get the max value from an array, returning 0 if empty.
const safeMax = (arr: number[]) => arr.length === 0 ? 0 : Math.max(...arr);

export const getLotStats = (purchase: Purchase, assignments: ProductionJob[]) => {
  const total = purchase.piecesCount || 0;
  const allComps = ['Kurta', 'Salwar', 'Dupatta', 'Lace'] as const;
  
  type ComponentStats = {
    everDispatched: number;
    activeEmb: number;
    activeVA: number;
    finished: number;
  }

  type ComponentStatsMap = Record<typeof allComps[number], ComponentStats>;

  const stats = allComps.reduce((acc, type) => {
    const typeAssignments = assignments.filter(a => a.components.some(c => c.type === type));
    const everDispatched = typeAssignments.filter(a => a.processType === 'Embroidery').reduce((sum, job) => sum + (job.components.find(c => c.type === type)?.quantity || 0), 0);
    const activeEmb = typeAssignments.filter(a => a.processType === 'Embroidery' && !a.receivedDate).reduce((sum, job) => sum + (job.components.find(c => c.type === type)?.quantity || 0), 0);
    const activeVA = typeAssignments.filter(a => a.processType === 'Value Addition' && !a.receivedDate).reduce((sum, job) => sum + (job.components.find(c => c.type === type)?.quantity || 0), 0);
    const finishedQty = typeAssignments
      .filter(a => a.processType === 'Value Addition' && a.receivedDate && a.isFinalStep !== false)
      .reduce((sum, job) => sum + (job.receivedQty || job.components.find(c => c.type === type)?.quantity || 0), 0);

    acc[type] = { everDispatched, activeEmb, activeVA, finished: finishedQty };
    return acc;
  }, {} as ComponentStatsMap);

  const activeComps = allComps.filter(c => {
      if (c === 'Kurta') return !!purchase.kurta;
      if (c === 'Salwar') return !!purchase.salwar;
      if (c === 'Dupatta') return !!purchase.dupatta;
      if (c === 'Lace') return !!purchase.lace;
      return false;
  });

  const inWhse = Math.max(0, total - safeMax(allComps.map(t => stats[t].everDispatched)));
  const atEmb = safeMax(allComps.map(t => stats[t].activeEmb));
  const atVA = safeMax(allComps.map(t => stats[t].activeVA));
  
  const finishedCounts = activeComps.map(t => stats[t].finished);
  const finished = finishedCounts.length > 0 ? Math.min(...finishedCounts) : 0;

  return { total, inWhse, atEmb, atVA, finished };
};

export const getDelayedJobs = (allAssignments: ProductionJob[]) => {
  return allAssignments
    .filter(job => !job.receivedDate && differenceInDays(new Date(), parseISO(job.sentDate)) > 15)
    .map(job => ({
      ...job,
      daysDelayed: differenceInDays(new Date(), parseISO(job.sentDate)),
    }));
};
