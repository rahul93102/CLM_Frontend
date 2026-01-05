'use client';

import React, { useEffect, useState } from 'react';
import { templateAPI } from '../lib/api';

interface Template {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

const Templates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await templateAPI.getTemplates();
        setTemplates(data.results || []);
      } catch (err) {
        setError('Failed to fetch templates');
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  return (
    <div className="min-h-screen bg-[#F2F0EB] p-8">
      <h1 className="text-3xl font-bold text-[#2D3748] mb-8">All Templates</h1>
      {loading && <div>Loading templates...</div>}
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template.id} className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-semibold text-[#2D3748] mb-2">{template.name}</h2>
            {template.description && <p className="text-gray-600 mb-2">{template.description}</p>}
            {template.created_at && <p className="text-xs text-gray-400">Created: {new Date(template.created_at).toLocaleDateString()}</p>}
          </div>
        ))}
        {templates.length === 0 && !loading && (
          <div className="col-span-full text-gray-500 text-center py-8">No templates found.</div>
        )}
      </div>
    </div>
  );
};

export default Templates;
