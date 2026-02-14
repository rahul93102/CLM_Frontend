'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import { ApiClient, ReviewContractDetail, ReviewContractStatus } from '../../lib/api-client';
import {
  ArrowLeft,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Minus,
  Plus,
  RefreshCcw,
  Search,
  TriangleAlert,
} from 'lucide-react';

const statusPill = (status: ReviewContractStatus) => {
  const map: Record<ReviewContractStatus, string> = {
    uploaded: 'bg-slate-50 text-slate-700 border-slate-200',
    processing: 'bg-amber-50 text-amber-700 border-amber-200',
    ready: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
  };
  return map[status] || 'bg-slate-50 text-slate-700 border-slate-200';
};

const asArray = (v: any): any[] => (Array.isArray(v) ? v : []);

const toLabelValue = (d: any): { label: string; value: string; color?: 'rose' | 'amber' | 'emerald' | 'slate' } => {
  if (!d || typeof d !== 'object') return { label: 'Date', value: String(d || '') };
  const label = String(d.label || d.name || 'Date');
  const value = String(d.value || d.date || d.text || '');
  const rawType = String(d.type || d.kind || '').toLowerCase();
  const color: any = rawType.includes('expire') ? 'rose' : rawType.includes('effective') ? 'amber' : 'slate';
  return { label, value, color };
};

