'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from './DashboardLayout';
import RichTextEditor from './RichTextEditor';
import { ApiClient, Contract } from '@/app/lib/api-client';
import { sanitizeEditorHtml } from '@/app/lib/sanitize-html';

type ClauseCard = {
  id: string;
  clause_id?: string;
  name?: string;
  content?: string;
};

const ContractEditorPageV2: React.FC = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const contractId = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [clauses, setClauses] = useState<ClauseCard[]>([]);
  const [clauseSearch, setClauseSearch] = useState('');
  const [clauseLimit, setClauseLimit] = useState(50);

  const editorApiRef = useRef<Editor | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  const [editorHtml, setEditorHtml] = useState('');
  const [editorText, setEditorText] = useState('');
  const streamThrottleRef = useRef(0);
  const [dirty, setDirty] = useState(false);
  const [editTick, setEditTick] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);
  const aiTextRef = useRef<string>('');
  const aiStartedRef = useRef<boolean>(false);

  const escapeHtml = (s: string) =>
    (s || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

  const textToHtml = (text: string) => {
    const safe = escapeHtml(text || '');
    // Preserve newlines. Split on double newlines into paragraphs.
    const paras = safe
      .split(/\n{2,}/)
      .map((p) => p.replace(/\n/g, '<br/>'))
      .filter((p) => p.trim().length > 0);

    return paras.length ? paras.map((p) => `<p>${p}</p>`).join('') : '<p></p>';
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    let alive = true;

    async function load() {
      if (!contractId) return;
      try {
        setLoading(true);
        setError(null);
        const client = new ApiClient();
        const res = await client.getContractById(contractId);
        if (!alive) return;

        if (res.success) {
          const raw: any = res.data as any;
          const unwrapped: any = raw?.contract ?? raw?.data?.contract ?? raw?.data ?? raw;
          setContract(unwrapped as any);
        } else {
          setError(res.error || 'Failed to load contract');
        }
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'Failed to load contract');
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [contractId]);

  // Initialize editor HTML from contract once it loads.
  useEffect(() => {
    const c = contract as any;
    const renderedHtml: string | undefined = c?.rendered_html || c?.metadata?.rendered_html;
    const renderedText: string = c?.rendered_text || c?.metadata?.rendered_text || '';
    const initialHtml = renderedHtml && String(renderedHtml).trim().length > 0 ? String(renderedHtml) : textToHtml(renderedText);

    setEditorHtml(initialHtml || '');
    setEditorText(renderedText || '');
    editorApiRef.current?.commands.setContent(initialHtml || '', { emitUpdate: false });
    setEditorReady(true);
    setDirty(false);
    setSaveError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId, (contract as any)?.id]);

  useEffect(() => {
    let alive = true;
    async function loadClauses() {
      try {
        const client = new ApiClient();
        const res = await client.getClauses();
        if (!alive) return;
        if (res.success) {
          const list = Array.isArray(res.data)
            ? (res.data as any[])
            : ((res.data as any)?.results || []);
          setClauses(list);
        } else {
          setClauses([]);
        }
      } catch {
        if (!alive) return;
        setClauses([]);
      }
    }
    loadClauses();
    return () => {
      alive = false;
    };
  }, []);

  const title = (contract as any)?.title || (contract as any)?.name || 'Contract';
  const updatedAt = (contract as any)?.updated_at ? new Date((contract as any).updated_at).toLocaleString() : null;

  const saveNow = async () => {
    if (!contractId) return;
    const rawHtml = editorApiRef.current?.getHTML() ?? editorHtml;
    const rawText = editorApiRef.current?.getText() ?? editorText;

    const html = sanitizeEditorHtml(rawHtml);
    const text = String(rawText || '');

    try {
      setSaving(true);
      setSaveError(null);
      const client = new ApiClient();
      const res = await client.updateContractContent(contractId, {
        rendered_html: html,
        rendered_text: text,
      });
      if (res.success) {
        setContract(res.data as any);
        setDirty(false);
      } else {
        setSaveError(res.error || 'Failed to save');
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Auto-save with a small debounce.
  useEffect(() => {
    if (!editorReady) return;
    if (!dirty) return;
    if (aiGenerating) return;
    const t = window.setTimeout(() => {
      saveNow();
    }, 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTick, dirty, editorReady, contractId, aiGenerating]);

  const runAi = async () => {
    if (!contractId) return;
    const prompt = aiPrompt.trim();
    if (!prompt) return;

    setAiError(null);
    setAiGenerating(true);
    aiTextRef.current = '';
    aiStartedRef.current = false;

    const abort = new AbortController();
    aiAbortRef.current = abort;

    try {
      const client = new ApiClient();
      const currentText = editorApiRef.current?.getText() ?? editorText;
      await client.streamContractAiGenerate(
        contractId,
        {
          prompt,
          current_text: String(currentText || ''),
        },
        {
          signal: abort.signal,
          onDelta: (delta) => {
            aiTextRef.current += delta;
            if (!editorApiRef.current) return;
            const now = Date.now();
            if (now - streamThrottleRef.current < 50) return;
            streamThrottleRef.current = now;
            const nextHtml = textToHtml(aiTextRef.current);
            if (!aiStartedRef.current) {
              aiStartedRef.current = true;
              editorApiRef.current.commands.setContent('', { emitUpdate: false });
            }
            editorApiRef.current.commands.setContent(nextHtml, { emitUpdate: false });
            setEditorHtml(nextHtml);
            setEditorText(aiTextRef.current);
          },
          onError: (err) => {
            setAiError(err || 'AI generation failed');
          },
          onDone: () => {
            // no-op here; we handle after await
          },
        }
      );

      // Mark dirty and persist once (avoid saving every streamed chunk).
      setDirty(true);
      setEditTick((t) => t + 1);
      await saveNow();
    } catch (e) {
      if ((e as any)?.name === 'AbortError') {
        setAiError('Generation cancelled');
      } else {
        setAiError(e instanceof Error ? e.message : 'AI generation failed');
      }
    } finally {
      setAiGenerating(false);
      aiAbortRef.current = null;
    }
  };

  const cancelAi = () => {
    aiAbortRef.current?.abort();
  };

  const downloadPdf = async () => {
    if (!contractId) return;
    const client = new ApiClient();
    const res = await client.downloadContractPdf(contractId);
    if (res.success && res.data) {
      triggerDownload(res.data, `${title.replace(/\s+/g, '_')}.pdf`);
    } else {
      setError(res.error || 'Failed to download PDF');
    }
  };

  const downloadTxt = async () => {
    if (!contractId) return;
    const client = new ApiClient();
    const res = await client.downloadContractTxt(contractId);
    if (res.success && res.data) {
      triggerDownload(res.data, `${title.replace(/\s+/g, '_')}.txt`);
    } else {
      setError(res.error || 'Failed to download TXT');
    }
  };

  const filteredClauses = useMemo(() => {
    const q = clauseSearch.trim().toLowerCase();
    if (!q) return clauses;
    return clauses.filter((c) => {
      const hay = `${c.clause_id || ''} ${c.name || ''} ${c.content || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [clauses, clauseSearch]);

  const insertClauseIntoEditor = (clause: ClauseCard) => {
    const ed = editorApiRef.current;
    if (!ed) return;

    const header = clause.name ? `<p><strong>${escapeHtml(String(clause.name))}</strong></p>` : '';
    const body = clause.content ? textToHtml(String(clause.content)) : '';
    const payload = `${header}${body}<p></p>`;
    ed.chain().focus().insertContent(payload).run();
    setDirty(true);
    setEditTick((t) => t + 1);
  };

  useEffect(() => {
    // Reset pagination when searching.
    setClauseLimit(50);
  }, [clauseSearch]);

  return (
    <DashboardLayout>
      <div className="bg-[#F2F0EB]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full bg-white border border-black/10 shadow-sm grid place-items-center text-black/45 hover:text-black"
              aria-label="Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-[#111827] truncate">{title}</h1>
                {updatedAt && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs text-black/45 font-medium">
                      {saving ? 'Saving…' : dirty ? 'Unsaved changes' : `Updated ${updatedAt}`}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-black/40 mt-1 truncate">Contract ID: {String(contractId || '')}</p>
              {saveError && <p className="text-xs text-rose-600 mt-1">{saveError}</p>}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">
          {/* Clause Library */}
          <aside className="col-span-12 lg:col-span-3 bg-white rounded-[28px] border border-black/5 shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-black/5">
              <p className="text-sm font-semibold text-[#111827]">Clause Library</p>
              <div className="mt-3 flex items-center gap-2 bg-[#F6F3ED] rounded-full px-4 py-2">
                <svg className="w-4 h-4 text-black/35" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  className="bg-transparent outline-none text-sm w-full"
                  placeholder="Search clauses..."
                  value={clauseSearch}
                  onChange={(e) => setClauseSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
              {filteredClauses.length === 0 ? (
                <div className="text-sm text-black/45 p-2">No clauses available.</div>
              ) : (
                filteredClauses.slice(0, clauseLimit).map((c) => (
                  <div key={c.id} className="rounded-2xl border border-black/5 bg-[#F6F3ED] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] tracking-wider font-bold text-[#FF5C7A]">{c.clause_id || 'CLAUSE'}</p>
                        <p className="text-sm font-semibold text-[#111827] mt-1 truncate">{c.name || 'Untitled clause'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => insertClauseIntoEditor(c)}
                        className="h-9 px-3 rounded-full bg-white border border-black/10 text-sm font-semibold text-[#0F141F] hover:bg-black/5"
                        aria-label="Insert clause into editor"
                        title="Insert into editor"
                      >
                        + Add
                      </button>
                    </div>
                    {c.content && <p className="text-xs text-black/45 mt-2 leading-relaxed line-clamp-3">{c.content}</p>}
                  </div>
                ))
              )}

              {filteredClauses.length > clauseLimit && (
                <button
                  type="button"
                  onClick={() => setClauseLimit((n) => n + 50)}
                  className="w-full h-10 rounded-full border border-black/10 bg-white text-sm font-semibold text-black/70 hover:bg-black/5"
                >
                  Show more ({filteredClauses.length - clauseLimit} remaining)
                </button>
              )}

              {filteredClauses.length > 0 && (
                <div className="text-[11px] text-black/40 px-1">
                  Showing {Math.min(filteredClauses.length, clauseLimit)} of {filteredClauses.length} clauses
                </div>
              )}
            </div>
          </aside>

          {/* Editor */}
          <section className="col-span-12 lg:col-span-6 bg-white rounded-[28px] border border-black/5 shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-black/5 flex items-center justify-between">
              <div className="text-sm font-semibold text-[#111827]">Editor</div>
              <div className="flex items-center gap-2 relative">
                <button
                  onClick={downloadPdf}
                  className="h-10 px-4 rounded-full bg-[#0F141F] text-white text-sm font-semibold"
                  type="button"
                >
                  Download
                </button>
                <button
                  onClick={() => setMoreOpen((v) => !v)}
                  className="w-10 h-10 rounded-full hover:bg-black/5 text-black/45"
                  aria-label="More"
                  type="button"
                >
                  <svg className="w-6 h-6 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>

                {moreOpen && (
                  <div className="absolute right-0 top-12 w-48 bg-white rounded-2xl border border-black/10 shadow-lg overflow-hidden z-20">
                    <button
                      onClick={() => {
                        setMoreOpen(false);
                        downloadPdf();
                      }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-black/5"
                      type="button"
                    >
                      Download PDF
                    </button>
                    <button
                      onClick={() => {
                        setMoreOpen(false);
                        downloadTxt();
                      }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-black/5"
                      type="button"
                    >
                      Download TXT
                    </button>
                    <button
                      onClick={() => {
                        setMoreOpen(false);
                        saveNow();
                      }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-black/5"
                      type="button"
                    >
                      Save now
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
              {loading ? (
                <div className="text-sm text-black/45">Loading contract…</div>
              ) : !contract ? (
                <div className="text-sm text-black/45">No contract found.</div>
              ) : (
                <RichTextEditor
                  valueHtml={editorHtml}
                  disabled={aiGenerating}
                  onEditorReady={(ed) => {
                    editorApiRef.current = ed;
                    setEditorReady(!!ed);
                  }}
                  onChange={(html, text) => {
                    setEditorHtml(html);
                    setEditorText(text);
                    setDirty(true);
                    setEditTick((t) => t + 1);
                  }}
                  editorClassName={`min-h-[60vh] rounded-2xl border border-black/10 bg-white px-5 py-4 text-[13px] leading-6 text-slate-900 font-serif outline-none ${aiGenerating ? 'opacity-80' : ''}`}
                />
              )}
            </div>
          </section>

          {/* Collaboration */}
          <aside className="col-span-12 lg:col-span-3 space-y-6">
            <div className="bg-white rounded-[28px] border border-black/5 shadow-sm overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-black/5">
                <p className="text-sm font-semibold text-[#111827]">AI Content Generation</p>
                <p className="text-xs text-black/45 mt-1">Type an instruction; the editor updates live.</p>
              </div>
              <div className="p-5">
                <textarea
                  className="w-full min-h-[110px] rounded-2xl bg-[#F6F3ED] border border-black/5 px-4 py-3 text-sm outline-none resize-none"
                  placeholder="e.g. Change payment terms to Net 45, add a late fee, and update the compensation section accordingly."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  disabled={aiGenerating}
                />

                {aiError && <div className="text-xs text-rose-600 mt-2">{aiError}</div>}

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={runAi}
                    disabled={aiGenerating || !aiPrompt.trim()}
                    className="h-10 px-4 rounded-full bg-[#FF5C7A] text-white text-sm font-semibold disabled:opacity-60"
                  >
                    {aiGenerating ? 'Generating…' : 'Apply to Editor'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelAi}
                    disabled={!aiGenerating}
                    className="h-10 px-4 rounded-full bg-white border border-black/10 text-black/70 text-sm font-semibold disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[28px] border border-black/5 shadow-sm overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-black/5">
                <p className="text-sm font-semibold text-[#111827]">Collaboration</p>
              </div>
              <div className="p-5">
                <div className="text-sm text-black/45">No collaboration activity yet.</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ContractEditorPageV2;
