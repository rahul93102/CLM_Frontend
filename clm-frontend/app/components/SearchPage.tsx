'use client'

import { useEffect, useState } from 'react'
import { apiClient, SearchResult } from '@/app/lib/api-client'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchType, setSearchType] = useState<'full-text' | 'semantic' | 'advanced'>('full-text')
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    try {
      setLoading(true)
      setError(null)
      setHasSearched(true)

      let response

      if (searchType === 'full-text') {
        response = await apiClient.search(query)
      } else if (searchType === 'semantic') {
        response = await apiClient.semanticSearch(query)
      } else {
        response = await apiClient.advancedSearch({ query })
      }

      if (response.success) {
        const data = response.data as any
        const resultsList = Array.isArray(data) ? data : data.results || []
        setResults(resultsList)
      } else {
        setError(response.error || 'Search failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionClick = async (suggestion: string) => {
    setQuery(suggestion)
    // Trigger search with suggestion
    const formEvent = new Event('submit', { bubbles: true }) as any
    formEvent.preventDefault = () => {}
    setQuery(suggestion)
  }

  useEffect(() => {
    if (query && hasSearched) {
      const timer = setTimeout(() => {
        handleSearch({ preventDefault: () => {} } as any)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [searchType])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Search Contracts</h1>
          <p className="text-gray-600">Find contracts using full-text, semantic, or advanced search</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="full-text"
                    checked={searchType === 'full-text'}
                    onChange={(e) => setSearchType(e.target.value as any)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Full-Text</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="semantic"
                    checked={searchType === 'semantic'}
                    onChange={(e) => setSearchType(e.target.value as any)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Semantic</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="advanced"
                    checked={searchType === 'advanced'}
                    onChange={(e) => setSearchType(e.target.value as any)}
                    className="mr-2"
                  />
                  <span className="text-gray-700">Advanced</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search contracts by title, description, keywords..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none text-lg"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Results */}
        {hasSearched && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {loading ? 'Searching...' : `Found ${results.length} result${results.length !== 1 ? 's' : ''}`}
            </h2>

            {results.length === 0 && !loading && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-lg text-gray-600">No results found</p>
                <p className="text-sm text-gray-500 mt-2">Try different keywords or search terms</p>
              </div>
            )}

            <div className="space-y-4">
              {results.map((result, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{result.title}</h3>
                    <span className="text-sm text-purple-600 font-semibold">
                      Relevance: {(result.relevance_score * 100).toFixed(0)}%
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{result.content_preview}</p>

                  <div className="flex items-center justify-between">
                    <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                      {result.entity_type}
                    </span>
                    <a
                      href={`/${result.entity_type}s/${result.id}`}
                      className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                    >
                      View Details →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasSearched && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-lg text-gray-600">Enter a search term to get started</p>
            <p className="text-sm text-gray-500 mt-2">
              Try searching for contract titles, keywords, or relevant terms
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
