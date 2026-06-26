import { ROOM_TYPES, GROUP_LABELS } from './data.js';
import { getItem, groupItemIds, resolveCost, calcLine, calcGrand } from './store.js';
import { roomLabel } from './views.js';
import { analyze } from './deal.js';
import { getPhoto } from './db.js';

// ============================================================
// PURE — section/row structure used by the Excel writer.
// No DOM, no CDN — fully unit-tested. One section per room (in
// project.rooms order) that has at least one checked item with qty>0.
// ============================================================
export function buildRows(project, overrides){
  const sections = [];
  for (const room of project.rooms || []){
    const label = roomLabel(project, room);
    const sel = project.selections?.[room.instanceId] || {};
    const rows = [];
    for (const groupId of ROOM_TYPES[room.typeId]?.groups || []){
      for (const itemId of groupItemIds(groupId)){
        const s = sel[itemId];
        const qty = parseFloat(s?.qty);
        if (!s?.checked || !qty || qty <= 0) continue;
        const def = getItem(itemId);
        rows.push({
          group: GROUP_LABELS[groupId] || groupId,
          name: def?.name || itemId,
          unit: def?.unit || '',
          unitCost: resolveCost(itemId, overrides),
          qty,
          total: calcLine(itemId, s, overrides),
          year: s.year || '',
          serial: s.serial || '',
        });
      }
    }
    if (rows.length){
      sections.push({ label, rows, subtotal: rows.reduce((t, r) => t + r.total, 0) });
    }
  }
  return { sections, grand: calcGrand(project, overrides) };
}

// ============================================================
// BROWSER-ONLY — lazy CDN libs, workbook builder, zip + download.
// All DOM/CDN/window access is INSIDE functions so this module
// imports cleanly under Node (the test only uses buildRows).
// ============================================================

const LIBS = {
  xlsx: 'https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js',
  jszip: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
};

function injectScript(src){
  return new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = src; s.async = true;
    s.onload = resolve; s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

async function loadExportLibs(){
  if (!window.XLSX) await injectScript(LIBS.xlsx);
  if (!window.JSZip) await injectScript(LIBS.jszip);
  if (!window.XLSX || !window.JSZip) throw new Error('Export libraries unavailable');
}

// ---- Style helpers (xlsx-js-style cell.s objects) ----
const FMT_MONEY = '"$"#,##0';
const FMT_MONEY_2 = '"$"#,##0.00';

const BORDER_THIN = { style: 'thin', color: { rgb: 'E5E7EB' } };
const ALL_BORDERS = { top: BORDER_THIN, bottom: BORDER_THIN, left: BORDER_THIN, right: BORDER_THIN };

const styleTitle = {
  font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '111827' } },
  alignment: { vertical: 'center' },
};
const styleMeta = { font: { sz: 10, color: { rgb: '374151' } } };
const styleSection = {
  font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: 'C4441E' } },
  alignment: { vertical: 'center' },
};
const styleColHead = {
  font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: 'EA580C' } },
  alignment: { vertical: 'center' },
  border: ALL_BORDERS,
};
const styleCell = { font: { sz: 10 }, border: ALL_BORDERS };
const styleMoneyCell = { font: { sz: 10 }, border: ALL_BORDERS, alignment: { horizontal: 'right' } };
const styleNumCell = { font: { sz: 10 }, border: ALL_BORDERS, alignment: { horizontal: 'right' } };
const styleSubtotalLabel = { font: { bold: true, sz: 10, color: { rgb: '111827' } }, alignment: { horizontal: 'right' } };
const styleSubtotalVal = {
  font: { bold: true, sz: 10, color: { rgb: '111827' } },
  fill: { fgColor: { rgb: 'FEE2D5' } },
  alignment: { horizontal: 'right' },
};
const styleGrandLabel = { font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '111827' } }, alignment: { horizontal: 'right' } };
const styleGrandVal = { font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '111827' } }, alignment: { horizontal: 'right' } };

const txt = (v, s) => ({ v: v == null ? '' : v, t: 's', s });
const money = (v, s, z = FMT_MONEY) => ({ v: Number(v) || 0, t: 'n', z, s });
const num = (v, s) => ({ v: Number(v) || 0, t: 'n', s });

