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

import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';

import {
  OuiFieldSearch,
  OuiButton,
  OuiCompressedSelect,
  OuiCompressedTextArea,
  OuiIcon,
  OuiText,
  OuiTitle,
  OuiSpacer,
  OuiLink,
} from '../../../../src/components';

// ─────────────────────────────────────────────
// MOCK DATA — two ranked result sets for "laptop"
// Each item has a stable `id` so we can match the same document across the two
// lists and draw connector lines showing how its rank moved.
// ─────────────────────────────────────────────

const INDEX_OPTIONS = [
  { value: 'ecommerce', text: 'ecommerce' },
  { value: 'products', text: 'products' },
  { value: 'catalog', text: 'catalog' },
];

const PIPELINE_OPTIONS = [
  { value: '', text: '— none —' },
  { value: 'normalization-pipeline', text: 'normalization-pipeline' },
  { value: 'rerank-pipeline', text: 'rerank-pipeline' },
];

const QUERY_1_DSL = `{
  "query": {
    "multi_match": {
      "query": "%SearchText%",
      "fields": ["id", "title", "category", "bullet_points", "description", "brand"]
    }
  },
  "_source": ["id", "title", "category", "brand", "image"]
}`;

const QUERY_2_DSL = `{
  "query": {
    "hybrid": {
      "queries": [
        {
          "multi_match": {
            "query": "%SearchText%",
            "fields": ["id", "title", "category", "bullet_points", "description"]
          }
        },
        {
          "neural": {
            "title_embedding": {
              "query_text": "%SearchText%",
              "model_id": "all-MiniLM-L6-v2",
              "k": 10
            }
          }
        }
      ]
    }
  },
  "_source": ["id", "title", "category", "brand", "image"]
}`;

// Result 1 — plain multi_match (keyword) ranking
const RESULT_1 = [
  { id: 'd1', title: 'RiwiR Laptop Desk Pink Foldable Lap Desk...' },
  { id: 'd2', title: 'Alapmk Protective Case Cover for 11.6" S...' },
  { id: 'd3', title: 'Foldable Bed Table for Laptop, Laptop De...' },
  { id: 'd4', title: 'Kinmac 360° Protective Waterproof Laptop...' },
  { id: 'd5', title: 'Bed Desk with Drawer, Phone and Cup Hold...' },
  { id: 'd6', title: 'Mount-It! Laptop Desk Stand Mount | Arti...' },
  { id: 'd7', title: 'Osprey Nebula Men\u2019s Laptop Backpack, Bla...' },
  { id: 'd8', title: 'Cooling Pad for Laptop, 5 Quiet Fans...' },
  { id: 'd9', title: 'Laptop Sleeve Case 13-13.3 inch, Water R...' },
  { id: 'd10', title: 'Adjustable Laptop Stand for Desk, Ergono...' },
];

// Result 2 — hybrid + normalization ranking (re-ordered, some new docs)
const RESULT_2 = [
  { id: 'n1', title: 'Lenovo Chromebook C330 2-in-1 Convertibl...' },
  { id: 'd1', title: 'RiwiR Laptop Desk Pink Foldable Lap Desk...' },
  { id: 'n2', title: 'HP Stream 14-inch Laptop, AMD Dual-Core ...' },
  { id: 'd2', title: 'Alapmk Protective Case Cover for 11.6" S...' },
  { id: 'n3', title: 'HP Stream 14-inch Laptop, Intel Celeron ...' },
  { id: 'n4', title: 'Laptop HP X360 14a Chromebook 14" HD Tou...' },
  { id: 'd3', title: 'Foldable Bed Table for Laptop, Laptop De...' },
  { id: 'd4', title: 'Kinmac 360° Protective Waterproof Laptop...' },
  { id: 'n5', title: 'ASUS VivoBook 15 Thin and Light Laptop...' },
  { id: 'd6', title: 'Mount-It! Laptop Desk Stand Mount | Arti...' },
];

const DISPLAY_FIELD_OPTIONS = [
  { value: 'title', text: 'Title' },
  { value: 'id', text: 'ID' },
  { value: 'brand', text: 'Brand' },
];

// ─────────────────────────────────────────────
// QUERY CONFIG COLUMN
// ─────────────────────────────────────────────