const Chip = ({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode;
  tone?: 'slate' | 'amber' | 'rose' | 'emerald' | 'violet';
}) => {
  const cls: Record<string, string> = {
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
  };
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${cls[tone] || cls.slate}`}>
      {children}
    </span>
  );
};

export default function ReviewDetailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') || '';

  const downloadRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [item, setItem] = useState<ReviewContractDetail | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);

  const [extractionQuery, setExtractionQuery] = useState('');
  const [showExtractedMobile, setShowExtractedMobile] = useState(true);

  const [downloadOpen, setDownloadOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [expandedClause, setExpandedClause] = useState<Record<string, boolean>>({});
  const [showAllClauses, setShowAllClauses] = useState(false);

  const analysis = item?.analysis || {};
  const analysisSummary = (analysis as any)?.analysis_summary || {};

  const load = async () => {
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const client = new ApiClient();
      const res = await client.getReviewContractById(id);
      if (!res.success) throw new Error(res.error || 'Failed to load');
      setItem(res.data as any);

      const urlRes = await client.getReviewContractUrl(id);
      if (urlRes.success) {
        const url = (urlRes.data as any)?.url as string | undefined;
        setFileUrl(url || null);
        setFileText(null);

        const ft = ((res.data as any)?.file_type || '').toLowerCase();
        if (url && ft === 'txt') {
          const txt = await fetch(url).then((r) => r.text());
          setFileText(txt);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Missing review id');
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!downloadOpen) return;
      const el = downloadRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setDownloadOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [downloadOpen]);

  const downloadReport = async (kind: 'txt' | 'pdf') => {
    if (!item) return;
    setError(null);
    setBusy(true);
    try {
      const client = new ApiClient();
      const res =
        kind === 'txt'
          ? await client.downloadReviewReportTxt(item.id)
          : await client.downloadReviewReportPdf(item.id);
      if (!res.success || !res.data) throw new Error(res.error || 'Download failed');

      const blob = res.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const base = (item.title || item.original_filename || 'lawflow_report').trim().replace(/\s+/g, '_');
      a.download = kind === 'txt' ? `${base}_review.txt` : `${base}_review.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setBusy(false);
    }
  };

  const openOriginal = () => {
    if (!fileUrl) return;
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  };

  const summary = String((analysis as any)?.summary || '').trim();
  const parties = asArray(analysis?.parties);
  const dates = asArray(analysis?.dates);
  const values = asArray(analysis?.values);
  const obligations = asArray(analysis?.obligations);
  const constraints = asArray((analysis as any)?.constraints);
  const clauses = asArray(analysis?.clauses);
  const insights = asArray(analysis?.insights);
  const suggestions = asArray(analysis?.suggestions);

  const jurisdiction = String((analysis as any)?.jurisdiction || '').trim();

  const q = extractionQuery.trim().toLowerCase();

  const highlight = (text: string, query: string): React.ReactNode => {
    const t = String(text || '');
    const qq = String(query || '').trim();
    if (!t || !qq) return t;
    try {
      const escaped = qq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped, 'ig');
      const parts = t.split(re);
      const matches = t.match(re) || [];
      if (parts.length <= 1) return t;

      const out: React.ReactNode[] = [];
      for (let i = 0; i < parts.length; i++) {
        if (parts[i]) out.push(<React.Fragment key={`p-${i}`}>{parts[i]}</React.Fragment>);
        const m = matches[i];
        if (m) {
          out.push(
            <span
              key={`m-${i}`}
              className="rounded bg-yellow-100 px-1 text-slate-900"
            >
              {m}
            </span>,
          );
        }
      }
      return out;
    } catch {
      return t;
    }
  };

  const filteredClauses = useMemo(() => {
    if (!q) return clauses;
    return clauses.filter((c: any) => {
      const cat = String(c?.category || '').toLowerCase();
      const snippet = String(c?.snippet || '').toLowerCase();
      const risk = String(c?.risk || '').toLowerCase();
      const title = String(c?.title || c?.matched_library?.title || '').toLowerCase();
      const rec = String(
        c?.recommendation || c?.recommended_text || c?.suggested_text || c?.ai_suggestion || c?.suggestion || '',
      ).toLowerCase();
      return cat.includes(q) || snippet.includes(q) || risk.includes(q);
      // title/recommendation search is handled by suggestions + rendering highlight,
      // but include these too so clause cards filter more intuitively.
      // (keeping this here keeps search feeling “workable”.)
      // eslint-disable-next-line no-unreachable
      return cat.includes(q) || snippet.includes(q) || risk.includes(q) || title.includes(q) || rec.includes(q);
    });
  }, [clauses, q]);

  const filteredSuggestions = useMemo(() => {
    if (!q) return suggestions;
    return suggestions.filter((s: any) => {
      const t = `${s?.title || ''} ${s?.text || ''}`.toLowerCase();
      return t.includes(q);
    });
  }, [suggestions, q]);

  const formatMoney = (v: any): string => {
    if (!v) return '';
    const amount = v?.amount ?? v?.value ?? '';
    const currency = v?.currency ?? '';
    const s = String(amount).trim();
    if (!s) return '';
    return currency ? `${s} ${String(currency).toUpperCase()}` : s;
  };

  const partiesChip = useMemo(() => {
    const names = parties
      .map((p: any) => String(p?.name || '').trim())
      .filter(Boolean)
      .slice(0, 3);
    return names.join(', ');
  }, [parties]);

  const effectiveDate = useMemo(() => {
    const d = dates.find((x: any) => String(x?.type || '').toLowerCase().includes('effective'));
    return d?.value || '';
  }, [dates]);

  const endDate = useMemo(() => {
    const d = dates.find((x: any) => String(x?.type || '').toLowerCase().includes('end'));
    return d?.value || '';
  }, [dates]);

  const primaryValue = useMemo(() => {
    const v = values[0];
    return formatMoney(v);
  }, [values]);

  const filteredParties = useMemo(() => {
    if (!q) return parties;
    return parties.filter((p: any) => String(p?.name || '').toLowerCase().includes(q));
  }, [parties, q]);

  const filteredDates = useMemo(() => {
    if (!q) return dates;
    return dates.filter((d: any) => {
      const lv = toLabelValue(d);
      return `${lv.label} ${lv.value}`.toLowerCase().includes(q);
    });
  }, [dates, q]);

  const filteredValues = useMemo(() => {
    if (!q) return values;
    return values.filter((v: any) => JSON.stringify(v || '').toLowerCase().includes(q));
  }, [values, q]);

  const truncate = (text: string, limit: number) => {
    const t = String(text || '').trim();
    if (!t) return '';
    if (t.length <= limit) return t;
    return `${t.slice(0, limit).trim()}…`;
  };

  const buildStyledReportHtml = () => {
    if (!item) return '';
    const title = (item.original_filename || item.title || 'Contract Review').trim();
    const now = new Date();

    const riskLevel = String(analysisSummary?.risk_level || 'MEDIUM').toUpperCase();
    const riskScore = Number(analysisSummary?.risk_score || 0);

    const partyLines = parties
      .map((p: any) => String(p?.name || '').trim())
      .filter(Boolean);
    const dateLines = dates
      .map((d: any) => {
        const lv = toLabelValue(d);
        return lv.value ? `${lv.label}: ${lv.value}` : '';
      })
      .filter(Boolean);
    const valueLines = values
      .map((v: any) => {
        const m = formatMoney(v);
        const label = String(v?.label || v?.name || 'Value').trim();
        return m ? `${label}: ${m}` : '';
      })
      .filter(Boolean);

    const clauseRows = clauses.map((c: any, idx: number) => {
      const category = String(c?.category || 'Clause');
      const title2 = String(c?.title || c?.matched_library?.title || category);
      const pct = typeof c?.match_percent === 'number' ? c.match_percent : null;
      const matchUi = clauseMatchLabel(c?.match_percent);
      const extracted = String(c?.snippet || c?.extracted_text || c?.text || '').trim();
      const recommendation = String(getClauseRecommendation(c) || '').trim();
      const badgeColor =
        matchUi.tone === 'emerald'
          ? '#16a34a'
          : matchUi.tone === 'amber'
            ? '#f59e0b'
            : matchUi.tone === 'rose'
              ? '#e11d48'
              : '#64748b';
      return `
        <div class="card" style="margin-top:12px">
          <div class="row" style="justify-content:space-between; align-items:flex-start; gap:12px">
            <div>
              <div class="h3">${escapeHtml(title2)}</div>
              <div class="muted" style="font-weight:700; font-size:11px; margin-top:4px">${escapeHtml(category)}</div>
            </div>
            <div class="row" style="gap:8px; flex-wrap:wrap; justify-content:flex-end">
              <span class="badge" style="border-color:${badgeColor}; color:${badgeColor}">${escapeHtml(matchUi.label)}</span>
              <span class="badge" style="border-color:#cbd5e1; color:#0f172a">${pct != null ? `${pct}%` : '—'}</span>
            </div>
          </div>
          <div class="grid2" style="margin-top:10px">
            <div class="mini">
              <div class="k">EXTRACTED TEXT</div>
              <div class="v">${escapeHtml(extracted || '—')}</div>
            </div>
            <div class="mini" style="border-color:#fecdd3; background:#fff1f2">
              <div class="k" style="color:#e11d48">RECOMMENDATION</div>
              <div class="v">${escapeHtml(recommendation || '—')}</div>
            </div>
          </div>
        </div>
      `;
    });

    const sugRows = suggestions.slice(0, 12).map((s: any) => {
      const st = String(s?.title || 'Suggestion');
      const sx = String(s?.text || '').trim();
      return `
        <div class="card" style="margin-top:12px; border-color:#ffe4e6; background:#fff1f2">
          <div class="h3">${escapeHtml(st)}</div>
          <div class="v" style="margin-top:8px">${escapeHtml(sx || '—')}</div>
        </div>
      `;
    });

    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} - Review Report</title>
    <style>
      :root { --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --bg:#ffffff; --soft:#f8fafc; --brand:#ff5aa0; }
      @page { margin: 18mm; }
      * { box-sizing: border-box; }
      body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; color:var(--ink); background: var(--soft); }
      .wrap { max-width: 980px; margin: 0 auto; padding: 28px 18px; }
      .top { background: var(--bg); border:1px solid var(--line); border-radius: 18px; padding: 18px; }
      .row { display:flex; }
      .col { display:flex; flex-direction:column; }
      .muted { color: var(--muted); }
      .h1 { font-size: 22px; font-weight: 900; letter-spacing: -0.02em; }
      .h2 { font-size: 14px; font-weight: 900; margin:0; }
      .h3 { font-size: 13px; font-weight: 800; }
      .badge { display:inline-flex; align-items:center; padding:6px 10px; border-radius:999px; border:1px solid var(--line); font-size:12px; font-weight:800; background:#fff; }
      .grid4 { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap:10px; margin-top: 14px; }
      .tile { border:1px solid var(--line); border-radius: 16px; padding: 12px; background: #fff; }
      .k { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; color: var(--muted); }
      .v { font-size: 12px; line-height: 1.5; white-space: pre-wrap; }
      .tile .vBig { font-size: 16px; font-weight: 900; margin-top: 6px; }
      .section { margin-top: 14px; }
      .card { border:1px solid var(--line); border-radius: 18px; padding: 14px; background: #fff; }
      .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .mini { border:1px solid var(--line); border-radius: 14px; padding: 10px; background:#fff; }
      .hr { height:1px; background: var(--line); margin: 14px 0; }
      @media print { body { background: #fff; } .wrap { padding:0; } }
      @media (max-width: 820px) { .grid4 { grid-template-columns: repeat(2, minmax(0,1fr)); } .grid2 { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="top">
        <div class="row" style="justify-content:space-between; align-items:flex-start; gap:12px; flex-wrap:wrap">
          <div class="col" style="min-width:260px">
            <div class="h1">${escapeHtml(title)}</div>
            <div class="muted" style="margin-top:6px; font-size:12px">Generated ${now.toLocaleString()}</div>
          </div>
          <div class="row" style="gap:10px; flex-wrap:wrap; justify-content:flex-end">
            <span class="badge" style="border-color:#fda4af; color:#e11d48">${escapeHtml(String(item.status || '').toUpperCase())}</span>
            <span class="badge" style="border-color:#fecdd3; color:#e11d48">${escapeHtml(riskLevel)} RISK (${riskScore}/100)</span>
          </div>
        </div>

        <div class="grid4">
          <div class="tile"><div class="k">TOTAL CLAUSES</div><div class="vBig">${escapeHtml(String(Number(analysisSummary?.clauses_count || clauses.length || 0)))}</div></div>
          <div class="tile"><div class="k">AMOUNT</div><div class="vBig">${escapeHtml(primaryValue || '—')}</div></div>
          <div class="tile"><div class="k">PARTIES</div><div class="vBig">${escapeHtml(partiesChip || (partyLines.length ? `${partyLines.length} parties` : '—'))}</div></div>
          <div class="tile"><div class="k">DATE</div><div class="vBig">${escapeHtml(String(effectiveDate || (dates[0]?.value ? String(dates[0].value) : '—')))}</div></div>
        </div>

        <div class="section">
          <div class="hr"></div>
          <div class="row" style="gap:10px; flex-wrap:wrap">
            ${jurisdiction ? `<span class="badge">Jurisdiction: ${escapeHtml(jurisdiction)}</span>` : ''}
            ${endDate ? `<span class="badge">Expiry: ${escapeHtml(String(endDate))}</span>` : ''}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="card">
          <div class="h2">Summary</div>
          <div class="v" style="margin-top:10px">${escapeHtml(summary || '—')}</div>
        </div>
      </div>

      ${(partyLines.length || dateLines.length || valueLines.length) ? `
      <div class="section">
        <div class="card">
          <div class="h2">Extracted Data</div>
          <div class="grid2" style="margin-top:12px">
            <div class="mini"><div class="k">PARTIES</div><div class="v" style="margin-top:8px">${escapeHtml(partyLines.join('\n') || '—')}</div></div>
            <div class="mini"><div class="k">DATES & VALUES</div><div class="v" style="margin-top:8px">${escapeHtml([...dateLines, ...valueLines].join('\n') || '—')}</div></div>
          </div>
        </div>
      </div>
      ` : ''}

      <div class="section">
        <div class="card">
          <div class="h2">Detected Clauses</div>
          ${clauseRows.join('')}
        </div>
      </div>

      <div class="section">
        <div class="card">
          <div class="h2">Suggestions</div>
          ${sugRows.join('') || '<div class="v" style="margin-top:10px">—</div>'}
        </div>
      </div>

      <div class="section">
        <div class="card">
          <div class="h2">Review Notes</div>
          <div class="v" style="margin-top:10px">${escapeHtml(String(item.review_text || '—'))}</div>
        </div>
      </div>
    </div>
  </body>
</html>`;
    return html;
  };

  const escapeHtml = (s: string) => {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const downloadStyledReportHtml = () => {
    if (!item) return;
    const html = buildStyledReportHtml();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const base = (item.title || item.original_filename || 'lawflow_report').trim().replace(/\s+/g, '_');
    a.download = `${base}_styled_report.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const printStyledReport = () => {
    if (!item) return;
    const html = buildStyledReportHtml();
    const w = window.open('', '_blank', 'noopener,noreferrer');
    if (!w) {
      setError('Popup blocked. Allow popups to print the report.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    // Give the browser a moment to layout before printing.
    setTimeout(() => {
      try {
        w.print();
      } catch {
        // ignore
      }
    }, 300);
  };

  const copyText = async (text: string) => {
    const t = String(text || '').trim();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = t;
      el.setAttribute('readonly', 'true');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      el.remove();
    }
  };

  const getClauseRecommendation = (clause: any): string => {
    const direct =
      clause?.recommendation || clause?.recommended_text || clause?.suggested_text || clause?.ai_suggestion || clause?.suggestion;
    if (direct) return String(direct);

    const category = String(clause?.category || '').toLowerCase();
    const title = String(clause?.title || clause?.matched_library?.title || '').toLowerCase();
    const match = suggestions.find((s: any) => {
      const st = `${s?.title || ''} ${s?.text || ''}`.toLowerCase();
      return (category && st.includes(category)) || (title && st.includes(title));
    });
    const txt = String(match?.text || match?.recommendation || '').trim();
    if (txt) return txt;

    const lib = clause?.matched_library;
    const libTxt = String(lib?.suggested_text || lib?.recommended_text || lib?.text || '').trim();
    return libTxt;
  };

  const clauseMatchLabel = (matchPercent: any): { label: string; tone: 'emerald' | 'amber' | 'rose' | 'slate' } => {
    const pct = typeof matchPercent === 'number' ? matchPercent : Number(matchPercent);
    if (!Number.isFinite(pct)) return { label: 'MATCH', tone: 'slate' };
    if (pct >= 85) return { label: 'MATCH', tone: 'emerald' };
    if (pct >= 60) return { label: 'PARTIAL MATCH', tone: 'amber' };
    return { label: 'LOW MATCH', tone: 'rose' };
  };

  const readyLike = item?.status === 'ready';

  const hasAnyStructured = useMemo(() => {
    return (
      summary ||
      parties.length ||
      dates.length ||
      values.length ||
      obligations.length ||
      clauses.length ||
      insights.length ||
      suggestions.length
    );
  }, [summary, parties.length, dates.length, values.length, obligations.length, clauses.length, insights.length, suggestions.length]);

  return (
    <DashboardLayout>
      <div className="space-y-6 anim-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => router.push('/review')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="mt-3 text-2xl md:text-3xl font-extrabold text-slate-900 truncate">
              Contract
              <br className="md:hidden" /> Validation
            </h1>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl p-4 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-slate-500">Loading…</div>
        ) : !item ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-10 text-slate-500">Not found</div>
        ) : (
          <>
            {/* Toolbar (matches screenshot vibe) */}
            <div className="bg-white rounded-[28px] border border-slate-200 px-4 py-3 md:px-6 md:py-4 flex items-center gap-3 flex-wrap anim-fade-up">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 min-w-0">
                  <FileText className="w-4 h-4 text-rose-500" />
                  <span className="text-sm font-semibold text-slate-900 truncate">
                    {item.original_filename || item.title}
                  </span>
                  {item.file_type ? (
                    <span className="text-[11px] font-bold text-slate-500">.{String(item.file_type).toLowerCase()}</span>
                  ) : null}
                </div>

                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    value={extractionQuery}
                    onChange={(e) => setExtractionQuery(e.target.value)}
                    placeholder="Search extraction…"
                    className="w-full bg-white border border-slate-200 rounded-full pl-10 pr-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  />
                  {extractionQuery.trim() ? (
                    <button
                      type="button"
                      onClick={() => setExtractionQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-500 hover:text-slate-800"
                      aria-label="Clear search"
                      title="Clear"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {item.status && (
                  <span className={`hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusPill(item.status)}`}>
                    {String(item.status).toUpperCase()}
                  </span>
                )}

                <div className="relative" ref={downloadRef}>
                  <button
                    type="button"
                    onClick={() => setDownloadOpen((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0F141F] text-white px-4 py-2 text-sm font-semibold hover:bg-[#0F141F]/90"
                    disabled={busy || loading}
                  >
                    <Download className="w-4 h-4" />
                    Download
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {downloadOpen && (
                    <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden z-20 anim-slide-down">
                      <button
                        type="button"
                        className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50"
                        onClick={() => {
                          setDownloadOpen(false);
                          downloadStyledReportHtml();
                        }}
                      >
                        Styled report (HTML)
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50"
                        onClick={() => {
                          setDownloadOpen(false);
                          printStyledReport();
                        }}
                      >
                        Styled report (Print/PDF)
                      </button>
                      <div className="h-px bg-slate-100" />
                      <button
                        type="button"
                        className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50"
                        onClick={() => {
                          setDownloadOpen(false);
                          void downloadReport('pdf');
                        }}
                      >
                        Report (PDF) – basic
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50"
                        onClick={() => {
                          setDownloadOpen(false);
                          void downloadReport('txt');
                        }}
                      >
                        Report (TXT) – basic
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50"
                        onClick={() => {
                          setDownloadOpen(false);
                          openOriginal();
                        }}
                        disabled={!fileUrl}
                      >
                        Original file
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={openOriginal}
                  className="hidden md:inline-flex items-center justify-center w-11 h-11 rounded-full bg-white border border-slate-200"
                  aria-label="Open original"
                  disabled={!fileUrl}
                  title="Open original"
                >
                  <Eye className="w-5 h-5 text-slate-700" />
                </button>
              </div>
            </div>

            {/* Mobile extracted data toggle */}
            <div className="lg:hidden flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowExtractedMobile((v) => !v)}
                className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Extracted Data
                <ChevronDown className={`w-4 h-4 transition ${showExtractedMobile ? 'rotate-180' : 'rotate-0'}`} />
              </button>
              {readyLike && (
                <Chip tone="emerald">Analyzed</Chip>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(480px,45%),1fr] xl:grid-cols-[minmax(540px,46%),1fr] gap-6">
              {/* Left Panel */}
              <div className={`${showExtractedMobile ? 'block' : 'hidden'} lg:block lg:sticky lg:top-6 lg:self-start anim-fade-up`}> 
                <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm max-h-[calc(100vh-140px)] overflow-auto">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-slate-900">Analysis &amp; Clauses</div>
                      <div className="text-xs text-slate-500 mt-1">AI review + clause matching</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => printStyledReport()}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700"
                      disabled={busy || loading}
                      title="Export styled report"
                    >
                      Export Report
                    </button>
                  </div>

                  {q ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
                      Showing <span className="font-extrabold">{filteredClauses.length}</span> clauses and{' '}
                      <span className="font-extrabold">{filteredSuggestions.length}</span> suggestions for “{extractionQuery.trim()}”.
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-3xl bg-slate-50 border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-extrabold text-slate-900">Analysis Summary</div>
                      <Chip tone={(String(analysisSummary?.risk_level || '').toUpperCase() === 'HIGH') ? 'rose' : (String(analysisSummary?.risk_level || '').toUpperCase() === 'MEDIUM') ? 'amber' : 'emerald'}>
                        {String(analysisSummary?.risk_level || 'MEDIUM').toUpperCase()} RISK
                      </Chip>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {[
                        { label: 'CLAUSES', value: Number(analysisSummary?.clauses_count || clauses.length || 0) },
                        { label: 'OBLIGATIONS', value: Number(analysisSummary?.obligations_count || obligations.length || 0) },
                        { label: 'CONSTRAINTS', value: Number(analysisSummary?.constraints_count || constraints.length || 0) },
                      ].map((x) => (
                        <div key={x.label} className="rounded-2xl bg-white border border-slate-200 p-3 text-center">
                          <div className="text-lg font-extrabold text-slate-900">{x.value}</div>
                          <div className="text-[10px] font-bold text-slate-500 mt-1">{x.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick metrics (matches screenshot tiles) */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {[
                      {
                        label: 'TOTAL CLAUSES',
                        value: String(Number(analysisSummary?.clauses_count || clauses.length || 0)),
                      },
                      {
                        label: 'AMOUNT',
                        value: primaryValue || '—',
                      },
                      {
                        label: 'PARTIES',
                        value: partiesChip || (parties.length ? `${String(parties.length)} parties` : '—'),
                      },
                      {
                        label: 'DATE',
                        value: effectiveDate || (dates[0]?.value ? String(dates[0].value) : '—'),
                      },
                    ].map((x) => (
                      <div key={x.label} className="rounded-3xl border border-slate-200 bg-white p-4" title={x.value}>
                        <div className="text-[10px] font-bold text-slate-500 tracking-wide">{x.label}</div>
                        <div className="mt-2 text-lg font-extrabold text-slate-900 truncate">{x.value}</div>
                      </div>
                    ))}
                  </div>

                  {!readyLike && (
                    <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4">
                      <div className="text-sm font-semibold text-amber-900">Analysis pending</div>
                      <div className="text-xs text-amber-800 mt-1">Processing may take a moment.</div>
                    </div>
                  )}

                  {item.status === 'failed' && (
                    <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-200 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-rose-800">
                        <TriangleAlert className="w-4 h-4" />
                        Review failed
                      </div>
                      <div className="text-xs text-rose-700 mt-2 whitespace-pre-wrap">
                        {item.error_message || 'Unknown error'}
                      </div>
                    </div>
                  )}

                  <div className="mt-6">
                    <div className="text-[11px] font-bold text-slate-500">EXTRACTED DATA</div>
                    <div className="mt-3 flex flex-col gap-2">
                      {partiesChip ? (
                        <Chip tone="violet">Parties: {partiesChip}</Chip>
                      ) : null}
                      {effectiveDate ? (
                        <Chip tone="amber">Eff: {String(effectiveDate)}</Chip>
                      ) : null}
                      {endDate ? (
                        <Chip tone="rose">Exp: {String(endDate)}</Chip>
                      ) : null}
                      {primaryValue ? (
                        <Chip tone="emerald">Value: {primaryValue}</Chip>
                      ) : null}
                      {jurisdiction ? (
                        <Chip tone="violet">Jurisdiction: {jurisdiction}</Chip>
                      ) : null}

                      {!partiesChip && !effectiveDate && !endDate && !primaryValue && !jurisdiction ? (
                        <span className="text-sm text-slate-500">—</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-bold text-slate-500">DETECTED CLAUSES</div>
                      <Chip tone="slate">{filteredClauses.length} found</Chip>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500">Match indicates similarity vs your clause library.</div>

                    <div className="mt-3 space-y-3">
                      {filteredClauses.length === 0 ? (
                        <div className="text-sm text-slate-500">—</div>
                      ) : (
                        (showAllClauses ? filteredClauses : filteredClauses.slice(0, 12)).map((c: any, idx: number) => {
                          const category = String(c?.category || 'Clause');
                          const title = String(c?.title || c?.matched_library?.title || category);
                          const snippet = String(c?.snippet || '').trim();
                          const pct = typeof c?.match_percent === 'number' ? c.match_percent : null;
                          const matchUi = clauseMatchLabel(c?.match_percent);
                          const recommendation = getClauseRecommendation(c);
                          const clauseKey = String(c?.id || `${category}:${title}:${idx}`);
                          const isExpanded = Boolean(expandedClause[clauseKey]);

                          const extracted = snippet || String(c?.extracted_text || c?.text || '').trim();
                          const extractedShort = truncate(extracted, 260);
                          const recommendationShort = truncate(recommendation || '', 260);
                          const autoExpanded = Boolean(q) && (
                            extracted.toLowerCase().includes(q) || String(recommendation || '').toLowerCase().includes(q)
                          );
                          const expanded = isExpanded || autoExpanded;
                          const hasMore =
                            (extracted && extractedShort && extracted !== extractedShort) ||
                            (recommendation && recommendationShort && String(recommendation).trim() !== recommendationShort);
                          return (
                            <div
                              key={clauseKey}
                              className="rounded-3xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-900 truncate">{title}</div>
                                  <div className="text-[11px] font-bold text-slate-500 truncate">{category}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Chip tone={matchUi.tone}>{matchUi.label}</Chip>
                                  <Chip tone="slate">{pct != null ? `${pct}%` : '—'}</Chip>
                                </div>
                              </div>

                              <div className="mt-3 grid grid-cols-1 xl:grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                                  <div className="text-[10px] font-bold tracking-wide text-slate-500">EXTRACTED TEXT</div>
                                  <div className="mt-2 text-xs text-slate-700 whitespace-pre-wrap">
                                    {expanded ? highlight(extracted || '—', extractionQuery) : highlight(extractedShort || '—', extractionQuery)}
                                  </div>
                                </div>
                                <div className="rounded-2xl border border-rose-200 bg-rose-50/30 p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-[10px] font-bold tracking-wide text-rose-600">RECOMMENDATION</div>
                                    {recommendation ? (
                                      <button
                                        type="button"
                                        className="text-[10px] font-extrabold text-slate-600 hover:text-slate-900"
                                        onClick={async () => {
                                          await copyText(String(recommendation));
                                        }}
                                        title="Copy recommendation"
                                      >
                                        Copy
                                      </button>
                                    ) : null}
                                  </div>
                                  <div className="mt-2 text-xs text-slate-800 whitespace-pre-wrap">
                                    {expanded ? highlight(recommendation || '—', extractionQuery) : highlight(recommendationShort || '—', extractionQuery)}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                                <div className="text-[11px] font-bold text-slate-400">&nbsp;</div>
                                <div className="flex items-center gap-2">
                                  {hasMore ? (
                                    <button
                                      type="button"
                                      className="rounded-full bg-white border border-slate-200 text-slate-700 px-4 py-2 text-xs font-extrabold hover:bg-slate-50"
                                      onClick={() =>
                                        setExpandedClause((prev) => ({ ...prev, [clauseKey]: !Boolean(prev[clauseKey]) }))
                                      }
                                    >
                                      {isExpanded ? 'Show less' : 'Show more'}
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {filteredClauses.length > 12 && (
                      <div className="mt-3">
                        <button
                          type="button"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                          onClick={() => setShowAllClauses((v) => !v)}
                        >
                          {showAllClauses ? 'Show fewer clauses' : `Show all clauses (${filteredClauses.length})`}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-6">
                    <div className="text-[11px] font-bold text-slate-500">SUMMARY</div>
                    <div className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">
                      {summary || '—'}
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="text-[11px] font-bold text-slate-500">SUGGESTIONS</div>
                    <div className="mt-3 space-y-3">
                      {filteredSuggestions.length === 0 ? (
                        <div className="text-sm text-slate-500">—</div>
                      ) : (
                        filteredSuggestions.slice(0, 8).map((s: any, idx: number) => (
                          <div key={idx} className="rounded-3xl border border-rose-100 bg-rose-50/40 p-4">
                            <div className="text-sm font-semibold text-slate-900">{s?.title || 'Suggestion'}</div>
                            <div className="text-xs text-slate-700 mt-2 whitespace-pre-wrap">{highlight(String(s?.text || ''), extractionQuery)}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel */}
              <div className="space-y-6 anim-fade-up" id="document-preview">
                <div className="bg-white rounded-[28px] border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 md:px-6 md:py-4 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="font-extrabold text-slate-900">Document Preview</div>
                      <div className="text-xs text-slate-500">{item.file_type?.toLowerCase() === 'pdf' ? 'PDF' : 'Document'}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="w-10 h-10 rounded-full bg-white border border-slate-200 inline-flex items-center justify-center"
                        onClick={() => setZoom((z) => Math.max(50, z - 10))}
                        aria-label="Zoom out"
                      >
                        <Minus className="w-4 h-4 text-slate-700" />
                      </button>
                      <div className="text-xs font-bold text-slate-600 w-14 text-center">{zoom}%</div>
                      <button
                        type="button"
                        className="w-10 h-10 rounded-full bg-white border border-slate-200 inline-flex items-center justify-center"
                        onClick={() => setZoom((z) => Math.min(150, z + 10))}
                        aria-label="Zoom in"
                      >
                        <Plus className="w-4 h-4 text-slate-700" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 md:p-6">
                    {!fileUrl ? (
                      <div className="text-sm text-slate-500">No preview URL available.</div>
                    ) : fileText != null ? (
                      <pre className="whitespace-pre-wrap text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl p-4 max-h-[70vh] overflow-auto">
                        {fileText}
                      </pre>
                    ) : (item.file_type || '').toLowerCase() === 'pdf' ? (
                      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
                        {/* Browser PDF viewer doesn't expose zoom reliably; we mimic zoom via CSS scale. */}
                        <div
                          className="origin-top-left"
                          style={{ transform: `scale(${zoom / 100})`, width: `${100 / (zoom / 100)}%` }}
                        >
                          <iframe
                            src={fileUrl}
                            className="w-full h-[72vh]"
                            title="Original Document"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-700">
                        Preview isn’t available for this file type. Use “Original file” from Download.
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-xs text-slate-500">
                        {summary ? 'Summary available' : 'No summary available yet'}
                      </div>
                      {readyLike ? (
                        <Chip tone="emerald">Analyzed</Chip>
                      ) : (
                        <Chip tone="amber">AI Analysis Pending</Chip>
                      )}
                    </div>
                  </div>
                </div>

                {/* Editor-style extracted review notes */}
                <div className="bg-white rounded-[28px] border border-slate-200 p-6">
                  <div className="font-extrabold text-slate-900">Review Notes (Editor)</div>
                  <div className="text-xs text-slate-500 mt-1">Read-only view of the AI reviewer output</div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-sm text-slate-800 whitespace-pre-wrap">
                      {item.review_text?.trim() ? item.review_text : '—'}
                    </div>
                  </div>
                  {!hasAnyStructured && (
                    <div className="mt-4 text-sm text-slate-600">
                      No structured extraction found yet. Upload a clearer PDF/DOCX and try again.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
