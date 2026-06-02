/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

import {
  OuiButtonIcon,
  OuiIcon,
  OuiText,
  OuiTitle,
  OuiSpacer,
  OuiLoadingSpinner,
  OuiCode,
  OuiCheckbox,
  OuiCompressedTextArea,
  OuiCompressedSelect,
  OuiCompressedFieldText,
} from '../../../../src/components';

import { SessionLeftNav } from './session_left_nav';

/**
 * STEPS CONFIGURATION
 * Data-first onboarding flow for OpenSearch Search Builder.
 * Main steps:
 *   1. Import data (upload / API / sample) — schema inferred from the data
 *   2. Enrich fields semantically (optional embeddings)
 *   3. Confirm everything (single review gate)
 *   4. Provision & go live (collection + index + pipeline + ingest created here)
 *
 * The use case is derived from the chosen sample dataset; uploads and data
 * source connections default to the `custom` schema.
 */
const STEPS = [
  {
    title: 'Import data',
    mainStep: 1,
    subStep: 1,
    question:
      'Welcome to OpenSearch Search Builder. Let\u2019s start with your data \u2014 how would you like to import it?',
    optionType: 'chips',
    options: [
      {
        key: 'upload-file',
        label: 'Upload a file (JSON / CSV)',
        description: 'I\u2019ll infer your schema from the file',
        requiresAction: 'upload',
      },
      {
        key: 'connect-source',
        label: 'Connect a data source',
        description: 'Amazon S3, DynamoDB Streams, or a REST API',
        requiresAction: 'connect',
      },
      {
        key: 'sample-product-catalog',
        label: 'Use sample data',
        description: 'Explore with a ready-made dataset',
      },
    ],
    confirmation: (selected) => {
      const messages = {
        'upload-file': 'File received. I\u2019ve parsed your documents and inferred the schema.',
        'connect-source': 'Data source connected. I\u2019ve sampled your records and inferred the schema.',
        'sample-product-catalog': 'Loaded the sample dataset. Schema inferred.',
      };
      return messages[selected] || 'Data imported. Schema inferred.';
    },
    rightPanel: {
      title: 'Import Data',
      subtitle: 'Bring your search data',
      contentType: 'import-data',
    },
  },
  {
    title: 'Import data',
    mainStep: 1,
    subStep: 2,
    question:
      'Here\u2019s the schema I detected from your data. Review the fields and types below \u2014 does this look right?',
    optionType: 'chips',
    options: [
      { key: 'looks-good', label: 'Looks good', primary: true },
      { key: 'edit-fields', label: 'Edit fields' },
    ],
    confirmation: (selected) => {
      if (selected === 'looks-good') return 'Schema confirmed. Let\u2019s look at enrichment.';
      return 'You can adjust field names and types in the mapping panel on the right.';
    },
    rightPanel: {
      title: 'Detected Schema',
      subtitle: 'Inferred from your data',
      contentType: 'mapping-preview',
    },
  },
  {
    title: 'Enrich fields',
    mainStep: 2,
    subStep: 1,
    question:
      'Want to add semantic search? Based on your data, here\u2019s what I suggest enriching. You can confirm, edit the details, or skip.',
    optionType: 'enrich',
    options: [], // dynamically populated based on inferred fields
    dynamicOptions: true,
    skipLabel: 'Skip',
    confirmation: (selected) => {
      const names = getEnrichedFieldNames(selected);
      if (names.length === 0) {
        return 'Skipped semantic enrichment. You\u2019ll use keyword search.';
      }
      return `Semantic search enabled for ${names.length} field${names.length > 1 ? 's' : ''}. I\u2019ll add the enrichment pipeline.`;
    },
    rightPanel: {
      title: 'Semantic Search',
      subtitle: 'AI-powered enrichment',
      contentType: 'semantic-config',
    },
  },
  {
    title: 'Confirm everything',
    mainStep: 3,
    subStep: 1,
    question:
      'Here\u2019s everything I\u2019ll set up for you. Review the plan below \u2014 ready to create your search?',
    optionType: 'chips',
    options: [
      { key: 'create', label: 'Create my search', primary: true },
      { key: 'make-changes', label: 'Make changes' },
    ],
    confirmation: (selected) => {
      if (selected === 'create') return 'Creating your search resources...';
      return 'No problem \u2014 use the step dots above to jump back and adjust.';
    },
    rightPanel: {
      title: 'Review & Confirm',
      subtitle: 'What I\u2019ll create',
      contentType: 'review-summary',
    },
  },
  {
    title: 'Go live',
    mainStep: 4,
    subStep: 1,
    question:
      'Your search is live! I\u2019ve created the collection, index, and pipeline, and indexed your data. Try a search or open the dashboard.',
    optionType: 'chips',
    options: [
      { key: 'open-dashboard', label: 'Continue', primary: true },
      { key: 'try-query', label: 'Try a search query' },
    ],
    confirmation: () => 'Setup complete. Your search tool is ready to use.',
    rightPanel: {
      title: 'Provisioning',
      subtitle: 'Creating your resources',
      contentType: 'provisioning-live',
    },
  },
];

// ─────────────────────────────────────────────
// INDEX TEMPLATES per use case
// ─────────────────────────────────────────────

const INDEX_TEMPLATES = {
  'product-catalog': {
    name: 'product-search',
    fields: [
      { name: 'title', type: 'text', searchable: true, filterable: false },
      { name: 'description', type: 'text', searchable: true, filterable: false },
      { name: 'category', type: 'keyword', searchable: false, filterable: true },
      { name: 'price', type: 'float', searchable: false, filterable: true },
      { name: 'brand', type: 'keyword', searchable: false, filterable: true },
      { name: 'image_url', type: 'keyword', searchable: false, filterable: false },
      { name: 'in_stock', type: 'boolean', searchable: false, filterable: true },
      { name: 'rating', type: 'float', searchable: false, filterable: true },
    ],
  },
  'document-search': {
    name: 'document-search',
    fields: [
      { name: 'title', type: 'text', searchable: true, filterable: false },
      { name: 'content', type: 'text', searchable: true, filterable: false },
      { name: 'author', type: 'keyword', searchable: false, filterable: true },
      { name: 'tags', type: 'keyword', searchable: false, filterable: true },
      { name: 'created_at', type: 'date', searchable: false, filterable: true },
      { name: 'file_type', type: 'keyword', searchable: false, filterable: true },
    ],
  },
  'knowledge-base': {
    name: 'knowledge-base',
    fields: [
      { name: 'question', type: 'text', searchable: true, filterable: false },
      { name: 'answer', type: 'text', searchable: true, filterable: false },
      { name: 'topic', type: 'keyword', searchable: false, filterable: true },
      { name: 'source', type: 'keyword', searchable: false, filterable: true },
      { name: 'last_updated', type: 'date', searchable: false, filterable: true },
    ],
  },
  custom: {
    name: 'custom-index',
    fields: [
      { name: 'title', type: 'text', searchable: true, filterable: false },
      { name: 'body', type: 'text', searchable: true, filterable: false },
      { name: 'category', type: 'keyword', searchable: false, filterable: true },
      { name: 'timestamp', type: 'date', searchable: false, filterable: true },
    ],
  },
};

// ─────────────────────────────────────────────
// IMPORT → USE CASE DERIVATION
// The opening import choice determines the schema. Sample datasets map to a
// matching template; uploads and live data sources default to `custom`.
// ─────────────────────────────────────────────