const QueryConfigColumn = ({
  label,
  index,
  onIndexChange,
  pipeline,
  onPipelineChange,
  dsl,
  onDslChange,
}) => (
  <div className="querySetCompare__queryCol">
    <OuiTitle size="xs">
      <h3>{label}</h3>
    </OuiTitle>
    <OuiSpacer size="m" />
    <div className="querySetCompare__queryFields">
      <div className="querySetCompare__field">
        <OuiText size="xs" color="subdued">
          <strong>Index</strong>
        </OuiText>
        <OuiSpacer size="xs" />
        <OuiCompressedSelect
          options={INDEX_OPTIONS}
          value={index}
          onChange={(e) => onIndexChange(e.target.value)}
          aria-label={`Index for ${label}`}
        />
      </div>
      <div className="querySetCompare__field">
        <OuiText size="xs" color="subdued">
          <strong>Pipeline</strong> <em>- optional</em>
        </OuiText>
        <OuiSpacer size="xs" />
        <OuiCompressedSelect
          options={PIPELINE_OPTIONS}
          value={pipeline}
          onChange={(e) => onPipelineChange(e.target.value)}
          aria-label={`Pipeline for ${label}`}
        />
      </div>
    </div>
    <OuiSpacer size="s" />
    <div className="querySetCompare__queryLabelRow">
      <OuiText size="xs" color="subdued">
        <strong>Query</strong>
      </OuiText>
      <OuiLink href="#">Help</OuiLink>
    </div>
    <OuiSpacer size="xs" />
    <OuiCompressedTextArea
      className="querySetCompare__queryEditor"
      value={dsl}
      onChange={(e) => onDslChange(e.target.value)}
      placeholder={'Enter a query in OpenSearch Query DSL.\nUse %SearchText% to refer to the search bar text.'}
      rows={9}
      fullWidth
      aria-label={`Query DSL for ${label}`}
    />
    <OuiSpacer size="xs" />
    <OuiText size="xs" color="subdued">
      <p style={{ margin: 0 }}>
        Enter a query in OpenSearch Query DSL. Use{' '}
        <code>%SearchText%</code> to refer to the text in the search bar.
      </p>
    </OuiText>
  </div>
);

// ─────────────────────────────────────────────
// OVERLAP SUMMARY (unique / common / unique)
// ─────────────────────────────────────────────

const computeOverlap = (left, right) => {
  const rightIds = new Set(right.map((r) => r.id));
  const leftIds = new Set(left.map((r) => r.id));
  const common = left.filter((r) => rightIds.has(r.id)).length;
  return {
    leftUnique: left.length - common,
    common,
    rightUnique: right.filter((r) => !leftIds.has(r.id)).length,
  };
};