// Build the single "Estimate" worksheet from buildRows output.
function buildEstimateSheet(XLSX, project, sections, grand, dateStr){
  const rows = []; // array of arrays of cell objects
  const merges = [];
  const NCOL = 5; // Repair Item, Unit, Unit Cost, Qty, Estimate

  const pushMerge = (r) => merges.push({ s: { r, c: 0 }, e: { r, c: NCOL - 1 } });

  // Title
  rows.push([txt('SPARK EQUITY GROUP — REPAIR ESTIMATE', styleTitle)]);
  pushMerge(rows.length - 1);
  // Meta line
  rows.push([txt(`Property: ${project.name || ''}   Date: ${dateStr}`, styleMeta)]);
  pushMerge(rows.length - 1);
  rows.push([txt('', {})]); // spacer

  for (const sec of sections){
    // Section header
    rows.push([txt(sec.label, styleSection)]);
    pushMerge(rows.length - 1);
    // Column header
    rows.push([
      txt('Repair Item', styleColHead),
      txt('Unit', styleColHead),
      txt('Unit Cost', styleColHead),
      txt('Qty', styleColHead),
      txt('Estimate', styleColHead),
    ]);
    // Item rows
    for (const r of sec.rows){
      const name = r.name
        + (r.year ? ` (${r.year})` : '')
        + (r.serial ? ` [S/N ${r.serial}]` : '');
      rows.push([
        txt(name, styleCell),
        txt(r.unit, styleCell),
        money(r.unitCost, styleMoneyCell, FMT_MONEY_2),
        num(r.qty, styleNumCell),
        money(r.total, styleMoneyCell),
      ]);
    }
    // Subtotal
    rows.push([
      txt('', {}), txt('', {}), txt('', {}),
      txt('Subtotal', styleSubtotalLabel),
      money(sec.subtotal, styleSubtotalVal),
    ]);
    rows.push([txt('', {})]); // spacer
  }

  // Grand total
  rows.push([
    txt('', {}), txt('', {}), txt('', {}),
    txt('TOTAL ESTIMATE', styleGrandLabel),
    money(grand, styleGrandVal),
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = merges;
  ws['!cols'] = [{ wch: 46 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 14 }];
  return ws;
}

// Build the optional "Deal" worksheet from analyze().
function buildDealSheet(XLSX, deal, grand){
  const r = analyze({ ...deal, repairs: grand });
  const rowLabel = { font: { sz: 10, color: { rgb: '374151' } } };
  const rowVal = { font: { sz: 10 }, alignment: { horizontal: 'right' } };
  const head = {
    font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '111827' } },
  };
  const heroLabel = { font: { bold: true, sz: 11, color: { rgb: '111827' } } };
  const heroVal = { font: { bold: true, sz: 11 }, fill: { fgColor: { rgb: 'FEE2D5' } }, alignment: { horizontal: 'right' } };

  const aoa = [];
  aoa.push([txt('DEAL ANALYSIS', head), txt('', head)]);
  aoa.push([txt('', {}), txt('', {})]);
  aoa.push([txt('After-repair value (ARV)', rowLabel), money(deal.arv, rowVal)]);
  aoa.push([txt('Purchase price', rowLabel), money(deal.purchasePrice, rowVal)]);
  aoa.push([txt('Holding costs', rowLabel), money(deal.holdingCosts, rowVal)]);
  aoa.push([txt('Repairs (from estimate)', rowLabel), money(grand, rowVal)]);
  aoa.push([txt('', {}), txt('', {})]);
  aoa.push([txt('Projected margin', heroLabel), money(r.margin, heroVal)]);
  aoa.push([txt('ROI %', rowLabel), r.basis === 0 ? txt('—', rowVal) : num(Number(r.roi.toFixed(1)), rowVal)]);
  aoa.push([txt('Max allowable offer (70% rule)', rowLabel), money(r.maxOffer, rowVal)]);
  aoa.push([txt('Over budget?', rowLabel), txt(r.overBudget ? 'Yes' : 'No', rowVal)]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  ws['!cols'] = [{ wch: 32 }, { wch: 16 }];
  return ws;
}

function dealHasValue(deal){
  if (!deal) return false;
  return ['arv', 'purchasePrice', 'holdingCosts'].some(
    (k) => String(deal[k] ?? '').trim() !== '');
}

function buildWorkbook(XLSX, project, overrides, dateStr){
  const { sections, grand } = buildRows(project, overrides);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildEstimateSheet(XLSX, project, sections, grand, dateStr), 'Estimate');
  if (dealHasValue(project.deal)){
    XLSX.utils.book_append_sheet(wb, buildDealSheet(XLSX, project.deal, grand), 'Deal');
  }
  return { wb, grand };
}

const sanitize = (s) => String(s ?? '').replace(/[^a-z0-9._-]/gi, '_').replace(/_+/g, '_');

// Human-readable label for a photoRefs key: "<instanceId>" (room) or
// "<instanceId>:<itemId>" (serial item). Falls back to the raw key.
function labelForKey(project, key){
  const [instanceId, itemId] = String(key).split(':');
  const room = (project.rooms || []).find((r) => r.instanceId === instanceId);
  const roomName = room ? roomLabel(project, room) : instanceId;
  if (itemId){
    const itemName = getItem(itemId)?.name || itemId;
    return `${roomName}-${itemName}`;
  }
  return roomName;
}

// Pull the file extension off an original photo name (default .jpg).
function extOf(name){
  const m = /\.([a-z0-9]+)$/i.exec(String(name || ''));
  return m ? m[1].toLowerCase() : 'jpg';
}

function download(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Main entry — build the styled workbook; bundle photos as a ZIP if present,
// otherwise download the .xlsx directly.
export async function exportProject(project, overrides){
  try {
    await loadExportLibs();
  } catch (e){
    console.warn('export libs failed', e);
    alert('Export needs an internet connection the first time to load the spreadsheet engine. Try again once online.');
    return;
  }
  const XLSX = window.XLSX, JSZip = window.JSZip;

  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const { wb } = buildWorkbook(XLSX, project, overrides, dateStr);

  const ymd = new Date().toISOString().slice(0, 10);
  const base = `Spark-Estimate-${sanitize(project.name || 'project')}-${ymd}`;

  // Collect photos from photoRefs.
  const photos = [];
  for (const [key, arr] of Object.entries(project.photoRefs || {})){
    const labelBase = sanitize(labelForKey(project, key));
    let n = 0;
    for (const ref of arr || []){
      n++;
      let blob;
      try { blob = await getPhoto(ref.id); } catch { blob = null; }
      if (!blob) continue;
      const ext = extOf(ref.name);
      photos.push({ path: `photos/${labelBase}_${n}.${ext}`, blob });
    }
  }

  if (photos.length){
    const zip = new JSZip();
    const wbArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    zip.file(`${base}.xlsx`, wbArray);
    for (const ph of photos) zip.file(ph.path, ph.blob);
    const out = await zip.generateAsync({ type: 'blob' });
    download(out, `${base}.zip`);
  } else {
    XLSX.writeFile(wb, `${base}.xlsx`);
  }
}