const deriveUseCase = (importKey) => {
  switch (importKey) {
    case 'sample-product-catalog':
      return 'product-catalog';
    case 'sample-document-search':
      return 'document-search';
    case 'sample-knowledge-base':
      return 'knowledge-base';
    default:
      return 'custom';
  }
};

// Single source of truth for the fields shown in step 2. These are ALL the
// fields from the schema detected in step 1 (which is driven by the import
// option picked in step 1), so step 2 always matches step 1 exactly.
const getDetectedFields = (useCase) => {
  const template = INDEX_TEMPLATES[useCase] || INDEX_TEMPLATES['custom'];
  return template.fields;
};

// ─────────────────────────────────────────────
// STEP 2 ENRICHMENT — per-field config options
// ─────────────────────────────────────────────

const LANGUAGE_OPTIONS = [
  { value: 'en', text: 'English' },
  { value: 'multi', text: 'Multi-language' },
];

const MODEL_TYPE_OPTIONS = [
  { value: 'dense', text: 'Dense model' },
  { value: 'sparse', text: 'Sparse model' },
  { value: 'custom', text: 'Custom fine-tuned' },
];

// Resolved model name per model type (dense/sparse are fixed; custom uses the
// user-entered id). Used by the right panel and the generated pipeline.
const MODEL_BY_TYPE = {
  dense: 'all-MiniLM-L6-v2',
  sparse: 'opensearch-neural-sparse-encoding-v1',
};

const MODEL_TYPE_LABEL = {
  dense: 'Dense model',
  sparse: 'Sparse model',
  custom: 'Custom fine-tuned',
};

// We suggest enriching text fields by default; other types start unchecked but
// remain fully editable.
const isSuggestedField = (field) => field.type === 'text';

// Build the default per-field enrichment config from the detected schema.
const buildDefaultEnrichConfig = (useCase) => {
  const config = {};
  getDetectedFields(useCase).forEach((f) => {
    config[f.name] = {
      enrich: isSuggestedField(f),
      language: 'en',
      modelType: 'dense',
      customModel: '',
    };
  });
  return config;
};

// The list of fields the user actually chose to enrich (config form).
const getEnrichedFieldNames = (config) =>
  config && typeof config === 'object'
    ? Object.keys(config).filter((name) => config[name] && config[name].enrich)
    : [];

// Short rationale for the suggested enrichment, shown in the summary view.
const getSuggestionReason = (useCase) => {
  const suggested = getDetectedFields(useCase).filter(isSuggestedField);
  if (suggested.length === 0) {
    return 'No text fields were detected, so semantic enrichment isn\u2019t recommended for this data.';
  }
  const names = suggested.map((f) => f.name).join(', ');
  return `Your text fields (${names}) carry the natural-language meaning users search for, so I suggest enriching them with a dense model in English. Keyword, date, and numeric fields are better left for exact filtering.`;
};

// Resolve the model name for a field's config.
const resolveModelName = (cfg) => {
  if (!cfg) return '';
  if (cfg.modelType === 'custom') return cfg.customModel || 'custom-model';
  return MODEL_BY_TYPE[cfg.modelType] || MODEL_BY_TYPE.dense;
};

// ─────────────────────────────────────────────
// RETRIEVAL BENCHMARK (final panel) — illustrative results that reflect the
// strategy the user configured in step 2.
// ─────────────────────────────────────────────

const BENCHMARK_ROWS = [
  { key: 'bm25', strategy: 'BM25 (Baseline)', ndcg: '0.62', p99: '8', indexSize: '+0%', cost: '—' },
  { key: 'sparse', strategy: 'Sparse / ASE', ndcg: '0.74', p99: '14', indexSize: '+15%', cost: 'Low' },
  { key: 'dense', strategy: 'Dense / ASE', ndcg: '0.78', p99: '28', indexSize: '+40%', cost: 'Med' },
  { key: 'hybrid', strategy: 'Hybrid', ndcg: '0.82', p99: '32', indexSize: '+55%', cost: 'Med' },
];

// Map the user's per-field enrichment config to the strategy row that reflects
// the search they built:
//   no enrichment            → BM25 baseline (keyword only)
//   all sparse               → Sparse / ASE
//   all dense (or custom)    → Dense / ASE
//   mix of sparse and dense  → Hybrid
const deriveBenchmarkStrategy = (enrichConfig) => {
  const names = getEnrichedFieldNames(enrichConfig);
  if (names.length === 0) return 'bm25';
  const types = new Set(
    names.map((n) => (enrichConfig[n].modelType === 'sparse' ? 'sparse' : 'dense'))
  );
  if (types.has('sparse') && types.has('dense')) return 'hybrid';
  if (types.has('sparse')) return 'sparse';
  return 'dense';
};

// Human-readable description of where the data came from, for the summary panel.
const IMPORT_SOURCE_META = {
  'upload-file': { label: 'Uploaded file', detail: 'JSON / CSV', docs: '—' },
  'connect-source': { label: 'Connected data source', detail: 'S3 / API / DynamoDB', docs: 'streaming' },
  'sample-product-catalog': { label: 'Sample dataset', detail: 'Product catalog', docs: '~100' },
  'sample-document-search': { label: 'Sample dataset', detail: 'Documents', docs: '~100' },
  'sample-knowledge-base': { label: 'Sample dataset', detail: 'Knowledge base', docs: '~100' },
};

// Data sources offered when the user chooses "Connect a data source". The user
// picks one in the left conversation before the import is finalized.
const CONNECT_SOURCES = [
  { key: 's3', label: 'Amazon S3', description: 'Bulk import from an S3 bucket', icon: 'logo_aws' },
  { key: 'dynamodb', label: 'DynamoDB Streams', description: 'Real-time sync from DynamoDB', icon: 'logo_aws' },
  { key: 'api', label: 'REST API Crawler', description: 'Crawl and index from a REST API', icon: 'link' },
];

// Sample mapping JSON for the code block
const SAMPLE_MAPPING_JSON = (fields) => {
  const properties = {};
  fields.forEach((f) => {
    properties[f.name] = { type: f.type };
    if (f.type === 'text') {
      properties[f.name].analyzer = 'standard';
    }
  });
  return JSON.stringify({ mappings: { properties } }, null, 2);
};

// Ingest pipeline config for semantic enrichment. Builds one processor per
// enriched field, choosing the processor + model from that field's config.
const INGEST_PIPELINE_JSON = (config) => {
  const enriched = getEnrichedFieldNames(config);
  const processors = enriched.map((name) => {
    const cfg = config[name];
    const modelId = resolveModelName(cfg);
    const processorType = cfg.modelType === 'sparse' ? 'sparse_encoding' : 'text_embedding';
    return {
      [processorType]: {
        model_id: modelId,
        field_map: { [name]: `${name}_embedding` },
      },
    };
  });
  return JSON.stringify(
    { description: 'Semantic enrichment pipeline', processors },
    null,
    2
  );
};


// ─────────────────────────────────────────────
// RIGHT PANEL SUBCOMPONENTS
// ─────────────────────────────────────────────

const PROVISION_STEPS = [
  { key: 'collection', label: 'Collection created', icon: 'database' },
  { key: 'index', label: 'Index created', icon: 'indexMapping' },
  { key: 'pipeline', label: 'Ingest pipeline created', icon: 'compute', semanticOnly: true },
  { key: 'ingest', label: 'Data indexed', icon: 'importAction' },
];