const OverlapBar = ({ leftUnique, common, rightUnique }) => (
  <div className="querySetCompare__overlap">
    <div className="querySetCompare__overlapSeg querySetCompare__overlapSeg--left">
      <span className="querySetCompare__overlapNum">{leftUnique}</span>
      <span className="querySetCompare__overlapLabel">Unique</span>
    </div>
    <div className="querySetCompare__overlapSeg querySetCompare__overlapSeg--common">
      <span className="querySetCompare__overlapNum">{common}</span>
      <span className="querySetCompare__overlapLabel">Common</span>
    </div>
    <div className="querySetCompare__overlapSeg querySetCompare__overlapSeg--right">
      <span className="querySetCompare__overlapNum">{rightUnique}</span>
      <span className="querySetCompare__overlapLabel">Unique</span>
    </div>
  </div>
);

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export const QuerySetComparisonPage = ({ initialMode = 'empty' }) => {
  const filled = initialMode === 'filled';

  const [searchText, setSearchText] = useState(filled ? 'laptop' : '');
  const [submittedText, setSubmittedText] = useState(filled ? 'laptop' : '');
  const [index1, setIndex1] = useState(filled ? 'ecommerce' : '');
  const [pipeline1, setPipeline1] = useState('');
  const [index2, setIndex2] = useState(filled ? 'ecommerce' : '');
  const [pipeline2, setPipeline2] = useState(filled ? 'normalization-pipeline' : '');
  const [query1, setQuery1] = useState(filled ? QUERY_1_DSL : '');
  const [query2, setQuery2] = useState(filled ? QUERY_2_DSL : '');
  const [displayField, setDisplayField] = useState('title');

  // Results only exist in the filled state (mock). The empty state shows the
  // empty results placeholder until real execution is wired up.
  const [result1, setResult1] = useState(filled ? RESULT_1 : []);
  const [result2, setResult2] = useState(filled ? RESULT_2 : []);
  const hasResults = result1.length > 0 || result2.length > 0;

  const overlap = computeOverlap(result1, result2);

  // Refs for connector lines: container + each result row by id+side.
  const resultsRef = useRef(null);
  const leftRowRefs = useRef({});
  const rightRowRefs = useRef({});
  const [lines, setLines] = useState([]);

  const recomputeLines = useCallback(() => {
    const container = resultsRef.current;
    if (!container) return;
    const base = container.getBoundingClientRect();
    const next = [];
    result1.forEach((item) => {
      const leftEl = leftRowRefs.current[item.id];
      const rightEl = rightRowRefs.current[item.id];
      if (!leftEl || !rightEl) return; // doc not present on both sides
      const l = leftEl.getBoundingClientRect();
      const r = rightEl.getBoundingClientRect();
      next.push({
        id: item.id,
        x1: l.right - base.left,
        y1: l.top + l.height / 2 - base.top,
        x2: r.left - base.left,
        y2: r.top + r.height / 2 - base.top,
      });
    });
    setLines(next);
  }, [result1]);

  useLayoutEffect(() => {
    recomputeLines();
    window.addEventListener('resize', recomputeLines);
    return () => window.removeEventListener('resize', recomputeLines);
  }, [recomputeLines, submittedText, hasResults]);

  // Run the comparison. In this mock, a search only produces results when the
  // page is in the filled scenario; otherwise it stays in the empty state.
  const handleSearch = () => {
    setSubmittedText(searchText.trim());
    if (filled) {
      setResult1(RESULT_1);
      setResult2(RESULT_2);
    }
  };

  const renderResultList = (results, side, refMap) => (
    <div className="querySetCompare__resultList">
      <div className="querySetCompare__resultListHeader">
        <OuiText size="s">
          <strong>{side === 'left' ? 'Result 1' : 'Result 2'}</strong>
        </OuiText>
        <OuiText size="xs" color="subdued">
          ({results.length} results)
        </OuiText>
      </div>
      <OuiSpacer size="s" />
      {results.map((item, i) => {
        const common =
          side === 'left'
            ? result2.some((r) => r.id === item.id)
            : result1.some((r) => r.id === item.id);
        return (
          <div
            key={item.id}
            ref={(el) => {
              refMap.current[item.id] = el;
            }}
            className={`querySetCompare__resultRow querySetCompare__resultRow--${side}`}>
            {side === 'left' && (
              <span className="querySetCompare__resultTitle">
                {displayField === 'title' ? item.title : item.id}
              </span>
            )}
            <span className="querySetCompare__resultThumb">
              <OuiIcon type="documents" size="m" />
            </span>
            <span
              className={`querySetCompare__rank${
                common ? ' querySetCompare__rank--common' : ' querySetCompare__rank--unique'
              }`}>
              {i + 1}
            </span>
            {side === 'right' && (
              <span className="querySetCompare__resultTitle">
                {displayField === 'title' ? item.title : item.id}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="querySetCompare">
      {/* Search bar */}
      <div className="querySetCompare__searchBar">
        <OuiFieldSearch
          placeholder="Search"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={handleSearch}
          fullWidth
          aria-label="Search text"
        />
        <OuiButton fill onClick={handleSearch}>
          Search
        </OuiButton>
      </div>

      {/* Two query editors */}
      <div className="querySetCompare__queries">
        <QueryConfigColumn
          label="Query 1"
          index={index1}
          onIndexChange={setIndex1}
          pipeline={pipeline1}
          onPipelineChange={setPipeline1}
          dsl={query1}
          onDslChange={setQuery1}
        />
        <QueryConfigColumn
          label="Query 2"
          index={index2}
          onIndexChange={setIndex2}
          pipeline={pipeline2}
          onPipelineChange={setPipeline2}
          dsl={query2}
          onDslChange={setQuery2}
        />
      </div>

      {/* Results */}
      <div className="querySetCompare__results">
        <OuiTitle size="xs">
          <h3>
            {hasResults && submittedText ? (
              <>
                Results for query: <em>{submittedText}</em>
              </>
            ) : (
              'Results'
            )}
          </h3>
        </OuiTitle>
        <OuiSpacer size="m" />

        {!hasResults ? (
          <div className="querySetCompare__emptyResults">
            <OuiIcon type="search" size="xl" color="subdued" />
            <OuiSpacer size="s" />
            <OuiText size="s" color="subdued">
              <p style={{ margin: 0 }}>
                Configure both queries and run a search to compare results
                side by side.
              </p>
            </OuiText>
          </div>
        ) : (
          <>
            <div className="querySetCompare__displayField">
              <OuiText size="xs" color="subdued">
                <strong>Display Field</strong>
              </OuiText>
              <OuiSpacer size="xs" />
              <OuiCompressedSelect
                options={DISPLAY_FIELD_OPTIONS}
                value={displayField}
                onChange={(e) => setDisplayField(e.target.value)}
                aria-label="Display field"
              />
            </div>
            <OuiSpacer size="l" />
            <OverlapBar {...overlap} />
            <OuiSpacer size="l" />

            <div className="querySetCompare__compareGrid" ref={resultsRef}>
              {renderResultList(result1, 'left', leftRowRefs)}
              <svg className="querySetCompare__connectors" aria-hidden="true">
                {lines.map((ln) => (
                  <line
                    key={ln.id}
                    x1={ln.x1}
                    y1={ln.y1}
                    x2={ln.x2}
                    y2={ln.y2}
                    className="querySetCompare__connectorLine"
                  />
                ))}
              </svg>
              {renderResultList(result2, 'right', rightRowRefs)}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
