'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Editor } from '@tiptap/react';
import { useAuth } from '../lib/auth-context';
import {
  ApiClient,
  Clause,
  FileTemplateItem,
  TemplateFileSchemaResponse,
  TemplateSchemaField,
  TemplateSchemaSection,
} from '../lib/api-client';
import DashboardLayout from '../components/DashboardLayout';
import RichTextEditor from '../components/RichTextEditor';
import { ChevronLeft, FileText, Search, Sparkles } from 'lucide-react';
import { sanitizeEditorHtml } from '../lib/sanitize-html';

// Types
type Template = FileTemplateItem;

type Mode = 'templates' | 'ai';
type AiStep = 'select' | 'edit';

type CustomClause = { title?: string; content: string };
type Constraint = { name: string; value: string };
type ConstraintTemplate = { key: string; label: string; category?: string; default?: string };

type TemplateDraft = {
  template: string;
  fieldValues: Record<string, string>;
  selectedClauseIds: string[];
  customClauses: CustomClause[];
  constraints: Constraint[];
  updatedAt: number;
};

type GenerationContext = TemplateDraft & {
  contractId: string;
  createdAt: number;
};

const STANDARD_TEMPLATES_ORDER = [
  'Mutual_NDA.txt',
  'MSA_Master_Services.txt',
  'SOW_Statement_of_Work.txt',
  'Contractor_Agreement.txt',
];

const TEMPLATE_CARD_META: Record<
  string,
  { title: string; subtitle: string; pill: string; eta: string; iconBg: string; icon: React.ReactNode }
> = {
  'Mutual_NDA.txt': {
    title: 'Mutual NDA',
    subtitle: 'Protect confidential information between two parties.',
    pill: 'Standard',
    eta: '~5 mins',
    iconBg: 'bg-blue-50 text-blue-600',
    icon: <FileText className="w-5 h-5" />,
  },
  'MSA_Master_Services.txt': {
    title: 'MSA (Master Services)',
    subtitle: 'Framework agreement for ongoing service relationships.',
    pill: 'Complex',
    eta: '~15 mins',
    iconBg: 'bg-orange-50 text-orange-600',
    icon: <FileText className="w-5 h-5" />,
  },
  'SOW_Statement_of_Work.txt': {
    title: 'SOW (Statement of Work)',
    subtitle: 'Define specific project deliverables and timelines.',
    pill: 'Project',
    eta: '~10 mins',
    iconBg: 'bg-emerald-50 text-emerald-600',
    icon: <FileText className="w-5 h-5" />,
  },
  'Contractor_Agreement.txt': {
    title: 'Contractor Agreement',
    subtitle: 'Terms for independent contractors and freelancers.',
    pill: 'HR',
    eta: '~8 mins',
    iconBg: 'bg-violet-50 text-violet-600',
    icon: <FileText className="w-5 h-5" />,
  },
};

const CreateContractInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('templates');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateQuery, setTemplateQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schema, setSchema] = useState<TemplateFileSchemaResponse | null>(null);

  const [clausesLoading, setClausesLoading] = useState(false);
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [clauseQuery, setClauseQuery] = useState('');
  const [selectedClauseIds, setSelectedClauseIds] = useState<string[]>([]);

  const [customClauses, setCustomClauses] = useState<CustomClause[]>([]);
  const [constraints, setConstraints] = useState<Constraint[]>([]);

  const [constraintLibrary, setConstraintLibrary] = useState<ConstraintTemplate[]>([]);
  const [constraintLibraryLoading, setConstraintLibraryLoading] = useState(false);
  const [constraintLibraryQuery, setConstraintLibraryQuery] = useState('');

  const [previewText, setPreviewText] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const [templateDraftUpdatedAt, setTemplateDraftUpdatedAt] = useState<number | null>(null);
  const [templateDraftRestored, setTemplateDraftRestored] = useState(false);

  const [aiStep, setAiStep] = useState<AiStep>('select');
  const [aiTitle, setAiTitle] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBaseText, setAiBaseText] = useState('');
  const [aiBaseHtml, setAiBaseHtml] = useState('');
  const [aiSuggestionText, setAiSuggestionText] = useState('');
  const [aiTemplateQuery, setAiTemplateQuery] = useState('');
  const [aiLoadingTemplate, setAiLoadingTemplate] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDraftUpdatedAt, setAiDraftUpdatedAt] = useState<number | null>(null);
  const aiAbortRef = useRef<AbortController | null>(null);
  const aiEditorApiRef = useRef<Editor | null>(null);
  const aiAutoStartTemplateRef = useRef<string>('');

  type AiDraft = {
    template: string;
    title: string;
    html: string;
    text: string;
    updatedAt: number;
  };

  const userDraftKey = useMemo(() => {
    const u: any = user as any;
    return String(u?.user_id || u?.id || u?.email || 'anon');
  }, [user]);

  const getAiDraftStorageKey = (templateFilename: string) => `clm:aiBuilderDraft:v1:${userDraftKey}:${templateFilename}`;

  const getTemplateDraftStorageKey = (templateFilename: string) =>
    `clm:templateGeneratorDraft:v1:${userDraftKey}:${templateFilename}`;

  const readTemplateDraft = (templateFilename: string): TemplateDraft | null => {
    try {
      const raw = localStorage.getItem(getTemplateDraftStorageKey(templateFilename));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return null;
      return {
        template: String((obj as any).template || templateFilename),
        fieldValues: ((obj as any).fieldValues || {}) as Record<string, string>,
        selectedClauseIds: (Array.isArray((obj as any).selectedClauseIds) ? (obj as any).selectedClauseIds : []) as string[],
        customClauses: (Array.isArray((obj as any).customClauses) ? (obj as any).customClauses : []) as CustomClause[],
        constraints: (Array.isArray((obj as any).constraints) ? (obj as any).constraints : []) as Constraint[],
        updatedAt: Number((obj as any).updatedAt || 0),
      };
    } catch {
      return null;
    }
  };

  const writeTemplateDraft = (templateFilename: string, draft: TemplateDraft) => {
    try {
      localStorage.setItem(getTemplateDraftStorageKey(templateFilename), JSON.stringify(draft));
    } catch {
      // Ignore storage quota/availability issues.
    }
  };

  const clearTemplateDraft = (templateFilename: string) => {
    try {
      localStorage.removeItem(getTemplateDraftStorageKey(templateFilename));
    } catch {
      // Ignore.
    }
  };

  const getGenerationContextKey = (contractId: string) => `clm:contractGenerationContext:v1:${contractId}`;

  const writeGenerationContext = (ctx: GenerationContext) => {
    try {
      localStorage.setItem(getGenerationContextKey(ctx.contractId), JSON.stringify(ctx));
    } catch {
      // Ignore.
    }
  };

  const readAiDraft = (templateFilename: string): AiDraft | null => {
    try {
      const raw = localStorage.getItem(getAiDraftStorageKey(templateFilename));
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return null;
      return {
        template: String((obj as any).template || templateFilename),
        title: String((obj as any).title || ''),
        html: String((obj as any).html || ''),
        text: String((obj as any).text || ''),
        updatedAt: Number((obj as any).updatedAt || 0),
      };
    } catch {
      return null;
    }
  };

  const writeAiDraft = (templateFilename: string, draft: AiDraft) => {
    try {
      localStorage.setItem(getAiDraftStorageKey(templateFilename), JSON.stringify(draft));
    } catch {
      // Ignore storage quota/availability issues.
    }
  };

  const clearAiDraft = (templateFilename: string) => {
    try {
      localStorage.removeItem(getAiDraftStorageKey(templateFilename));
    } catch {
      // Ignore.
    }
  };

  const escapeHtml = (s: string) =>
    (s || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

  const textToHtml = (text: string) => {
    const safe = escapeHtml(text || '');
    return `<p>${safe.replace(/\n/g, '<br/>')}</p>`;
  };

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const filename = searchParams.get('template');
    if (filename) setSelectedTemplate(filename);
  }, [searchParams]);

  useEffect(() => {
    const m = (searchParams.get('mode') || searchParams.get('builder') || '').toLowerCase();
    if (m === 'ai') setMode('ai');
  }, [searchParams]);

  useEffect(() => {
    if (!selectedTemplate) {
      setSchema(null);
      setFieldValues({});
      setSelectedClauseIds([]);
      setCustomClauses([]);
      setConstraints([]);
      setPreviewText('');

      setTemplateDraftUpdatedAt(null);
      setTemplateDraftRestored(false);

      setAiStep('select');
      setAiTitle('');
      setAiPrompt('');
      setAiBaseText('');
      setAiBaseHtml('');
      setAiSuggestionText('');
      setAiError(null);
      setAiDraftUpdatedAt(null);
      return;
    }

    const loadSchemaAndClauses = async () => {
      try {
        setSchemaLoading(true);
        const client = new ApiClient();
        const schemaRes = await client.getTemplateFileSchema(selectedTemplate);
        if (!schemaRes.success) {
          setSchema(null);
          return;
        }

        const s = schemaRes.data as any as TemplateFileSchemaResponse;
        setSchema(s);

        // Ensure fieldValues has keys for required schema fields.
        const requiredKeys: string[] = [];
        for (const section of s.sections || []) {
          for (const field of section.fields || []) {
            if (field?.key) requiredKeys.push(field.key);
          }
        }
        setFieldValues((prev) => {
          const next: Record<string, string> = { ...prev };
          for (const k of requiredKeys) {
            if (next[k] === undefined) next[k] = '';
          }
          return next;
        });

        setClausesLoading(true);
        const clausesRes = await client.getClauses({ contract_type: s.template_type });
        if (clausesRes.success) {
          const data: any = clausesRes.data as any;
          const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
          setClauses(list);
        } else {
          setClauses([]);
        }

        setConstraintLibraryLoading(true);
        const consRes = await client.getConstraintsLibrary({});
        if (consRes.success) {
          const data: any = consRes.data as any;
          const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
          setConstraintLibrary(list);
        } else {
          setConstraintLibrary([]);
        }
      } finally {
        setSchemaLoading(false);
        setClausesLoading(false);
        setConstraintLibraryLoading(false);
      }
    };

    loadSchemaAndClauses();
  }, [selectedTemplate]);

  // Restore template-mode draft when selecting a template (only if current state is empty).
  useEffect(() => {
    if (mode !== 'templates') return;
    if (!user) return;
    if (!selectedTemplate) return;
    const empty =
      Object.keys(fieldValues || {}).length === 0 &&
      (selectedClauseIds || []).length === 0 &&
      (customClauses || []).length === 0 &&
      (constraints || []).length === 0;
    if (!empty) return;

    const draft = readTemplateDraft(selectedTemplate);
    if (!draft) {
      setTemplateDraftUpdatedAt(null);
      setTemplateDraftRestored(false);
      return;
    }

    setFieldValues(draft.fieldValues || {});
    setSelectedClauseIds(draft.selectedClauseIds || []);
    setCustomClauses(draft.customClauses || []);
    setConstraints(draft.constraints || []);
    setTemplateDraftUpdatedAt(draft.updatedAt || null);
    setTemplateDraftRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user, selectedTemplate]);

  // Auto-save template-mode draft locally.
  useEffect(() => {
    if (mode !== 'templates') return;
    if (!user) return;
    if (!selectedTemplate) return;

    const t = window.setTimeout(() => {
      const draft: TemplateDraft = {
        template: selectedTemplate,
        fieldValues: fieldValues || {},
        selectedClauseIds: selectedClauseIds || [],
        customClauses: customClauses || [],
        constraints: constraints || [],
        updatedAt: Date.now(),
      };
      writeTemplateDraft(selectedTemplate, draft);
      setTemplateDraftUpdatedAt(draft.updatedAt);
    }, 350);

    return () => window.clearTimeout(t);
  }, [mode, user, selectedTemplate, fieldValues, selectedClauseIds, customClauses, constraints]);

  useEffect(() => {
    if (mode !== 'ai') return;
    if (!selectedTemplate) {
      setAiDraftUpdatedAt(null);
      return;
    }
    const d = readAiDraft(selectedTemplate);
    setAiDraftUpdatedAt(d?.updatedAt ? d.updatedAt : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedTemplate, userDraftKey]);

  // Auto-resume saved AI Builder drafts (and optionally auto-start from query params).
  useEffect(() => {
    if (mode !== 'ai') return;
    if (!selectedTemplate) return;

    const draft = readAiDraft(selectedTemplate);
    if (draft && (draft.html || draft.text)) {
      setAiError(null);
      setAiTitle(draft.title || String(selectedTemplateObj?.name || selectedTemplate));
      setAiBaseText(draft.text || '');
      setAiBaseHtml(draft.html || textToHtml(draft.text || ''));
      setAiSuggestionText('');
      setAiStep('edit');
      setAiDraftUpdatedAt(draft.updatedAt || Date.now());
      return;
    }

    const shouldAutoStart =
      (searchParams.get('mode') || '').toLowerCase() === 'ai' || (searchParams.get('autostart') || '') === '1';
    if (!shouldAutoStart) return;
    if (aiStep !== 'select') return;
    if (aiAutoStartTemplateRef.current === selectedTemplate) return;
    aiAutoStartTemplateRef.current = selectedTemplate;
    // Fire and forget.
    startAiBuilder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedTemplate, aiStep, searchParams, userDraftKey]);

  // Auto-save AI Builder editor progress locally (so refresh/redirect resumes).
  useEffect(() => {
    if (mode !== 'ai') return;
    if (aiStep !== 'edit') return;
    if (!selectedTemplate) return;
    if (!aiBaseHtml && !aiBaseText) return;

    const t = window.setTimeout(() => {
      const draft: AiDraft = {
        template: selectedTemplate,
        title: String(aiTitle || selectedTemplateObj?.name || selectedTemplate),
        html: aiBaseHtml,
        text: aiBaseText,
        updatedAt: Date.now(),
      };
      writeAiDraft(selectedTemplate, draft);
      setAiDraftUpdatedAt(draft.updatedAt);
    }, 650);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, aiStep, selectedTemplate, aiTitle, aiBaseHtml, aiBaseText]);

  const startAiBuilder = async () => {
    if (!selectedTemplate) return;
    try {
      const existing = readAiDraft(selectedTemplate);
      if (existing && (existing.html || existing.text)) {
        setAiError(null);
        setAiTitle(existing.title || String(selectedTemplateObj?.name || selectedTemplate));
        setAiBaseText(existing.text || '');
        setAiBaseHtml(existing.html || textToHtml(existing.text || ''));
        setAiSuggestionText('');
        setAiStep('edit');
        setAiDraftUpdatedAt(existing.updatedAt || Date.now());
        return;
      }

      setAiError(null);
      setAiLoadingTemplate(true);
      const client = new ApiClient();
      const res = await client.getTemplateFileContent(selectedTemplate);
      if (!res.success) {
        setAiError(res.error || 'Failed to load template');
        return;
      }
      const content = String((res.data as any)?.content || '');
      const name = String((res.data as any)?.name || '') || String(selectedTemplate || 'Template');
      setAiTitle(name);
      setAiBaseText(content);
      setAiBaseHtml(textToHtml(content));
      setAiSuggestionText('');
      setAiStep('edit');

      const draft: AiDraft = {
        template: selectedTemplate,
        title: name,
        html: textToHtml(content),
        text: content,
        updatedAt: Date.now(),
      };
      writeAiDraft(selectedTemplate, draft);
      setAiDraftUpdatedAt(draft.updatedAt);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Failed to load template');
    } finally {
      setAiLoadingTemplate(false);
    }
  };

  const applyAiPrompt = async () => {
    if (aiGenerating) return;
    const prompt = aiPrompt.trim();
    if (!prompt) {
      setAiError('Please enter a prompt');
      return;
    }
    const current = aiEditorApiRef.current?.getText() ?? aiBaseText;
    if (!current.trim()) {
      setAiError('Template content is empty');
      return;
    }

    aiAbortRef.current?.abort();
    const aborter = new AbortController();
    aiAbortRef.current = aborter;

    try {
      setAiError(null);
      setAiGenerating(true);
      let nextText = '';
      setAiSuggestionText('');

      const client = new ApiClient();
      await client.streamTemplateAiGenerate(
        {
          prompt,
          current_text: current,
          contract_type: schema?.template_type || selectedTemplateObj?.contract_type,
        },
        {
          signal: aborter.signal,
          onDelta: (delta) => {
            nextText += delta;
            setAiSuggestionText(nextText);
          },
          onDone: () => {
            setAiSuggestionText(nextText);
          },
          onError: (err) => {
            setAiError(err || 'AI generation failed');
          },
        }
      );
    } catch (e) {
      if ((e as any)?.name === 'AbortError') return;
      setAiError(e instanceof Error ? e.message : 'AI generation failed');
    } finally {
      setAiGenerating(false);
    }
  };

  const stopAi = () => {
    aiAbortRef.current?.abort();
    setAiGenerating(false);
  };

  const acceptAiSuggestion = () => {
    const next = (aiSuggestionText || '').trim();
    if (!next) return;
    setAiBaseText(next);
    setAiBaseHtml(textToHtml(next));
    setAiSuggestionText('');
  };

  const rejectAiSuggestion = () => {
    setAiSuggestionText('');
  };

  const createDraftFromAi = async () => {
    try {
      setAiError(null);

      if (!user) {
        setAiError('Please sign in to create a draft.');
        return;
      }

      setLoading(true);
      const client = new ApiClient();
      const renderedText = aiEditorApiRef.current?.getText() ?? aiBaseText;
      const renderedHtmlRaw = aiEditorApiRef.current?.getHTML() ?? aiBaseHtml;
      const renderedHtml = sanitizeEditorHtml(renderedHtmlRaw);
      const title = (aiTitle || selectedTemplateObj?.name || 'Contract').trim();
      const res = await client.createContractFromContent({
        title,
        contract_type: schema?.template_type || selectedTemplateObj?.contract_type,
        rendered_text: renderedText,
        rendered_html: renderedHtml,
        metadata: selectedTemplate
          ? {
              source: 'ai_builder',
              template_filename: selectedTemplate,
              template: selectedTemplate,
              form_inputs: fieldValues || {},
              selected_clause_ids: selectedClauseIds || [],
              selected_clauses: selectedClauseIds || [],
              custom_clauses: customClauses || [],
              constraints: constraints || [],
              editor_client_updated_at_ms: Date.now(),
            }
          : {
              source: 'ai_builder',
              editor_client_updated_at_ms: Date.now(),
            },
      });
      if (!res.success) {
        setAiError(res.error || 'Failed to create draft');
        return;
      }
      const id = String((res.data as any)?.id || '');
      if (!id) {
        setAiError('Draft created but no contract id returned');
        return;
      }

      if (selectedTemplate) {
        // Persist generation context so the editor + signing flow can access template inputs/clauses.
        writeGenerationContext({
          contractId: String(id),
          template: selectedTemplate,
          fieldValues: fieldValues || {},
          selectedClauseIds: selectedClauseIds || [],
          customClauses: customClauses || [],
          constraints: constraints || [],
          updatedAt: aiDraftUpdatedAt || Date.now(),
          createdAt: Date.now(),
        });
      }

      if (selectedTemplate) {
        clearAiDraft(selectedTemplate);
        setAiDraftUpdatedAt(null);
      }
      router.push(`/contracts/editor?id=${encodeURIComponent(id)}`);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Failed to create draft');
    } finally {
      setLoading(false);
    }
  };

  const filteredClauses = useMemo(() => {
    const list = Array.isArray(clauses) ? clauses : [];
    const q = clauseQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const hay = `${c.clause_id} ${c.name} ${c.content}`.toLowerCase();
      return hay.includes(q);
    });
  }, [clauses, clauseQuery]);

  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const client = new ApiClient();
      const templatesResponse = await client.listTemplateFiles();

      if (!templatesResponse.success) {
        setError(templatesResponse.error || 'Failed to load templates');
        setTemplates([]);
      } else {
        const templateList = (templatesResponse.data as any)?.results || [];
        setTemplates(templateList);

        const templateFromQuery = searchParams.get('template');
        if (!templateFromQuery && templateList.length > 0) {
          const firstStandard = templateList.find((t: any) => STANDARD_TEMPLATES_ORDER.includes(t.filename))
          setSelectedTemplate((firstStandard || templateList[0]).filename);
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedTemplate || mode !== 'templates') return;
    if (!user) return;

    const timer = window.setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const client = new ApiClient();
        const res = await client.previewContractFromFile({
          filename: selectedTemplate,
          structuredInputs: fieldValues,
          selectedClauses: selectedClauseIds,
          customClauses,
          constraints,
        });
        if (res.success) {
          setPreviewText(((res.data as any)?.rendered_text as string) || '');
        }
      } finally {
        setPreviewLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [selectedTemplate, fieldValues, selectedClauseIds, customClauses, constraints, mode, user]);

  const setField = (key: string, value: string) => {
    setFieldValues((p) => ({ ...p, [key]: value }));
  };

  const toggleClause = (clauseId: string) => {
    setSelectedClauseIds((prev) =>
      prev.includes(clauseId) ? prev.filter((c) => c !== clauseId) : [...prev, clauseId]
    );
  };

  const addCustomClause = () => setCustomClauses((p) => [...p, { title: '', content: '' }]);
  const addConstraint = () => setConstraints((p) => [...p, { name: '', value: '' }]);

  const addConstraintFromLibrary = (t: ConstraintTemplate) => {
    const name = (t?.label || t?.key || '').trim();
    if (!name) return;
    setConstraints((prev) => {
      const exists = prev.some((c) => (c.name || '').trim().toLowerCase() === name.toLowerCase());
      if (exists) return prev;
      return [...prev, { name, value: String(t?.default || '') }];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) {
      setError('Please select a template');
      return;
    }

    const templateMetaTitle =
      (selectedTemplate && (TEMPLATE_CARD_META[selectedTemplate]?.title || selectedTemplateObj?.name)) || 'Contract';
    const partyHint =
      fieldValues.party_a_name ||
      fieldValues.party_b_name ||
      fieldValues.company_name ||
      fieldValues.client_name ||
      fieldValues.disclosing_party_name ||
      fieldValues.receiving_party_name ||
      '';
    const derivedTitle = partyHint ? `${templateMetaTitle} — ${partyHint}` : templateMetaTitle;

    setLoading(true);
    setError(null);

    try {
      const client = new ApiClient();
      const response = await client.generateContractFromFile({
        filename: selectedTemplate,
        title: derivedTitle,
        selectedClauses: selectedClauseIds,
        customClauses,
        constraints,
        structuredInputs: fieldValues,
      });

      if (!response.success) {
        setError(response.error || 'Failed to create contract');
        return;
      }

      const contractId = (response.data as any)?.contract?.id;
      if (contractId) {
        // Persist generation context so the editor can show template/clauses/inputs.
        writeGenerationContext({
          contractId: String(contractId),
          template: selectedTemplate,
          fieldValues: fieldValues || {},
          selectedClauseIds: selectedClauseIds || [],
          customClauses: customClauses || [],
          constraints: constraints || [],
          updatedAt: templateDraftUpdatedAt || Date.now(),
          createdAt: Date.now(),
        });

        // Clear local draft after successful generation.
        clearTemplateDraft(selectedTemplate);
        setTemplateDraftRestored(false);
        setTemplateDraftUpdatedAt(null);
        router.push(`/contracts/editor?id=${encodeURIComponent(String(contractId))}`);
      } else {
        router.push('/contracts');
      }
    } catch (err) {
      console.error('Failed to create contract:', err);
      setError(err instanceof Error ? err.message : 'Failed to create contract');
    } finally {
      setLoading(false);
    }
  };

  const selectedTemplateObj = templates.find((t) => t.filename === selectedTemplate) || null;

  const allTemplatesOrdered = useMemo(() => {
    const standardSet = new Set(STANDARD_TEMPLATES_ORDER);
    const pinned: Template[] = [];
    const byFilename = new Map<string, Template>();
    for (const t of templates) byFilename.set(t.filename, t);
    for (const f of STANDARD_TEMPLATES_ORDER) {
      const t = byFilename.get(f);
      if (t) pinned.push(t);
    }
    const rest = templates.filter((t) => !standardSet.has(t.filename));
    return [...pinned, ...rest];
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const q = templateQuery.trim().toLowerCase();
    if (!q) return allTemplatesOrdered;
    return allTemplatesOrdered.filter((t) => {
      const hay = `${t.filename || ''} ${t.name || ''} ${t.description || ''} ${t.contract_type || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allTemplatesOrdered, templateQuery]);

  const aiFilteredTemplates = useMemo(() => {
    const q = aiTemplateQuery.trim().toLowerCase();
    if (!q) return allTemplatesOrdered;
    return allTemplatesOrdered.filter((t) => {
      const hay = `${t.filename || ''} ${t.name || ''} ${t.description || ''} ${t.contract_type || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allTemplatesOrdered, aiTemplateQuery]);

  const sections: TemplateSchemaSection[] = schema?.sections || [];

  const isCreateDisabled = !user || !selectedTemplateObj || loading || mode !== 'templates';

  const pageTitle = 'Contract Generator';
  const pageSubtitle = 'Select a template and autofill details to generate contracts instantly.';

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-[#F2F0EB]">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-6 md:py-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
            <div>
              <h1 className="text-[28px] md:text-[34px] font-semibold text-[#0F141F] leading-tight">{pageTitle}</h1>
              <p className="text-sm md:text-base text-[#6B7280] mt-1">{pageSubtitle}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex w-full sm:w-auto items-center rounded-full bg-white border border-black/5 p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setMode('templates')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-full text-sm font-medium transition text-center ${
                  mode === 'templates' ? 'bg-[#0F141F] text-white' : 'text-[#0F141F]/70 hover:text-[#0F141F]'
                }`}
              >
                Template Based
              </button>
              <button
                type="button"
                onClick={() => setMode('ai')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-full text-sm font-medium transition flex items-center justify-center gap-2 ${
                  mode === 'ai' ? 'bg-[#0F141F] text-white' : 'text-[#0F141F]/70 hover:text-[#0F141F]'
                }`}
              >
                <Sparkles className="w-4 h-4" /> AI Builder
              </button>
            </div>
          </div>

          {mode === 'ai' ? (
            <div className="mt-8">
              {aiStep === 'select' ? (
                <div className="grid grid-cols-12 gap-6">
                  {/* Template picker (limited width + scrollable) */}
                  <aside className="col-span-12 lg:col-span-3 bg-white rounded-[18px] border border-black/5 shadow-sm overflow-hidden">
                    <div className="px-6 pt-6 pb-4 border-b border-black/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#0F141F] text-white flex items-center justify-center">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-[#0F141F]">AI Builder</div>
                          <div className="text-xs text-[#6B7280]">Pick a template to start</div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 bg-[#F6F3ED] rounded-full px-4 py-2">
                        <Search className="w-4 h-4 text-black/35" />
                        <input
                          className="bg-transparent outline-none text-sm w-full"
                          placeholder="Search templates…"
                          value={aiTemplateQuery}
                          onChange={(e) => setAiTemplateQuery(e.target.value)}
                        />
                      </div>

                      <div className="mt-3 text-[11px] text-black/45">
                        {aiTemplateQuery.trim()
                          ? `Showing ${aiFilteredTemplates.length} results`
                          : `Showing ${aiFilteredTemplates.length} templates`}
                      </div>
                    </div>

                    <div className="p-4 space-y-3 overflow-y-auto max-h-[45vh] sm:max-h-[55vh] lg:max-h-[calc(100vh-320px)]">
                      {aiFilteredTemplates.length === 0 ? (
                        <div className="text-sm text-black/45 p-2">No templates match your search.</div>
                      ) : (
                        aiFilteredTemplates.map((t) => {
                          const isSelected = selectedTemplate === t.filename;
                          return (
                            <button
                              key={t.filename}
                              type="button"
                              onClick={() => setSelectedTemplate(t.filename)}
                              className={`w-full text-left rounded-2xl border p-4 transition ${
                                isSelected
                                  ? 'border-[#FF5C7A] bg-[#FFF1F4]'
                                  : 'border-black/5 bg-[#F6F3ED] hover:border-black/10'
                              }`}
                            >
                              <div className="text-sm font-semibold text-[#111827] truncate">{t.name || t.filename}</div>
                              <div className="text-xs text-black/45 mt-1 line-clamp-2">{t.description || t.contract_type || ''}</div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </aside>

                  {/* Main content */}
                  <section className="col-span-12 lg:col-span-9 bg-white rounded-[18px] border border-black/5 shadow-sm p-5 sm:p-6 lg:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="text-lg font-semibold text-[#0F141F]">Get Started</div>
                        <div className="text-sm text-[#6B7280] mt-1">Open the template in the editor and apply prompts live.</div>
                      </div>
                      <button
                        type="button"
                        onClick={startAiBuilder}
                        disabled={!selectedTemplate || aiLoadingTemplate}
                        className="h-11 w-full sm:w-auto px-5 rounded-full bg-[#0F141F] text-white text-sm font-semibold disabled:opacity-60"
                      >
                        {aiLoadingTemplate ? 'Loading…' : aiDraftUpdatedAt ? 'Resume Draft' : 'Get Started'}
                      </button>
                    </div>

                    {aiDraftUpdatedAt ? (
                      <div className="mt-4 rounded-2xl border border-black/10 bg-[#F6F3ED] px-4 py-3 text-sm text-black/60">
                        Saved draft found — last updated {new Date(aiDraftUpdatedAt).toLocaleString()}.
                      </div>
                    ) : null}

                    {aiError ? (
                      <div className="mt-5 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm">
                        {aiError}
                      </div>
                    ) : null}

                    <div className="mt-6">
                      <div className="text-sm font-semibold text-[#0F141F]">Selected Template</div>
                      <div className="mt-3 rounded-2xl border border-black/5 bg-[#F6F3ED] p-4">
                        <div className="text-sm font-semibold text-[#111827]">
                          {selectedTemplateObj?.name || selectedTemplate || '—'}
                        </div>
                        <div className="text-xs text-black/45 mt-1">
                          {selectedTemplateObj?.description || 'Template preview will open in the editor.'}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="bg-[#F2F0EB]">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4 min-w-0">
                      <button
                        type="button"
                        onClick={() => {
                          stopAi();
                          setAiStep('select');
                        }}
                        className="w-10 h-10 rounded-full bg-white border border-black/10 shadow-sm grid place-items-center text-black/45 hover:text-black"
                        aria-label="Back"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <div className="min-w-0">
                        <div className="text-xl md:text-2xl font-bold text-[#111827] truncate">
                          {aiTitle || selectedTemplateObj?.name || 'AI Builder'}
                        </div>
                        <div className="text-xs text-black/45 mt-1 truncate">Template: {selectedTemplate || ''}</div>
                      </div>
                    </div>
                    <div className="w-full sm:w-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={createDraftFromAi}
                        disabled={loading || aiGenerating || !aiBaseText.trim() || !user}
                        className="h-10 w-full sm:w-auto px-4 rounded-full bg-white border border-black/10 text-sm font-semibold text-[#111827] hover:bg-black/5 disabled:opacity-60"
                      >
                        Create Draft
                      </button>
                    </div>
                  </div>

                  {aiError ? (
                    <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm">
                      {aiError}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-12 gap-6">
                    {/* Editor */}
                    <section className="col-span-12 lg:col-span-8 bg-white rounded-[28px] border border-black/5 shadow-sm overflow-hidden">
                      <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
                        <div className="text-sm font-semibold text-[#111827]">Template Editor</div>
                        <div className="text-xs text-black/45">
                          {aiGenerating ? 'Generating suggestion…' : 'Edit content; accept AI suggestions on the right'}
                        </div>
                      </div>

                      <div className="px-4 sm:px-6 py-5 sm:py-6 overflow-visible lg:overflow-y-auto lg:max-h-[calc(100vh-280px)]">
                        <RichTextEditor
                          valueHtml={aiBaseHtml}
                          disabled={aiGenerating}
                          onEditorReady={(ed) => {
                            aiEditorApiRef.current = ed;
                          }}
                          onChange={(html: string, text: string) => {
                            setAiBaseHtml(html);
                            setAiBaseText(text);
                          }}
                          editorClassName={`min-h-[50vh] sm:min-h-[60vh] rounded-2xl border border-black/10 bg-white px-5 py-4 text-[13px] leading-6 text-slate-900 font-serif outline-none ${
                            aiGenerating ? 'opacity-80' : ''
                          }`}
                        />
                      </div>
                    </section>

                    {/* AI Suggestions */}
                    <aside className="col-span-12 lg:col-span-4 space-y-6">
                      <div className="bg-white rounded-[28px] border border-black/5 shadow-sm overflow-hidden">
                        <div className="px-6 pt-6 pb-4 border-b border-black/5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-[#111827]">AI Suggestions</p>
                            <span className="text-[11px] text-black/45">Streaming</span>
                          </div>
                          <p className="text-xs text-black/45 mt-2">
                            Generate a proposed revision, then accept or reject it.
                          </p>
                        </div>

                        <div className="p-5">
                          <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="e.g., Add a termination for convenience clause with 30 days notice, and update payment terms to Net 45."
                            className="w-full min-h-[140px] rounded-2xl border border-black/10 bg-[#F6F3ED] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#FF5C7A]/25"
                            disabled={aiGenerating}
                          />

                          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
                            <button
                              type="button"
                              onClick={applyAiPrompt}
                              disabled={aiGenerating || !aiPrompt.trim()}
                              className="h-10 w-full sm:w-auto px-4 rounded-full bg-[#0F141F] text-white text-sm font-semibold disabled:opacity-60"
                            >
                              {aiGenerating ? 'Generating…' : 'Generate Suggestion'}
                            </button>
                            {aiGenerating ? (
                              <button
                                type="button"
                                onClick={stopAi}
                                className="h-10 w-full sm:w-auto px-4 rounded-full bg-white border border-black/10 text-sm font-semibold text-[#111827] hover:bg-black/5"
                              >
                                Stop
                              </button>
                            ) : null}
                          </div>

                          {aiError ? <div className="mt-3 text-xs text-rose-600">{aiError}</div> : null}

                          <div className="mt-4 text-xs text-black/45">Tip: be specific (sections, numbers, jurisdictions).</div>

                          {/* Proposed revision */}
                          <div className="mt-5 rounded-2xl border border-black/10 bg-white overflow-hidden">
                            <div className="px-4 py-3 border-b border-black/5 flex items-center justify-between">
                              <div className="text-xs font-semibold text-[#111827]">Proposed Revision</div>
                              <div className="text-[11px] text-black/45">
                                {aiSuggestionText.trim() ? 'Ready' : 'None yet'}
                              </div>
                            </div>
                            <div className="p-4">
                              {!aiSuggestionText.trim() ? (
                                <div className="text-sm text-[#6B7280]">Run a prompt to generate suggestions.</div>
                              ) : (
                                <div className="text-xs text-slate-800 whitespace-pre-wrap max-h-64 overflow-y-auto">
                                  {aiSuggestionText}
                                </div>
                              )}

                              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-2">
                                <button
                                  type="button"
                                  onClick={acceptAiSuggestion}
                                  disabled={!aiSuggestionText.trim() || aiGenerating}
                                  className="h-10 w-full sm:w-auto px-4 rounded-full bg-[#FF5C7A] text-white text-sm font-semibold disabled:opacity-60"
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  onClick={rejectAiSuggestion}
                                  disabled={!aiSuggestionText.trim() || aiGenerating}
                                  className="h-10 w-full sm:w-auto px-4 rounded-full bg-white border border-black/10 text-sm font-semibold text-[#111827] hover:bg-black/5 disabled:opacity-60"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </aside>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="mt-8">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-sm font-semibold text-[#0F141F]">All Templates</h2>
                  <div className="flex items-center gap-2 bg-white border border-black/5 shadow-sm rounded-full px-4 py-2 w-full sm:w-[420px]">
                    <Search className="w-4 h-4 text-black/35" />
                    <input
                      value={templateQuery}
                      onChange={(e) => setTemplateQuery(e.target.value)}
                      placeholder="Search templates…"
                      className="bg-transparent outline-none text-sm w-full text-[#0F141F] placeholder:text-black/35"
                      aria-label="Search templates"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  {templatesLoading ? (
                    <div className="text-sm text-[#6B7280] py-6">Loading templates…</div>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="text-sm text-[#6B7280] py-6">No templates match your search.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredTemplates.map((t) => {
                        const isSelected = selectedTemplate === t.filename;
                        const meta = TEMPLATE_CARD_META[t.filename] || {
                          title: t.name,
                          subtitle: t.description || 'Template',
                          pill: t.contract_type || 'Template',
                          eta: '~5 mins',
                          iconBg: 'bg-slate-50 text-slate-700',
                          icon: <FileText className="w-5 h-5" />,
                        };

                        const createdByYou =
                          user &&
                          ((t as any)?.created_by_id && String((t as any).created_by_id) === String((user as any)?.user_id));

                        return (
                          <button
                            key={t.filename}
                            type="button"
                            onClick={() => setSelectedTemplate(t.filename)}
                            className={`text-left bg-white rounded-[18px] border shadow-sm p-5 transition w-full ${
                              isSelected
                                ? 'border-[#FF5C7A] ring-2 ring-[#FF5C7A]/20'
                                : 'border-black/5 hover:border-black/10'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className={`w-10 h-10 rounded-xl ${meta.iconBg} flex items-center justify-center flex-shrink-0`}>{meta.icon}</div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-semibold text-[#0F141F] truncate">{meta.title}</div>
                                  <div
                                    className={`w-6 h-6 rounded-full flex items-center justify-center border flex-shrink-0 ${
                                      isSelected ? 'bg-[#FF5C7A] border-[#FF5C7A]' : 'bg-white border-black/10'
                                    }`}
                                  >
                                    {isSelected ? <div className="w-2.5 h-2.5 rounded-full bg-white" /> : null}
                                  </div>
                                </div>
                                <div className="text-sm text-[#6B7280] mt-1 line-clamp-2">{meta.subtitle}</div>
                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#F3F4F6] text-[#0F141F]/70">
                                    {meta.pill}
                                  </span>
                                  {createdByYou ? (
                                    <span className="text-xs px-2.5 py-1 rounded-full bg-[#F6F3ED] text-[#0F141F]/70 border border-black/5">
                                      Mine
                                    </span>
                                  ) : null}
                                  <span className="text-[11px] text-[#6B7280] truncate">{t.filename}</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl">
                  <p className="font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Data Entry */}
                <div className="bg-white rounded-[18px] border border-black/5 shadow-sm overflow-hidden lg:col-span-5">
                  <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#FF5C7A] text-white flex items-center justify-center text-xs font-bold">1</div>
                      <div className="font-semibold text-[#0F141F]">Data Entry</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFieldValues({});
                        setSelectedClauseIds([]);
                        setCustomClauses([]);
                        setConstraints([]);
                        if (selectedTemplate) {
                          clearTemplateDraft(selectedTemplate);
                          setTemplateDraftUpdatedAt(null);
                          setTemplateDraftRestored(false);
                        }
                      }}
                      className="text-xs text-[#FF5C7A] hover:underline"
                    >
                      Clear all
                    </button>
                  </div>

                  {templateDraftUpdatedAt ? (
                    <div className="px-5 pt-4">
                      <div className="rounded-2xl border border-black/10 bg-[#F6F3ED] px-4 py-3 flex items-center justify-between gap-3">
                        <div className="text-xs text-black/60">
                          {templateDraftRestored ? 'Draft restored' : 'Auto-saved'} — {new Date(templateDraftUpdatedAt).toLocaleString()}
                        </div>
                        {selectedTemplate ? (
                          <button
                            type="button"
                            onClick={() => {
                              clearTemplateDraft(selectedTemplate);
                              setTemplateDraftUpdatedAt(null);
                              setTemplateDraftRestored(false);
                            }}
                            className="text-xs font-semibold text-[#0F141F] hover:underline"
                          >
                            Clear draft
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  <div className="p-5 space-y-6">
                    {!selectedTemplate ? (
                      <div className="text-sm text-[#6B7280]">Select a template to begin.</div>
                    ) : schemaLoading ? (
                      <div className="text-sm text-[#6B7280]">Loading required fields…</div>
                    ) : (
                      <>
                        {(sections.length ? sections : [{ title: 'Data Entry', fields: [] }]).map((section) => (
                          <div key={section.title}>
                            <div className="text-[11px] tracking-wider text-[#9CA3AF] font-semibold uppercase">{section.title}</div>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                              {(section.fields || []).map((f: TemplateSchemaField) => (
                                <div key={f.key} className={f.type === 'select' ? 'md:col-span-1' : ''}>
                                  <label className="block text-sm font-medium text-[#374151] mb-2">
                                    {f.label} {f.required ? <span className="text-[#FF5C7A]">*</span> : null}
                                  </label>
                                  {f.type === 'select' ? (
                                    <select
                                      value={fieldValues[f.key] || ''}
                                      onChange={(e) => setField(f.key, e.target.value)}
                                      className="w-full px-4 py-3 border border-black/10 rounded-xl bg-white focus:ring-2 focus:ring-[#FF5C7A]/30 focus:border-[#FF5C7A]/40"
                                    >
                                      <option value="">Select…</option>
                                      {(f.options || []).map((o) => (
                                        <option key={o} value={o}>
                                          {o}
                                        </option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type={f.type}
                                      value={fieldValues[f.key] || ''}
                                      onChange={(e) => setField(f.key, e.target.value)}
                                      className="w-full px-4 py-3 border border-black/10 rounded-xl bg-white focus:ring-2 focus:ring-[#FF5C7A]/30 focus:border-[#FF5C7A]/40"
                                      placeholder={f.label}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* Clauses & Constraints */}
                        <div>
                          <div className="text-[11px] tracking-wider text-[#9CA3AF] font-semibold uppercase">Clause & Constraints</div>
                          <div className="mt-3 space-y-4">
                            <div className="bg-[#F7F7F7] rounded-2xl p-4 border border-black/5">
                              <div className="flex items-center justify-between">
                                <div className="font-semibold text-[#111827] text-sm">Clause Library</div>
                                <div className="text-xs text-[#6B7280]">Optional</div>
                              </div>
                              <div className="mt-3">
                                <input
                                  value={clauseQuery}
                                  onChange={(e) => setClauseQuery(e.target.value)}
                                  placeholder="Search clauses…"
                                  className="w-full px-4 py-2.5 border border-black/10 rounded-xl bg-white focus:ring-2 focus:ring-[#FF5C7A]/30 focus:border-[#FF5C7A]/40"
                                />
                              </div>
                              <div className="mt-3 max-h-44 overflow-y-auto space-y-2 pr-1">
                                {clausesLoading ? (
                                  <div className="text-sm text-[#6B7280]">Loading clauses…</div>
                                ) : filteredClauses.length === 0 ? (
                                  <div className="text-sm text-[#6B7280]">No clauses found.</div>
                                ) : (
                                  filteredClauses.slice(0, 50).map((c) => {
                                    const checked = selectedClauseIds.includes(c.clause_id);
                                    return (
                                      <label
                                        key={`${c.clause_id}-${c.version}`}
                                        className="flex items-start gap-3 bg-white rounded-xl border border-black/5 p-3 cursor-pointer hover:border-black/10"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => toggleClause(c.clause_id)}
                                          className="mt-1"
                                        />
                                        <div className="min-w-0">
                                          <div className="text-sm font-semibold text-[#111827] truncate">{c.name}</div>
                                          <div className="text-xs text-[#6B7280]">{c.clause_id}</div>
                                        </div>
                                      </label>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                            <div className="bg-[#F7F7F7] rounded-2xl p-4 border border-black/5">
                              <div className="flex items-center justify-between">
                                <div className="font-semibold text-[#111827] text-sm">Constraints</div>
                                <button
                                  type="button"
                                  onClick={addConstraint}
                                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-black/10 hover:border-black/20"
                                >
                                  Add
                                </button>
                              </div>

                              {/* Constraint Library */}
                              <div className="mt-3">
                                <div className="text-xs font-semibold text-[#6B7280]">Constraint Library</div>
                                <input
                                  value={constraintLibraryQuery}
                                  onChange={(e) => setConstraintLibraryQuery(e.target.value)}
                                  placeholder="Search constraints…"
                                  className="mt-2 w-full px-4 py-2.5 border border-black/10 rounded-xl bg-white focus:ring-2 focus:ring-[#FF5C7A]/30 focus:border-[#FF5C7A]/40"
                                />
                                <div className="mt-2 max-h-44 overflow-y-auto space-y-2 pr-1">
                                  {constraintLibraryLoading ? (
                                    <div className="text-sm text-[#6B7280]">Loading constraints…</div>
                                  ) : constraintLibrary.length === 0 ? (
                                    <div className="text-sm text-[#6B7280]">No constraints available.</div>
                                  ) : (
                                    constraintLibrary
                                      .filter((x) => {
                                        const q = constraintLibraryQuery.trim().toLowerCase();
                                        if (!q) return true;
                                        const hay = `${x.label || ''} ${x.key || ''} ${x.category || ''}`.toLowerCase();
                                        return hay.includes(q);
                                      })
                                      .slice(0, 40)
                                      .map((x) => (
                                        <button
                                          key={x.key}
                                          type="button"
                                          onClick={() => addConstraintFromLibrary(x)}
                                          className="w-full text-left bg-white rounded-xl border border-black/5 p-3 hover:border-black/10"
                                        >
                                          <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                              <div className="text-sm font-semibold text-[#111827] truncate">{x.label}</div>
                                              <div className="text-xs text-[#6B7280]">
                                                {(x.category || 'General') + (x.default ? ` • Default: ${String(x.default)}` : '')}
                                              </div>
                                            </div>
                                            <div className="text-xs font-semibold text-[#FF5C7A]">Add</div>
                                          </div>
                                        </button>
                                      ))
                                  )}
                                </div>
                              </div>

                              <div className="mt-3 space-y-3">
                                {constraints.length === 0 ? (
                                  <div className="text-sm text-[#6B7280]">Add constraints like jurisdiction, data residency, liability caps, etc.</div>
                                ) : (
                                  constraints.map((c, idx) => (
                                    <div key={idx} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <input
                                        value={c.name}
                                        onChange={(e) =>
                                          setConstraints((p) => p.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                                        }
                                        placeholder="Constraint name"
                                        className="w-full px-4 py-2.5 border border-black/10 rounded-xl bg-white focus:ring-2 focus:ring-[#FF5C7A]/30 focus:border-[#FF5C7A]/40"
                                      />
                                      <div className="flex gap-2">
                                        <input
                                          value={c.value}
                                          onChange={(e) =>
                                            setConstraints((p) => p.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)))
                                          }
                                          placeholder="Value"
                                          className="flex-1 px-4 py-2.5 border border-black/10 rounded-xl bg-white focus:ring-2 focus:ring-[#FF5C7A]/30 focus:border-[#FF5C7A]/40"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setConstraints((p) => p.filter((_, i) => i !== idx))}
                                          className="px-3 py-2.5 rounded-xl bg-white border border-black/10 hover:border-black/20 text-[#6B7280]"
                                          aria-label="Remove constraint"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            <div className="bg-[#F7F7F7] rounded-2xl p-4 border border-black/5">
                              <div className="flex items-center justify-between">
                                <div className="font-semibold text-[#111827] text-sm">Custom Clauses</div>
                                <button
                                  type="button"
                                  onClick={addCustomClause}
                                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-black/10 hover:border-black/20"
                                >
                                  Add
                                </button>
                              </div>
                              <div className="mt-3 space-y-3">
                                {customClauses.length === 0 ? (
                                  <div className="text-sm text-[#6B7280]">Add custom clauses like non-solicit, security, SLA, etc.</div>
                                ) : (
                                  customClauses.map((c, idx) => (
                                    <div key={idx} className="bg-white rounded-2xl border border-black/5 p-3">
                                      <div className="flex items-center justify-between gap-2">
                                        <input
                                          value={c.title || ''}
                                          onChange={(e) =>
                                            setCustomClauses((p) => p.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)))
                                          }
                                          placeholder="Clause title"
                                          className="flex-1 px-4 py-2.5 border border-black/10 rounded-xl bg-white focus:ring-2 focus:ring-[#FF5C7A]/30 focus:border-[#FF5C7A]/40"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setCustomClauses((p) => p.filter((_, i) => i !== idx))}
                                          className="px-3 py-2.5 rounded-xl bg-white border border-black/10 hover:border-black/20 text-[#6B7280]"
                                          aria-label="Remove custom clause"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                      <textarea
                                        value={c.content}
                                        onChange={(e) =>
                                          setCustomClauses((p) => p.map((x, i) => (i === idx ? { ...x, content: e.target.value } : x)))
                                        }
                                        placeholder="Write clause content…"
                                        className="mt-3 w-full px-4 py-3 border border-black/10 rounded-xl bg-white focus:ring-2 focus:ring-[#FF5C7A]/30 focus:border-[#FF5C7A]/40 min-h-[96px]"
                                      />
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Live Preview */}
                <div className="bg-white rounded-[18px] border border-black/5 shadow-sm overflow-hidden lg:col-span-7 lg:sticky lg:top-6 self-start">
                  <div className="px-5 py-4 border-b border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-[#6B7280] font-semibold">Live Preview</div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="bg-[#EEF0F3] rounded-[18px] p-2 sm:p-3">
                      <div className="bg-white rounded-[14px] shadow-sm border border-black/5 overflow-hidden">
                        <div
                          className="p-5 sm:p-6 overflow-visible lg:overflow-y-auto lg:max-h-[calc(100vh-320px)]"
                        >
                          {previewLoading ? (
                            <div className="text-sm text-[#6B7280]">Generating preview…</div>
                          ) : !selectedTemplate ? (
                            <div className="text-sm text-[#6B7280]">Select a template to preview.</div>
                          ) : previewText ? (
                            <div className="inline-block min-w-full">
                              <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#111827] font-serif">
                                {previewText}
                              </pre>
                            </div>
                          ) : (
                            <div className="text-sm text-[#6B7280]">Start filling fields to see a preview.</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="text-sm text-[#6B7280] min-w-0">
                        {!user ? 'Please log in to create contracts.' : schema?.template_type ? `Type: ${schema.template_type}` : null}
                      </div>
                      <button
                        type="submit"
                        disabled={isCreateDisabled}
                        className="bg-[#0F141F] text-white w-full sm:w-auto px-7 py-3.5 rounded-full shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                      >
                        {loading ? 'Creating…' : 'Move to editor'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

const CreateContractPage = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F2F0EB] p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-[20px] shadow-sm p-6 text-gray-600">
              Loading...
            </div>
          </div>
        </div>
      }
    >
      <CreateContractInner />
    </Suspense>
  );
};

export default CreateContractPage;