const ImportDataPanel = ({ selectedOption, importStage, connectSource }) => {
  const isSample = typeof selectedOption === 'string' && selectedOption.startsWith('sample-');
  const isUpload = selectedOption === 'upload-file';
  const isConnect = selectedOption === 'connect-source';

  return (
    <div className="onboardWizard__rightContent">
      <RightPanelHeader
        icon="importAction"
        title="Import Data"
        subtitle="Bring your search data"
      />
      <OuiSpacer size="l" />
      <div className="onboardWizard__envGrid">
        <div className={`onboardWizard__envCard${isUpload ? ' onboardWizard__envCard--selected' : ''}`}>
          <OuiIcon type="importAction" size="l" />
          <OuiText size="s"><strong>Upload File</strong></OuiText>
          <span className="onboardWizard__envBadge">JSON / CSV</span>
        </div>
        <div className={`onboardWizard__envCard${isConnect ? ' onboardWizard__envCard--selected' : ''}`}>
          <OuiIcon type="link" size="l" />
          <OuiText size="s"><strong>Data Source</strong></OuiText>
          <span className="onboardWizard__envBadge">S3 / API</span>
        </div>
        <div className={`onboardWizard__envCard${isSample ? ' onboardWizard__envCard--selected' : ''}`}>
          <OuiIcon type="documents" size="l" />
          <OuiText size="s"><strong>Sample Data</strong></OuiText>
          <span className="onboardWizard__envBadge">~100 docs</span>
        </div>
      </div>
      {isUpload && (
        <>
          <OuiSpacer size="l" />
          <div className="onboardWizard__infoPlaceholder" style={{ minHeight: 100, borderStyle: 'dashed' }}>
            <div style={{ textAlign: 'center' }}>
              <OuiIcon type="importAction" size="xl" color="subdued" />
              <OuiSpacer size="s" />
              <OuiText size="xs" color="subdued">
                <p>{importStage === 'upload' ? 'Waiting for a file \u2014 choose one in the chat' : 'Drop a JSON or CSV file here, or paste a sample document'}</p>
              </OuiText>
            </div>
          </div>
          <OuiSpacer size="xs" />
          <OuiText size="xs" color="subdued">
            <p style={{ margin: 0 }}>I&rsquo;ll infer your field names and types from the file.</p>
          </OuiText>
        </>
      )}
      {isConnect && (
        <>
          <OuiSpacer size="l" />
          <div className="onboardWizard__storageExistingList">
            {CONNECT_SOURCES.map((src) => (
              <div
                key={src.key}
                className={`onboardWizard__storageExistingItem${
                  connectSource === src.key ? ' onboardWizard__storageExistingItem--selected' : ''
                }`}>
                <OuiIcon type={src.icon} size="s" />
                <div>
                  <OuiText size="xs"><strong>{src.label}</strong></OuiText>
                  <OuiText size="xs" color="subdued">{src.description}</OuiText>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {isSample && (
        <>
          <OuiSpacer size="l" />
          <div className="onboardWizard__envDetail">
            <OuiText size="xs"><strong>Sample dataset includes:</strong></OuiText>
            <OuiSpacer size="xs" />
            <ul className="onboardWizard__envDetailList">
              <li>~100 pre-formatted documents ready to index</li>
              <li>Realistic field values for testing queries</li>
              <li>Schema inferred automatically &mdash; no setup needed</li>
            </ul>
          </div>
        </>
      )}
      {!selectedOption && (
        <>
          <OuiSpacer size="l" />
          <div className="onboardWizard__envDetail">
            <OuiText size="xs"><strong>Pick a starting point</strong></OuiText>
            <OuiSpacer size="xs" />
            <ul className="onboardWizard__envDetailList">
              <li><strong>Upload</strong> &mdash; I&rsquo;ll infer mappings from your file</li>
              <li><strong>Data source</strong> &mdash; connect S3, DynamoDB, or an API</li>
              <li><strong>Sample data</strong> &mdash; explore with a ready-made dataset</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

const MappingPreviewPanel = ({ useCase }) => {
  const template = INDEX_TEMPLATES[useCase] || INDEX_TEMPLATES['custom'];
  const [copied, setCopied] = useState(false);

  const mappingJson = SAMPLE_MAPPING_JSON(template.fields);

  const handleCopy = () => {
    navigator.clipboard.writeText(mappingJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="onboardWizard__rightContent">
      <RightPanelHeader
        icon="indexMapping"
        title="Detected Schema"
        subtitle="Inferred from your data"
      />
      <OuiSpacer size="l" />
      {/* Field table */}
      <div className="onboardWizard__summaryList">
        {template.fields.map((field) => (
          <div key={field.name} className="onboardWizard__summaryRow" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <OuiText size="xs"><strong>{field.name}</strong></OuiText>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="onboardWizard__envBadge">{field.type}</span>
            </div>
          </div>
        ))}
      </div>
      <OuiSpacer size="m" />
      {/* JSON preview */}
      <div className="onboardWizard__codeBlock">
        <button
          type="button"
          className="onboardWizard__copyBtn"
          onClick={handleCopy}
          aria-label="Copy mapping JSON">
          <OuiIcon type={copied ? 'check' : 'copy'} size="s" />
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
        <OuiCode language="json" className="onboardWizard__code">
          {mappingJson}
        </OuiCode>
      </div>
    </div>
  );
};

const SemanticConfigPanel = ({ enrichConfig, useCase }) => {
  const detectedFields = getDetectedFields(useCase);
  const enrichedNames = getEnrichedFieldNames(enrichConfig);
  const hasSelection = enrichedNames.length > 0;

  // Which model types are in play, for the adaptive model card.
  const usesDense = enrichedNames.some((n) => enrichConfig[n].modelType === 'dense');
  const usesSparse = enrichedNames.some((n) => enrichConfig[n].modelType === 'sparse');
  const usesCustom = enrichedNames.some((n) => enrichConfig[n].modelType === 'custom');

  return (
    <div className="onboardWizard__rightContent">
      <RightPanelHeader
        icon="compute"
        title="Semantic Search"
        subtitle="AI-powered enrichment"
      />
      <OuiSpacer size="l" />

      {!hasSelection && (
        <div className="onboardWizard__envDetail">
          <OuiText size="xs"><strong>No fields enriched yet</strong></OuiText>
          <OuiSpacer size="xs" />
          <OuiText size="xs" color="subdued">
            <p style={{ margin: 0 }}>
              Select fields in the chat to enable semantic search. I&rsquo;ve suggested the
              text fields most likely to benefit. {detectedFields.length} fields detected.
            </p>
          </OuiText>
        </div>
      )}

      {hasSelection && (
        <>
          {/* Per-field enrichment plan */}
          <div className="onboardWizard__summaryList">
            {enrichedNames.map((name) => {
              const cfg = enrichConfig[name];
              return (
                <div key={name} className="onboardWizard__summaryRow" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <OuiText size="xs"><strong>{name}</strong></OuiText>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className="onboardWizard__envBadge">{cfg.language === 'multi' ? 'Multi-language' : 'English'}</span>
                    <span className="onboardWizard__envBadge">{MODEL_TYPE_LABEL[cfg.modelType]}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Models in use — neutral info list */}
          <OuiSpacer size="m" />
          <OuiText size="xs" color="subdued">
            <strong>Models in use</strong>
          </OuiText>
          <OuiSpacer size="xs" />
          <div className="onboardWizard__storageSpecs">
            {usesDense && (
              <div className="onboardWizard__storageSpecRow">
                <OuiText size="xs" color="subdued">Dense</OuiText>
                <OuiText size="xs"><strong>{MODEL_BY_TYPE.dense} &middot; 384d</strong></OuiText>
              </div>
            )}
            {usesSparse && (
              <div className="onboardWizard__storageSpecRow">
                <OuiText size="xs" color="subdued">Sparse</OuiText>
                <OuiText size="xs"><strong>{MODEL_BY_TYPE.sparse}</strong></OuiText>
              </div>
            )}
            {usesCustom && (
              <div className="onboardWizard__storageSpecRow">
                <OuiText size="xs" color="subdued">Custom</OuiText>
                <OuiText size="xs"><strong>Fine-tuned model</strong></OuiText>
              </div>
            )}
          </div>

          {/* Generated pipeline */}
          <OuiSpacer size="m" />
          <div className="onboardWizard__codeBlock">
            <OuiCode language="json" className="onboardWizard__code">
              {INGEST_PIPELINE_JSON(enrichConfig)}
            </OuiCode>
          </div>
          <OuiSpacer size="xs" />
          <OuiText size="xs" color="subdued">
            <p style={{ margin: 0 }}>This ingest pipeline will be created automatically.</p>
          </OuiText>
        </>
      )}
    </div>
  );
};

const BenchmarkTable = ({ activeStrategy }) => (
  <>
    <OuiText size="xs" color="subdued">
      <strong>Expected retrieval performance</strong>
    </OuiText>
    <OuiSpacer size="xs" />
    <OuiText size="xs" color="subdued">
      <p style={{ margin: 0 }}>
        Illustrative values; actual results vary by workload. Your configuration
        maps to the highlighted strategy.
      </p>
    </OuiText>
    <OuiSpacer size="s" />
    <table className="onboardWizard__benchTable">
      <thead>
        <tr>
          <th>Strategy</th>
          <th>NDCG@10</th>
          <th>P99 (ms)</th>
          <th>Index</th>
          <th>Cost</th>
        </tr>
      </thead>
      <tbody>
        {BENCHMARK_ROWS.map((row) => (
          <tr
            key={row.key}
            className={row.key === activeStrategy ? 'onboardWizard__benchRow--active' : undefined}>
            <td>
              {row.strategy}
              {row.key === activeStrategy && (
                <span className="onboardWizard__benchYou">Your setup</span>
              )}
            </td>
            <td>{row.ndcg}</td>
            <td>{row.p99}</td>
            <td>{row.indexSize}</td>
            <td>{row.cost}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </>
);

const ReviewSummaryPanel = ({ useCase, importOption, enrichConfig }) => {
  const template = INDEX_TEMPLATES[useCase] || INDEX_TEMPLATES['custom'];
  const source = IMPORT_SOURCE_META[importOption] || IMPORT_SOURCE_META['upload-file'];
  const enrichedNames = getEnrichedFieldNames(enrichConfig);
  const semanticCount = enrichedNames.length;
  const activeStrategy = deriveBenchmarkStrategy(enrichConfig);

  return (
    <div className="onboardWizard__rightContent">
      <RightPanelHeader
        icon="inspect"
        title="Review & Confirm"
        subtitle="What I\u2019ll create"
      />
      <OuiSpacer size="l" />
      <div className="onboardWizard__summaryList">
        <div className="onboardWizard__summaryRow">
          <OuiText size="xs" color="subdued">Collection</OuiText>
          <OuiText size="s"><strong>{template.name}-collection</strong></OuiText>
          <OuiText size="xs" color="subdued">
            <p style={{ margin: 0 }}>OpenSearch Serverless &middot; Search &middot; us-west-2</p>
          </OuiText>
        </div>
        <div className="onboardWizard__summaryRow">
          <OuiText size="xs" color="subdued">Index &amp; mapping</OuiText>
          <OuiText size="s"><strong>{template.name}</strong></OuiText>
          <OuiText size="xs" color="subdued">
            <p style={{ margin: 0 }}>{template.fields.length} fields inferred from your data</p>
          </OuiText>
        </div>
        <div className="onboardWizard__summaryRow">
          <OuiText size="xs" color="subdued">Semantic search</OuiText>
          <OuiText size="s">
            <strong>{semanticCount > 0 ? `${semanticCount} field${semanticCount > 1 ? 's' : ''} enriched` : 'Keyword only'}</strong>
          </OuiText>
          <OuiText size="xs" color="subdued">
            <p style={{ margin: 0 }}>
              {semanticCount > 0
                ? `Enrichment pipeline for ${enrichedNames.join(', ')}`
                : 'No embedding pipeline will be created'}
            </p>
          </OuiText>
        </div>
        <div className="onboardWizard__summaryRow">
          <OuiText size="xs" color="subdued">Data source</OuiText>
          <OuiText size="s"><strong>{source.label}</strong></OuiText>
          <OuiText size="xs" color="subdued">
            <p style={{ margin: 0 }}>{source.detail} &middot; {source.docs} documents</p>
          </OuiText>
        </div>
      </div>
      <OuiSpacer size="l" />
      <BenchmarkTable activeStrategy={activeStrategy} />
    </div>
  );
};

const ProvisioningLivePanel = ({ useCase, enrichConfig }) => {
  const detectedFields = getDetectedFields(useCase);
  const searchableFields = detectedFields.filter((f) => f.searchable);
  const hasSemantic = getEnrichedFieldNames(enrichConfig).length > 0;

  // The ordered list of resources to provision (pipeline only when semantic).
  const steps = PROVISION_STEPS.filter((s) => !s.semanticOnly || hasSemantic);

  const [completed, setCompleted] = useState(0);
  const isLive = completed >= steps.length;

  // Reveal each provisioning step in sequence, then surface the live results.
  useEffect(() => {
    setCompleted(0);
    const timers = [];
    for (let i = 1; i <= steps.length; i++) {
      timers.push(setTimeout(() => setCompleted(i), i * 900));
    }
    return () => timers.forEach(clearTimeout);
  }, [steps.length]);

  return (
    <div className="onboardWizard__rightContent">
      <RightPanelHeader
        icon={isLive ? 'checkInCircleFilled' : 'compute'}
        title={isLive ? 'Setup Complete' : 'Provisioning'}
        subtitle={isLive ? 'Your search is ready to use' : 'Creating your resources'}
      />
      <OuiSpacer size="l" />

      {/* Provisioning checklist */}
      <div className="onboardWizard__checklist">
        {steps.map((s, i) => {
          const done = i < completed;
          const active = i === completed;
          return (
            <div key={s.key} className="onboardWizard__checklistItem">
              {done ? (
                <OuiIcon type="checkInCircleFilled" size="m" color="success" />
              ) : active ? (
                <OuiLoadingSpinner size="m" />
              ) : (
                <OuiIcon type="dot" size="m" color="subdued" />
              )}
              <div className="onboardWizard__checklistText">
                <OuiText size="s">
                  <strong>{s.label}</strong>
                </OuiText>
              </div>
            </div>
          );
        })}
      </div>

      {isLive && (
        <>
          <OuiSpacer size="l" />
          <div className="onboardWizard__storageSpecs">
            <div className="onboardWizard__storageSpecRow">
              <OuiText size="xs" color="subdued">Documents indexed</OuiText>
              <OuiText size="xs"><strong>100</strong></OuiText>
            </div>
            <div className="onboardWizard__storageSpecRow">
              <OuiText size="xs" color="subdued">Searchable fields</OuiText>
              <OuiText size="xs"><strong>{searchableFields.length}</strong></OuiText>
            </div>
            <div className="onboardWizard__storageSpecRow">
              <OuiText size="xs" color="subdued">Semantic search</OuiText>
              <OuiText size="xs"><strong>{hasSemantic ? 'Enabled' : 'Off'}</strong></OuiText>
            </div>
            <div className="onboardWizard__storageSpecRow">
              <OuiText size="xs" color="subdued">Index status</OuiText>
              <OuiText size="xs"><strong style={{ color: '#5CB198' }}>Active</strong></OuiText>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// SHARED SUBCOMPONENTS
// ─────────────────────────────────────────────

const RightPanelHeader = ({ icon, title, subtitle }) => (
  <div className="onboardWizard__rightHeader">
    <OuiIcon type={icon} size="m" />
    <div>
      <OuiTitle size="xs">
        <h3>{title}</h3>
      </OuiTitle>
      <OuiText size="xs" color="subdued">
        {subtitle}
      </OuiText>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// RIGHT PANEL CONTENT ROUTER
// ─────────────────────────────────────────────

const RightPanelContent = ({
  step,
  selectedOption,
  confirmed,
  allSelections,
  useCase,
  importStage,
  connectSource,
}) => {
  const { rightPanel } = step;

  switch (rightPanel.contentType) {
    case 'import-data':
      return (
        <ImportDataPanel
          selectedOption={selectedOption}
          importStage={importStage}
          connectSource={connectSource}
        />
      );
    case 'mapping-preview':
      return <MappingPreviewPanel useCase={useCase} />;
    case 'semantic-config':
      return (
        <SemanticConfigPanel
          enrichConfig={selectedOption && typeof selectedOption === 'object' ? selectedOption : {}}
          useCase={useCase}
        />
      );
    case 'review-summary':
      return (
        <ReviewSummaryPanel
          useCase={useCase}
          importOption={allSelections[0]}
          enrichConfig={allSelections[2]}
        />
      );
    case 'provisioning-live':
      return (
        <ProvisioningLivePanel
          useCase={useCase}
          enrichConfig={allSelections[2]}
        />
      );
    default:
      return (
        <div className="onboardWizard__rightContent">
          <RightPanelHeader
            icon="iInCircle"
            title={rightPanel.title}
            subtitle={rightPanel.subtitle}
          />
          <OuiSpacer size="l" />
          <div className="onboardWizard__infoPlaceholder">
            <OuiText size="s" color="subdued" style={{ textAlign: 'center' }}>
              <p>Select an option to see more details here.</p>
            </OuiText>
          </div>
        </div>
      );
  }
};


// ─────────────────────────────────────────────
// MAIN PAGE COMPONENT
// ─────────────────────────────────────────────

export const OnboardingWizardPage = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState({});
  const [confirmedSteps, setConfirmedSteps] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  const [streamedText, setStreamedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(true);
  const [rightPanelFade, setRightPanelFade] = useState(true);
  // Staged import sub-flow (step 1 only). `importStage` is null until the user
  // picks a method that needs a follow-up action:
  //   'upload'  → waiting for the user to choose a file
  //   'connect' → waiting for the user to pick a data source
  // `connectSource` holds the chosen source key once selected.
  const [importStage, setImportStage] = useState(null);
  const [connectSource, setConnectSource] = useState(null);
  // Step 2 enrichment view: false = show the suggestion summary, true = show the
  // per-field editor (fields / model / language).
  const [enrichEditing, setEnrichEditing] = useState(false);
  const feedRef = useRef(null);
  const feedEndRef = useRef(null);
  const streamTimers = useRef([]);

  const totalSteps = STEPS.length;
  const totalMainSteps = STEPS[STEPS.length - 1].mainStep;
  const step = STEPS[currentStep];
  const currentSelection = selections[currentStep] ?? null;
  const isConfirmed = !!confirmedSteps[currentStep];

  // Derive use case from the step 0 import choice (sample datasets map to a
  // template; uploads / live sources fall back to `custom`).
  const useCase = deriveUseCase(selections[0]);

  // Get dynamic options for the semantic enrichment step
  const getStepOptions = (stepDef) => {
    if (stepDef.dynamicOptions) {
      return getDetectedFields(useCase).map((f) => ({
        key: f.name,
        label: f.name,
        description: `${f.type} field — will generate ${f.name}_embedding vector`,
      }));
    }
    return stepDef.options;
  };

  // Stream the current step's question text when step changes
  useEffect(() => {
    streamTimers.current.forEach(clearTimeout);
    streamTimers.current = [];

    // For the enrichment step, the suggestion rationale is part of the
    // assistant's response (a second paragraph), not a side box.
    const fullText =
      step.optionType === 'enrich'
        ? `${step.question}\n\n${getSuggestionReason(useCase)}`
        : step.question;
    const tokens = fullText.split(/(\s+)/);
    setStreamedText('');
    setIsStreaming(true);

    let built = '';
    tokens.forEach((token, i) => {
      const timer = setTimeout(() => {
        built += token;
        setStreamedText(built);
        if (i === tokens.length - 1) {
          setIsStreaming(false);
        }
      }, i * 30);
      streamTimers.current.push(timer);
    });

    return () => {
      streamTimers.current.forEach(clearTimeout);
      streamTimers.current = [];
    };
  }, [currentStep, step.question]);

  // Seed the step 2 enrichment config with suggestions when the step is shown,
  // so the right panel reflects the suggested fields right away.
  useEffect(() => {
    if (
      step.optionType === 'enrich' &&
      !isConfirmed &&
      !(selections[currentStep] && typeof selections[currentStep] === 'object')
    ) {
      setSelections((prev) => ({ ...prev, [currentStep]: buildDefaultEnrichConfig(useCase) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, step.optionType, useCase]);

  // Fade in the right panel when step changes
  useEffect(() => {
    setRightPanelFade(false);
    const timer = setTimeout(() => setRightPanelFade(true), 50);
    return () => clearTimeout(timer);
  }, [currentStep]);

  // Auto-scroll feed to bottom
  useEffect(() => {
    requestAnimationFrame(() => {
      if (feedEndRef.current) {
        feedEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    });
  }, [currentStep, isConfirmed, isProcessing, streamedText]);

  // Generic confirm+advance used by most steps.
  const confirmCurrentStep = useCallback(
    (delay = 1200) => {
      setIsProcessing(true);
      setTimeout(() => {
        setConfirmedSteps((prev) => ({ ...prev, [currentStep]: true }));
        setIsProcessing(false);
      }, delay);
    },
    [currentStep]
  );

  const handleChipSelect = useCallback(
    (key) => {
      if (isConfirmed || isProcessing) return;

      // Step 1 import: some methods need a follow-up action in the left thread
      // (choose a file, pick a data source) before the import is finalized.
      const option = (step.options || []).find((o) => o.key === key);
      if (option && option.requiresAction) {
        setSelections((prev) => ({ ...prev, [currentStep]: key }));
        setImportStage(option.requiresAction);
        setConnectSource(null);
        return;
      }

      setSelections((prev) => ({ ...prev, [currentStep]: key }));
      confirmCurrentStep();
    },
    [currentStep, isConfirmed, isProcessing, step.options, confirmCurrentStep]
  );

  // Finalize the import once the user completes the required action
  // (file chosen, or data source picked + connect clicked).
  const handleImportFinalize = useCallback(() => {
    if (isProcessing) return;
    confirmCurrentStep();
  }, [isProcessing, confirmCurrentStep]);

  const handleConnectSourcePick = useCallback(
    (sourceKey) => {
      if (isProcessing || isConfirmed) return;
      setConnectSource(sourceKey);
    },
    [isProcessing, isConfirmed]
  );

  // Abandon the staged import action and return to the method chips.
  const handleImportBack = useCallback(() => {
    if (isProcessing) return;
    setImportStage(null);
    setConnectSource(null);
    setSelections((prev) => {
      const next = { ...prev };
      delete next[currentStep];
      return next;
    });
  }, [isProcessing, currentStep]);

  // Ensure the step 2 enrichment config exists (lazily seeded with our
  // suggestions) and return it.
  const ensureEnrichConfig = useCallback(() => {
    const existing = selections[currentStep];
    if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
      return existing;
    }
    const seeded = buildDefaultEnrichConfig(useCase);
    setSelections((prev) => ({ ...prev, [currentStep]: seeded }));
    return seeded;
  }, [selections, currentStep, useCase]);

  // Update a single field's enrichment config (enrich flag, language, model).
  const handleEnrichFieldChange = useCallback(
    (fieldName, patch) => {
      if (isConfirmed || isProcessing) return;
      setSelections((prev) => {
        const base =
          prev[currentStep] && typeof prev[currentStep] === 'object' && !Array.isArray(prev[currentStep])
            ? prev[currentStep]
            : buildDefaultEnrichConfig(useCase);
        return {
          ...prev,
          [currentStep]: {
            ...base,
            [fieldName]: { ...base[fieldName], ...patch },
          },
        };
      });
    },
    [currentStep, isConfirmed, isProcessing, useCase]
  );

  const handleEnrichConfirm = useCallback(() => {
    if (isProcessing) return;
    ensureEnrichConfig();
    confirmCurrentStep();
  }, [isProcessing, ensureEnrichConfig, confirmCurrentStep]);

  // "Edit" the suggestion: opens the editor as a new turn in the conversation
  // (a user "Edit" bubble + assistant editor response), rather than swapping
  // the suggestion inline.
  const handleEnrichEdit = useCallback(() => {
    if (isProcessing) return;
    ensureEnrichConfig();
    setEnrichEditing(true);
  }, [isProcessing, ensureEnrichConfig]);

  const handleSkip = useCallback(() => {
    if (isConfirmed || isProcessing) return;
    // An empty config means "no fields enriched".
    setSelections((prev) => ({ ...prev, [currentStep]: {} }));
    confirmCurrentStep(800);
  }, [currentStep, isConfirmed, isProcessing, confirmCurrentStep]);

  // Auto-advance to next step after confirmation
  useEffect(() => {
    if (isConfirmed && currentStep < totalSteps - 1) {
      const timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
        // Clear the step 1 import sub-flow as we leave it.
        setImportStage(null);
        setConnectSource(null);
        setEnrichEditing(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmed, currentStep, totalSteps]);

  const handleStepClick = useCallback(
    (stepIdx) => {
      if (stepIdx < currentStep && confirmedSteps[stepIdx]) {
        setCurrentStep(stepIdx);
        const newSelections = { ...selections };
        const newConfirmed = { ...confirmedSteps };
        for (let i = stepIdx; i < totalSteps; i++) {
          delete newSelections[i];
          delete newConfirmed[i];
        }
        setSelections(newSelections);
        setConfirmedSteps(newConfirmed);
        // Reset the step 1 import sub-flow when jumping back.
        setImportStage(null);
        setConnectSource(null);
        setEnrichEditing(false);
      }
    },
    [currentStep, confirmedSteps, selections, totalSteps]
  );

  const handleFinalNavigation = () => {
    window.location.hash = '/sample-pages';
  };

  const handleSend = () => {
    const text = message.trim();
    if (!text) return;
    // Typed shortcuts only apply to chip steps; the enrich step is edited via
    // its per-field controls, not free text.
    if (step.optionType === 'chips') {
      const options = getStepOptions(step);
      const matchedOption = options.find(
        (opt) => opt.label.toLowerCase() === text.toLowerCase()
      );
      if (matchedOption) {
        handleChipSelect(matchedOption.key);
      }
    }
    setMessage('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isLastStep = currentStep === totalSteps - 1;

  // Build the conversation messages
  const buildConversation = () => {
    const messages = [];
    const currentMainStep = step.mainStep;

    for (let i = 0; i < currentStep; i++) {
      const pastStep = STEPS[i];
      const pastSelection = selections[i];

      if (pastStep.mainStep !== currentMainStep) continue;

      messages.push(
        <div key={`q-${i}`} className="threadPage__message threadPage__message--assistant">
          <div className="threadPage__bubble threadPage__bubble--assistant">
            <OuiText size="s">
              <p>{pastStep.question}</p>
            </OuiText>
          </div>
        </div>
      );

      if (pastSelection) {
        const selectionLabel = getSelectionLabel(pastStep, pastSelection, useCase);
        messages.push(
          <div key={`a-${i}`} className="threadPage__message threadPage__message--user">
            <div className="threadPage__bubble threadPage__bubble--user">
              <OuiText size="s">
                <p>{selectionLabel}</p>
              </OuiText>
            </div>
          </div>
        );
      }

      if (confirmedSteps[i] && pastStep.confirmation) {
        messages.push(
          <div key={`c-${i}`} className="threadPage__message threadPage__message--assistant">
            <div className="threadPage__bubble threadPage__bubble--assistant">
              <div className="onboardWizard__confirmInline">
                <OuiIcon type="checkInCircleFilled" size="s" color="success" />
                <OuiText size="xs">
                  <span>{pastStep.confirmation(pastSelection)}</span>
                </OuiText>
              </div>
            </div>
          </div>
        );
      }
    }

    // Current step question
    messages.push(
      <div key={`q-${currentStep}`} className="threadPage__message threadPage__message--assistant">
        <div className="threadPage__bubble threadPage__bubble--assistant">
          <OuiText size="s">
            {streamedText.split('\n\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </OuiText>
          {!isStreaming && !isConfirmed && !importStage && (
            <>
              <OuiSpacer size="m" />
              {renderOptions()}
            </>
          )}
        </div>
      </div>
    );

    // Staged import sub-flow (step 1): show the picked method as a user turn,
    // then an assistant follow-up that asks for the required action.
    if (importStage && !isConfirmed) {
      const methodOption = (step.options || []).find(
        (o) => o.key === currentSelection
      );
      messages.push(
        <div key={`import-pick-${currentStep}`} className="threadPage__message threadPage__message--user">
          <div className="threadPage__bubble threadPage__bubble--user">
            <OuiText size="s">
              <p>{methodOption ? methodOption.label : 'Import data'}</p>
            </OuiText>
          </div>
        </div>
      );
      if (!isProcessing) {
        messages.push(
          <div key={`import-action-${currentStep}`} className="threadPage__message threadPage__message--assistant">
            <div className="threadPage__bubble threadPage__bubble--assistant">
              {renderImportAction()}
            </div>
          </div>
        );
      }
    }

    // Enrichment "Edit" sub-flow (step 2): clicking Edit on the suggestion adds
    // a new user turn + an assistant turn containing the full editor.
    if (step.optionType === 'enrich' && enrichEditing && !isConfirmed) {
      messages.push(
        <div key={`enrich-edit-${currentStep}`} className="threadPage__message threadPage__message--user">
          <div className="threadPage__bubble threadPage__bubble--user">
            <OuiText size="s">
              <p>Edit the suggestion</p>
            </OuiText>
          </div>
        </div>
      );
      if (!isProcessing) {
        messages.push(
          <div key={`enrich-editor-${currentStep}`} className="threadPage__message threadPage__message--assistant">
            <div className="threadPage__bubble threadPage__bubble--assistant">
              <OuiText size="s">
                <p style={{ marginTop: 0 }}>
                  Sure \u2014 adjust the fields, model type, and language below.
                </p>
              </OuiText>
              <OuiSpacer size="s" />
              {renderEnrichEditor()}
            </div>
          </div>
        );
      }
    }

    // User selection for current step
    if (currentSelection && isConfirmed) {
      const selectionLabel = getSelectionLabel(step, currentSelection, useCase);
      messages.push(
        <div key={`a-${currentStep}`} className="threadPage__message threadPage__message--user">
          <div className="threadPage__bubble threadPage__bubble--user">
            <OuiText size="s">
              <p>{selectionLabel}</p>
            </OuiText>
          </div>
        </div>
      );
    }

    // Processing indicator
    if (isProcessing) {
      messages.push(
        <div key="processing" className="threadPage__message threadPage__message--assistant">
          <div className="threadPage__bubble threadPage__bubble--assistant">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <OuiLoadingSpinner size="s" />
              <OuiText size="xs" color="subdued">Processing...</OuiText>
            </div>
          </div>
        </div>
      );
    }

    // Confirmation
    if (isConfirmed && step.confirmation) {
      messages.push(
        <div key={`c-${currentStep}`} className="threadPage__message threadPage__message--assistant">
          <div className="threadPage__bubble threadPage__bubble--assistant">
            <div className="onboardWizard__confirmInline">
              <OuiIcon type="checkInCircleFilled" size="s" color="success" />
              <OuiText size="xs">
                <span>{step.confirmation(currentSelection)}</span>
              </OuiText>
            </div>
          </div>
        </div>
      );
    }

    return messages;
  };

  // Render the staged import action (file picker or data source picker) shown
  // inside the assistant bubble during the step 1 sub-flow.
  const renderImportAction = () => {
    if (importStage === 'upload') {
      return (
        <>
          <OuiText size="s">
            <p style={{ marginTop: 0 }}>
              Choose a JSON or CSV file and I&rsquo;ll infer your schema from it.
            </p>
          </OuiText>
          <OuiSpacer size="s" />
          <div className="onboardWizard__multiActions">
            <button
              type="button"
              className="onboardWizard__chip onboardWizard__chip--confirm"
              onClick={handleImportFinalize}
              disabled={isProcessing}>
              Choose file
            </button>
            <button
              type="button"
              className="onboardWizard__skipLink"
              onClick={handleImportBack}
              disabled={isProcessing}>
              Back
            </button>
          </div>
        </>
      );
    }

    if (importStage === 'connect') {
      return (
        <>
          <OuiText size="s">
            <p style={{ marginTop: 0 }}>Which data source would you like to connect?</p>
          </OuiText>
          <OuiSpacer size="s" />
          <div className="onboardWizard__chips">
            {CONNECT_SOURCES.map((src) => (
              <button
                key={src.key}
                type="button"
                className={`onboardWizard__chip${
                  connectSource === src.key ? ' onboardWizard__chip--selected' : ''
                }`}
                onClick={() => handleConnectSourcePick(src.key)}
                disabled={isProcessing}>
                <span>{src.label}</span>
                <span className="onboardWizard__chipDescription">{src.description}</span>
              </button>
            ))}
          </div>
          <OuiSpacer size="s" />
          <div className="onboardWizard__multiActions">
            <button
              type="button"
              className="onboardWizard__chip onboardWizard__chip--confirm"
              onClick={handleImportFinalize}
              disabled={isProcessing || !connectSource}>
              Connect
            </button>
            <button
              type="button"
              className="onboardWizard__skipLink"
              onClick={handleImportBack}
              disabled={isProcessing}>
              Back
            </button>
          </div>
        </>
      );
    }

    return null;
  };

  // Render interactive options
  const renderOptions = () => {
    if (isConfirmed) return null;
    const options = getStepOptions(step);

    if (step.optionType === 'chips') {
      return (
        <>
          <div className="onboardWizard__chips">
            {options.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className={`onboardWizard__chip${
                  currentSelection === opt.key ? ' onboardWizard__chip--selected' : ''
                }${opt.primary ? ' onboardWizard__chip--confirm' : ''}${opt.empty ? ' onboardWizard__chip--empty' : ''}`}
                onClick={() =>
                  isLastStep ? handleFinalNavigation() : handleChipSelect(opt.key)
                }
                disabled={isConfirmed || isProcessing}>
                <span>{opt.label}</span>
                {opt.description && (
                  <span className="onboardWizard__chipDescription">{opt.description}</span>
                )}
              </button>
            ))}
          </div>
          {step.skipLabel && (
            <div className="onboardWizard__multiActions" style={{ marginTop: 8 }}>
              <button
                type="button"
                className="onboardWizard__skipLink"
                onClick={handleSkip}
                disabled={isProcessing}>
                {step.skipLabel}
              </button>
            </div>
          )}
        </>
      );
    }

    if (step.optionType === 'enrich') {
      const config =
        currentSelection && typeof currentSelection === 'object' && !Array.isArray(currentSelection)
          ? currentSelection
          : buildDefaultEnrichConfig(useCase);
      const enrichedNames = getEnrichedFieldNames(config);
      const enrichedCount = enrichedNames.length;

      // Suggestion summary — always shown in the question bubble. "Edit" opens
      // the full editor as a new turn (see buildConversation), not inline.
      return (
        <div className="onboardWizard__enrichSuggestion">
          {enrichedCount > 0 && (
            <div className="onboardWizard__enrichSuggestList">
              {enrichedNames.map((name) => {
                const cfg = config[name];
                return (
                  <div key={name} className="onboardWizard__enrichSuggestRow">
                    <OuiText size="s"><strong>{name}</strong></OuiText>
                    <div className="onboardWizard__enrichSuggestTags">
                      <span className="onboardWizard__enrichType">
                        {cfg.language === 'multi' ? 'Multi-language' : 'English'}
                      </span>
                      <span className="onboardWizard__enrichType">
                        {MODEL_TYPE_LABEL[cfg.modelType]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!isConfirmed && !enrichEditing && (
            <div className="onboardWizard__multiActions">
              <button
                type="button"
                className="onboardWizard__chip onboardWizard__chip--confirm"
                onClick={handleEnrichConfirm}
                disabled={isProcessing || enrichedCount === 0}>
                {enrichedCount > 0
                  ? `Confirm suggestion (${enrichedCount})`
                  : 'Confirm'}
              </button>
              <button
                type="button"
                className="onboardWizard__chip"
                onClick={handleEnrichEdit}
                disabled={isProcessing}>
                Edit
              </button>
              <button
                type="button"
                className="onboardWizard__skipLink"
                onClick={handleSkip}
                disabled={isProcessing}>
                {step.skipLabel}
              </button>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // The full per-field enrichment editor, shown as a new assistant turn after
  // the user clicks "Edit" on the suggestion.
  const renderEnrichEditor = () => {
    const config =
      currentSelection && typeof currentSelection === 'object' && !Array.isArray(currentSelection)
        ? currentSelection
        : buildDefaultEnrichConfig(useCase);
    const detected = getDetectedFields(useCase);
    const enrichedCount = getEnrichedFieldNames(config).length;

    return (
      <div className="onboardWizard__enrichList">
        {detected.map((field) => {
          const cfg = config[field.name] || {
            enrich: false,
            language: 'en',
            modelType: 'dense',
            customModel: '',
          };
          const suggested = isSuggestedField(field);
          return (
            <div
              key={field.name}
              className={`onboardWizard__enrichRow${cfg.enrich ? ' onboardWizard__enrichRow--on' : ''}`}>
              <div className="onboardWizard__enrichHead">
                <OuiCheckbox
                  id={`enrich-${field.name}`}
                  label={field.name}
                  checked={!!cfg.enrich}
                  onChange={(e) =>
                    handleEnrichFieldChange(field.name, { enrich: e.target.checked })
                  }
                  disabled={isConfirmed || isProcessing}
                />
                <span className="onboardWizard__enrichType">{field.type}</span>
                {suggested && (
                  <span className="onboardWizard__storageBadge">Suggested</span>
                )}
              </div>
              {cfg.enrich && (
                <div className="onboardWizard__enrichControls">
                  <OuiCompressedSelect
                    prepend="Language"
                    options={LANGUAGE_OPTIONS}
                    value={cfg.language}
                    onChange={(e) =>
                      handleEnrichFieldChange(field.name, { language: e.target.value })
                    }
                    disabled={isConfirmed || isProcessing}
                    aria-label={`Language for ${field.name}`}
                  />
                  <OuiCompressedSelect
                    prepend="Model"
                    options={MODEL_TYPE_OPTIONS}
                    value={cfg.modelType}
                    onChange={(e) =>
                      handleEnrichFieldChange(field.name, { modelType: e.target.value })
                    }
                    disabled={isConfirmed || isProcessing}
                    aria-label={`Model type for ${field.name}`}
                  />
                  {cfg.modelType === 'custom' && (
                    <OuiCompressedFieldText
                      placeholder="Custom model ID (e.g. my-org/my-model)"
                      value={cfg.customModel}
                      onChange={(e) =>
                        handleEnrichFieldChange(field.name, { customModel: e.target.value })
                      }
                      disabled={isConfirmed || isProcessing}
                      aria-label={`Custom model id for ${field.name}`}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
        {!isConfirmed && (
          <div className="onboardWizard__multiActions">
            <button
              type="button"
              className="onboardWizard__chip onboardWizard__chip--confirm"
              onClick={handleEnrichConfirm}
              disabled={isProcessing || enrichedCount === 0}>
              {enrichedCount > 0
                ? `Enable semantic search (${enrichedCount})`
                : 'Enable semantic search'}
            </button>
            <button
              type="button"
              className="onboardWizard__skipLink"
              onClick={handleSkip}
              disabled={isProcessing}>
              {step.skipLabel}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}>
      <SessionLeftNav
        isEmptySession={true}
        activeView="session"
        disableActions={true}
        onCreateSession={() => {}}
        onBrowseSessions={() => {}}
        onBrowseLibrary={() => {}}
        onSelectSession={() => {}}
      />

      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
        }}>
        <div
          className="samplePagesContentPanel"
          style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <div className="onboardWizard">
            {/* Left Panel */}
            <div className="onboardWizard__left">
              <div className="onboardWizard__leftPanel">
                <div className="threadPage__body">
                  <div className="threadPage__conversationCol">
                    {/* Step indicator */}
                    <div className="onboardWizard__stepIndicator" style={{ padding: '12px 16px 0' }}>
                      <OuiTitle size="xxxs">
                        <h6>Step {step.mainStep} of {totalMainSteps}</h6>
                      </OuiTitle>
                      <OuiTitle size="s">
                        <h3>{step.title}</h3>
                      </OuiTitle>
                      <div className="onboardWizard__timeline" style={{ marginTop: 8 }}>
                        {Array.from({ length: totalMainSteps }, (_, mainIdx) => {
                          const mainNum = mainIdx + 1;
                          const isMainDone = step.mainStep > mainNum;
                          const isMainCurrent = step.mainStep === mainNum;
                          const firstSubIdx = STEPS.findIndex((s) => s.mainStep === mainNum);
                          if (isMainDone) {
                            return (
                              <button
                                key={mainIdx}
                                type="button"
                                className="onboardWizard__timelineDot onboardWizard__timelineDot--done"
                                onClick={() => handleStepClick(firstSubIdx)}
                                aria-label={`Go back to step ${mainNum}: ${STEPS[firstSubIdx].title}`}
                                title={STEPS[firstSubIdx].title}
                              />
                            );
                          }
                          if (isMainCurrent) {
                            return (
                              <span
                                key={mainIdx}
                                className="onboardWizard__timelineDot onboardWizard__timelineDot--current"
                              />
                            );
                          }
                          return (
                            <span
                              key={mainIdx}
                              className="onboardWizard__timelineDot onboardWizard__timelineDot--inactive"
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Conversation feed */}
                    <div className="threadPage__feed" ref={feedRef}>
                      {buildConversation()}
                      <div ref={feedEndRef} />
                    </div>

                    {/* Input area */}
                    <div className="threadPage__inputArea">
                      <div className="threadPage__inputWrapper">
                        <OuiCompressedTextArea
                          placeholder="Ask anything or use / for commands"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyDown={handleKeyDown}
                          rows={2}
                          resize="none"
                          fullWidth
                          className="threadPage__textarea"
                        />
                        <div className="threadPage__inputActions">
                          <OuiButtonIcon
                            iconType="plus"
                            aria-label="Add attachment"
                            size="s"
                            color="text"
                          />
                          <OuiButtonIcon
                            iconType="sortUp"
                            aria-label="Send message"
                            display="fill"
                            size="s"
                            isDisabled={!message.trim() || isProcessing}
                            onClick={handleSend}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel */}
            <div className="onboardWizard__right">
              <div className={`onboardWizard__rightPanel${rightPanelFade ? ' onboardWizard__rightPanel--fadeIn' : ''}`} key={currentStep}>
                <RightPanelContent
                  step={step}
                  selectedOption={currentSelection}
                  confirmed={isConfirmed}
                  allSelections={selections}
                  useCase={useCase}
                  importStage={importStage}
                  connectSource={connectSource}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper to get a label for a user's selection
function getSelectionLabel(step, selection, useCase) {
  // Step 2 enrichment stores a per-field config object.
  if (step.dynamicOptions && selection && typeof selection === 'object' && !Array.isArray(selection)) {
    const names = getEnrichedFieldNames(selection);
    if (names.length === 0) return 'Skipped';
    return names
      .map((name) => {
        const cfg = selection[name];
        return `${name} (${cfg.language === 'multi' ? 'Multi' : 'EN'} · ${MODEL_TYPE_LABEL[cfg.modelType]})`;
      })
      .join(', ');
  }
  if (Array.isArray(selection)) {
    if (selection.length === 0) return 'Skipped';
    return selection
      .map((key) => {
        const options = step.dynamicOptions
          ? getDetectedFields(useCase).map((f) => ({ key: f.name, label: f.name }))
          : step.options;
        const opt = options.find((o) => o.key === key);
        return opt ? opt.label : key;
      })
      .join(', ');
  }
  const opt = step.options.find((o) => o.key === selection);
  return opt ? opt.label : selection;
}
