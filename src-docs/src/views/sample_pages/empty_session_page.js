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

import React, { useState, useMemo } from 'react';

import {
  OuiButtonIcon,
  OuiCompressedTextArea,
  OuiIcon,
  OuiTab,
  OuiTabs,
  OuiText,
  OuiTitle,
} from '../../../../src/components';

import {
  Chart,
  Settings,
  Axis,
  BarSeries,
  LineSeries,
  ScaleType,
} from '@elastic/charts';

import { SOURCE_PAGE_MOCK } from './session_models';
import { OllyAvatar } from './olly_avatar';
import { Mascot } from '../../../../olly-mascot/Mascot';

/**
 * Quick access shortcut definitions.
 * Maps to existing OUI icon assets.
 */

/**
 * Filter chips for the bottom section.
 */
const FILTER_CHIPS = [
  { key: 'recent', label: null, icon: 'history', iconOnly: true },
  { key: 'activity', label: 'Overview' },
  { key: 'discover', label: 'Discover', icon: 'navDiscover' },
  { key: 'monitor', label: 'Monitor', icon: 'navAlerting' },
  { key: 'more', label: 'More', icon: 'apps' },
];

/**
 * Mock data for each filter chip.
 */
const CHIP_DATA = {
  activity: [
    {
      key: 'insight-1',
      title: 'Relevancy degradation — wireless headphones',
      subtitle: 'Critical · Detected 2h 19m ago',
      summary: 'nDCG@10 dropped 18% vs the 7-day baseline across 142 query variants (~3,200 searches/hr). Root cause identified — a reindex dropped the custom analyzer on the features field. Two-phase fix proposed.',
      meta: 'Segment: audio/headphones/wireless',
      icon: 'alert',
      sessionId: 'latency-spike-session',
    },
    {
      key: 'insight-2',
      title: 'Schema optimization suggestion',
      subtitle: 'AI recommendation · 1 hour ago',
      summary: 'The "description" field could benefit from a synonym analyzer. 12% of queries match on title but miss relevant description content.',
      meta: 'Field: description',
      icon: 'indexMapping',
      sessionId: 'error-rate-spike-session',
    },
  ],
  recent: [
    { key: 'query-1', title: 'wireless headphones', subtitle: 'Search query · 42 results · 5 min ago' },
    { key: 'query-2', title: 'best wireless headphones 2024', subtitle: 'Search query · 38 results · 12 min ago' },
    { key: 'query-3', title: 'noise cancelling headphones', subtitle: 'Search query · 24 results · 30 min ago' },
    { key: 'dash-4', title: 'Search analytics dashboard', subtitle: 'Dashboard · Updated just now' },
  ],
  favorite: [
    { key: 'fav-1', title: 'Search analytics', subtitle: 'Dashboard', pageKey: 'dashboards', typeIcon: 'navDashboards' },
    { key: 'fav-2', title: 'Queries with low relevance', subtitle: 'Saved query', pageKey: 'logs', typeIcon: 'navDiscover' },
  ],
  discover: [
    { key: 'log-1', title: 'Queries with low relevance', subtitle: 'source=search_logs | where max_score < 0.5' },
    { key: 'log-2', title: 'Zero-result queries', subtitle: 'source=search_logs | where hits=0' },
    { key: 'log-3', title: 'Top queries by volume', subtitle: 'source=search_logs | stats count() by query' },
    { key: 'log-4', title: 'Click-through rate by query', subtitle: 'source=search_logs | stats avg(clicked) by query' },
    { key: 'log-5b', title: 'Abandoned searches', subtitle: 'source=search_logs | where clicked=0' },
  ],
  monitor: [
    { key: 'alert-1', title: 'nDCG@10 dropped 18% — wireless headphones', subtitle: 'Critical · 2h 19m ago', meta: 'Active', icon: 'alert', sessionId: 'latency-spike-session' },
    { key: 'alert-2', title: 'Zero-result rate above 15%', subtitle: 'Warning · 30 min ago' },
    { key: 'alert-3', title: 'Index health degraded', subtitle: 'Warning · 1 hour ago' },
    { key: 'alert-4', title: 'Ingestion rate drop', subtitle: 'Warning · 3 hours ago' },
  ],
  more: [
    { key: 'other-1', title: 'Relevance tuning notebook', subtitle: 'Notebook · Updated 2 hours ago' },
    { key: 'other-2', title: 'Synonym dictionary management', subtitle: 'Notebook · Updated 1 day ago' },
    { key: 'other-3', title: 'Index migration runbook', subtitle: 'Notebook · Updated 3 days ago' },
  ],
};

/**
 * Saved objects data for the bottom section when a quick access item is selected.
 */
const SAVED_OBJECTS = {
  dashboards: {
    items: [
      { key: 'search-analytics', title: 'Search analytics', subtitle: 'Updated 5 min ago' },
      { key: 'relevance-tuning', title: 'Relevance tuning', subtitle: 'Updated 15 min ago' },
      { key: 'ingestion-monitor', title: 'Ingestion monitor', subtitle: 'Updated 30 min ago' },
      { key: 'query-performance', title: 'Query performance', subtitle: 'Created from thread · just now' },
    ],
  },
  logs: {
    tabs: [
      { id: 'saved-results', name: 'Saved results' },
      { id: 'saved-query', name: 'Saved query' },
    ],
    tabItems: {
      'saved-results': [
        { key: 'zero-results', title: 'Zero-result queries', subtitle: 'source=search_logs | where hits=0' },
        { key: 'slow-queries', title: 'Slow queries (>200ms)', subtitle: 'source=search_logs | where latency > 200' },
        { key: 'top-queries', title: 'Top queries by volume', subtitle: 'source=search_logs | stats count() by query' },
        { key: 'low-relevance', title: 'Queries with low relevance', subtitle: 'source=search_logs | where max_score < 0.5' },
        { key: 'failed-ingestion', title: 'Failed ingestion events', subtitle: 'source=ingest_logs | where status="ERROR"' },
      ],
      'saved-query': [
        { key: 'query-avg-latency', title: 'Avg latency by query type', subtitle: 'source=search_logs | stats avg(latency) by type' },
        { key: 'query-top-terms', title: 'Top search terms', subtitle: 'source=search_logs | stats count() as freq by query | sort -freq' },
        { key: 'query-click-through', title: 'Click-through rate', subtitle: 'source=search_logs | stats avg(clicked) by query' },
      ],
    },
  },
  metrics: {
    tabs: [
      { id: 'saved-results', name: 'Saved results' },
      { id: 'saved-query', name: 'Saved query' },
    ],
    tabItems: {
      'saved-results': [
        { key: 'query-throughput', title: 'Query throughput', subtitle: 'source=metrics | stats avg(qps)' },
        { key: 'index-size', title: 'Index size over time', subtitle: 'source=metrics | stats max(index_size_mb)' },
        { key: 'embedding-latency', title: 'Embedding generation latency', subtitle: 'source=metrics | stats avg(embed_ms)' },
      ],
      'saved-query': [
        { key: 'query-cache-hit', title: 'Cache hit rate', subtitle: 'source=metrics | stats avg(cache_hit_ratio)' },
        { key: 'query-shard-latency', title: 'Shard query latency', subtitle: 'source=metrics | stats p95(shard_query_ms)' },
        { key: 'query-indexing-rate', title: 'Indexing rate', subtitle: 'source=metrics | stats sum(docs_indexed) by minute' },
      ],
    },
  },
};

/**
 * SystemCallout — Displays a system alert with red left border and pink background.
 *
 * @param {Object} props
 * @param {import('./session_models').SystemAlert} props.alert
 * @param {(pageKey: string) => void} props.onAction
 */
const SystemCallout = ({ alert, onAction }) => {
  if (!alert) return null;

  return (
    <div className="emptySessionPage__callout" role="alert">
      <div className="emptySessionPage__calloutBorder" />
      <div className="emptySessionPage__calloutContent">
        <p className="emptySessionPage__calloutText">{alert.message}</p>
        <button
          type="button"
          className="emptySessionPage__calloutCta"
          onClick={() => onAction(alert.actionTarget)}>
          {alert.actionLabel}
        </button>
      </div>
    </div>
  );
};

/**
 * DualPurposeInput — Input field that accepts AI prompts or page search queries.
 *
 * @param {Object} props
 * @param {(prompt: string) => void} props.onStartThread
 * @param {(pageKey: string) => void} props.onOpenPage
 */
const DualPurposeInput = ({ onStartThread, onOpenPage, onSearchChange, onFocus, onBlur, onHoverStart, onHoverEnd, borderActive }) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const matchingPages = useMemo(() => {
    if (!inputValue.trim()) return [];
    const query = inputValue.toLowerCase();
    return Object.entries(SOURCE_PAGE_MOCK)
      .filter(([, { title }]) => title.toLowerCase().includes(query))
      .map(([key, { title }]) => ({ key, title }));
  }, [inputValue]);

  const handleChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSuggestions(value.trim().length > 0);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  const handleSubmit = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      const exactMatch = Object.entries(SOURCE_PAGE_MOCK).find(
        ([, { title }]) =>
          title.toLowerCase() === inputValue.trim().toLowerCase()
      );
      if (exactMatch) {
        onOpenPage(exactMatch[0]);
      } else {
        onStartThread(inputValue.trim());
      }
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  return (
    <div
      className={`emptySessionPage__inputWrap${borderActive ? ' emptySessionPage__inputWrap--borderActive' : ''}`}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}>
      <div className="emptySessionPage__inputField">
        <OuiCompressedTextArea
          placeholder="Ask AI anything, or type to search a page"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleSubmit}
          onFocus={onFocus}
          onBlur={onBlur}
          rows={3}
          resize="none"
          fullWidth
          autoFocus
          className="emptySessionPage__textarea"
        />
        <div className="emptySessionPage__inputActions">
          <OuiButtonIcon
            iconType="plus"
            aria-label="Add attachment"
            size="s"
            color="text"
          />
          <OuiButtonIcon
            iconType="sortUp"
            aria-label="Send"
            display="fill"
            size="s"
            isDisabled={!inputValue.trim()}
            onClick={() => {
              if (inputValue.trim()) {
                const exactMatch = Object.entries(SOURCE_PAGE_MOCK).find(
                  ([, { title }]) =>
                    title.toLowerCase() === inputValue.trim().toLowerCase()
                );
                if (exactMatch) {
                  onOpenPage(exactMatch[0]);
                } else {
                  onStartThread(inputValue.trim());
                }
                setInputValue('');
                setShowSuggestions(false);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * RecentAndFavoriteTabs — Tabbed section showing recent visits and favorites.
 *
 * @param {Object} props
 * @param {import('./session_models').RecentItem[]} props.recentItems
 * @param {import('./session_models').FavoriteItem[]} props.favoriteItems
 * @param {(pageKey: string) => void} props.onOpenPage
 */
const RecentAndFavoriteTabs = ({ recentItems, favoriteItems, onOpenPage }) => {
  const [activeTab, setActiveTab] = useState('recent');

  const items = activeTab === 'recent' ? recentItems : favoriteItems;

  const handleItemClick = (item) => {
    if (item.pageKey) {
      onOpenPage(item.pageKey);
    }
  };

  return (
    <div className="emptySessionPage__tabs">
      <OuiTabs size="s" display="condensed" style={{ maxWidth: 'fit-content' }}>
        <OuiTab
          isSelected={activeTab === 'recent'}
          onClick={() => setActiveTab('recent')}>
          Recent
        </OuiTab>
        <OuiTab
          isSelected={activeTab === 'favorites'}
          onClick={() => setActiveTab('favorites')}>
          Favorite
        </OuiTab>
      </OuiTabs>
      <div className="emptySessionPage__tabContent" role="tabpanel">
        {items.length === 0 ? (
          <>
            <div className="emptySessionPage__placeholderRow" />
            <div className="emptySessionPage__placeholderRow" />
            <div className="emptySessionPage__placeholderRow" />
            <div className="emptySessionPage__placeholderRow" />
            <div className="emptySessionPage__placeholderRow" />
          </>
        ) : (
          <ul className="emptySessionPage__itemList">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  className="emptySessionPage__listItem"
                  onClick={() => handleItemClick(item)}>
                  <OuiIcon
                    type={item.type === 'page' ? 'document' : 'apps'}
                    size="s"
                  />
                  <span className="emptySessionPage__listItemTitle">
                    {item.title}
                  </span>
                  {activeTab === 'recent' && item.visitedAt && (
                    <span className="emptySessionPage__listItemTime">
                      {formatRelativeTime(item.visitedAt)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

/**
 * BottomSection — Shows saved objects list when a browse key is active,
 * otherwise shows Recent/Favorite tabs.
 */
const BottomSection = ({ browseKey, recentItems, favoriteItems, onOpenPage }) => {
  const [subTab, setSubTab] = useState(null);

  // Reset sub-tab when browse key changes
  React.useEffect(() => {
    if (browseKey && SAVED_OBJECTS[browseKey]?.tabs) {
      setSubTab(SAVED_OBJECTS[browseKey].tabs[0].id);
    } else {
      setSubTab(null);
    }
  }, [browseKey]);

  if (!browseKey || !SAVED_OBJECTS[browseKey]) {
    return (
      <RecentAndFavoriteTabs
        recentItems={recentItems}
        favoriteItems={favoriteItems}
        onOpenPage={onOpenPage}
      />
    );
  }

  const data = SAVED_OBJECTS[browseKey];

  // Simple list (dashboards)
  if (data.items && !data.tabs) {
    return (
      <div className="emptySessionPage__tabs">
        <div className="emptySessionPage__sectionTitle">Dashboards</div>
        <div className="emptySessionPage__tabContent">
          {data.items.map((item) => (
            <button
              key={item.key}
              className="emptySessionPage__listItem"
              onClick={() => onOpenPage(browseKey)}>
              <span className="emptySessionPage__listItemTitle">{item.title}</span>
              <span className="emptySessionPage__listItemTime">{item.subtitle}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Tabbed list (logs, metrics)
  const activeSubTab = subTab || (data.tabs ? data.tabs[0].id : null);
  const tabItems = data.tabItems[activeSubTab] || [];

  return (
    <div className="emptySessionPage__tabs">
      <OuiTabs size="s" display="condensed" style={{ maxWidth: 'fit-content' }}>
        {data.tabs.map((tab) => (
          <OuiTab
            key={tab.id}
            isSelected={activeSubTab === tab.id}
            onClick={() => setSubTab(tab.id)}>
            {tab.name}
          </OuiTab>
        ))}
      </OuiTabs>
      <div className="emptySessionPage__tabContent">
        {tabItems.map((item) => (
          <button
            key={item.key}
            className="emptySessionPage__listItem"
            onClick={() => onOpenPage(browseKey)}>
            <span className="emptySessionPage__listItemTitle">{item.title}</span>
            <span className="emptySessionPage__listItemTime">{item.subtitle}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/**
 * Format a timestamp as relative time (e.g., "2 hours ago").
 * @param {number} timestamp
 * @returns {string}
 */
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * EmptySessionPage — The welcome experience shown when a session has no thread and no pages open.
 *
 * Displays a centered panel with:
 * - Welcome title
 * - System callout (when alerts are present)
 * - Dual-purpose input (AI prompt or page search)
 * - Quick access row with shortcut buttons
 * - Recent visit / Favorite tabs
 *
 * @param {Object} props
 * @param {(prompt: string) => void} props.onStartThread - Callback to start a new AI thread
 * @param {(pageKey: string) => void} props.onOpenPage - Callback to open a page as a tab
 * @param {import('./session_models').RecentItem[]} props.recentItems - Recently visited items
 * @param {import('./session_models').FavoriteItem[]} props.favoriteItems - Favorited items
 * @param {import('./session_models').SystemAlert|null} props.systemAlert - Active system alert
 */
export const EmptySessionPage = ({
  onStartThread,
  onOpenPage,
  onViewSession,
  onStartInvestigation,
  onSelectSession,
  sessions = [],
  recentItems = [],
  favoriteItems = [],
  systemAlert = null,
}) => {
  const [activeChip, setActiveChip] = useState('activity');
  const [searchQuery, setSearchQuery] = useState('');
  const [dismissedItems, setDismissedItems] = useState(new Set());
  const [dismissingItems, setDismissingItems] = useState(new Set());
  const [inputHovered, setInputHovered] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const inputActive = inputHovered || inputFocused;
  const [hoveredCard, setHoveredCard] = useState(null);

  // Build a flat searchable list from all chip data + SOURCE_PAGE_MOCK
  const allSearchableItems = useMemo(() => {
    const items = [];
    // Add all chip data items
    Object.entries(CHIP_DATA).forEach(([category, categoryItems]) => {
      categoryItems.forEach((item) => {
        items.push({ ...item, category, pageKey: category === 'discover' ? 'logs' : category === 'monitor' ? 'alerts' : category === 'recent' ? 'dashboards' : category === 'favorite' ? 'dashboards' : 'notebooks' });
      });
    });
    // Add SOURCE_PAGE_MOCK pages
    Object.entries(SOURCE_PAGE_MOCK).forEach(([pageKey, { title }]) => {
      items.push({ key: `page-${pageKey}`, title, subtitle: 'Page', category: 'pages', pageKey });
    });
    return items;
  }, []);

  // Filter items based on search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    return allSearchableItems.filter(
      (item) => item.title.toLowerCase().includes(query) || (item.subtitle && item.subtitle.toLowerCase().includes(query))
    );
  }, [searchQuery, allSearchableItems]);

  return (
    <div className="emptySessionPage">
      <div className="emptySessionPage__panel">
        {/* Two-column layout */}
        <div className="emptySessionPage__twoCol">
          {/* Left column — AI-generated reading paragraph with inline widgets */}
          <div className="emptySessionPage__leftCol">
            {/* Mascot */}
            <div className="emptySessionPage__avatarWrap">
              <Mascot size={52} idle bob={false} follow={false} />
            </div>

            {/* Paragraph briefing */}
            <div className="emptySessionPage__briefing">
              <OuiTitle size="m">
                <h1>Good morning, John</h1>
              </OuiTitle>

              <OuiText size="s">
                <p>Your search index <strong>product-search</strong> is healthy with 100 documents indexed. I found 2 items worth your attention:</p>
                <p>Relevancy for <strong>&ldquo;wireless headphones&rdquo;</strong> dropped sharply — nDCG@10 is down <strong>18%</strong> versus the 7-day baseline. I investigated and traced it to a reindex that dropped the custom analyzer on the <strong>features</strong> field. I have a two-phase fix ready.</p>
              </OuiText>

              {/* Card widget 1 */}
              <button
                type="button"
                className={`emptySessionPage__activityRow${dismissingItems.has('insight-1') ? ' emptySessionPage__activityRow--dismissing' : ''}`}
                onClick={() => onSelectSession(CHIP_DATA.activity[0].sessionId)}
                onMouseEnter={() => setHoveredCard('latency')}
                onMouseLeave={() => setHoveredCard(null)}>
                <span className="emptySessionPage__activityRowTitle">{CHIP_DATA.activity[0].title}</span>
                <span className="emptySessionPage__activityRowSubtitle">{CHIP_DATA.activity[0].subtitle}</span>
              </button>

              <OuiText size="s" style={{ marginTop: 16 }}>
                <p>I also noticed your <strong>description</strong> field could benefit from a synonym analyzer. About 12% of queries match on title but miss relevant results in descriptions. Adding synonyms could improve recall significantly.</p>
              </OuiText>

              {/* Card widget 2 */}
              <button
                type="button"
                className={`emptySessionPage__activityRow${dismissingItems.has('insight-2') ? ' emptySessionPage__activityRow--dismissing' : ''}`}
                onClick={() => onSelectSession(CHIP_DATA.activity[1].sessionId)}
                onMouseEnter={() => setHoveredCard('error-rate')}
                onMouseLeave={() => setHoveredCard(null)}>
                <span className="emptySessionPage__activityRowTitle">{CHIP_DATA.activity[1].title}</span>
                <span className="emptySessionPage__activityRowSubtitle">{CHIP_DATA.activity[1].subtitle}</span>
              </button>

              <OuiText size="s" style={{ marginTop: 16 }}>
                <p>That's everything for now. Try a search query below or ask me anything about your index.</p>
              </OuiText>
            </div>
          </div>

          {/* Right column — 2x3 grid of cards */}
          <div className="emptySessionPage__rightCol">
            <div className={`emptySessionPage__rightGrid${hoveredCard ? ` emptySessionPage__rightGrid--highlight-${hoveredCard}` : ''}`}>
              {/* Card 1: Top queries by volume */}
              <div className="emptySessionPage__favoritePanel" data-card="services">
                <div className="emptySessionPage__favoritePanelTitle">Top queries by volume</div>
                <div className="emptySessionPage__favoritePanelTable">
                  <div className="emptySessionPage__favoritePanelHeader">
                    <span>Query</span><span>Hits</span>
                  </div>
                  <div className="emptySessionPage__favoritePanelRow">
                    <span className="emptySessionPage__favoritePanelLink--static">wireless headphones</span>
                    <div className="emptySessionPage__favoritePanelBar"><div className="emptySessionPage__favoritePanelBarTrack"><div className="emptySessionPage__favoritePanelBarFill" style={{ width: '84%' }} /></div><span>42</span></div>
                  </div>
                  <div className="emptySessionPage__favoritePanelRow">
                    <span className="emptySessionPage__favoritePanelLink--static">noise cancelling headphones</span>
                    <div className="emptySessionPage__favoritePanelBar"><div className="emptySessionPage__favoritePanelBarTrack"><div className="emptySessionPage__favoritePanelBarFill" style={{ width: '56%' }} /></div><span>28</span></div>
                  </div>
                  <div className="emptySessionPage__favoritePanelRow">
                    <span className="emptySessionPage__favoritePanelLink--static">bluetooth earbuds</span>
                    <div className="emptySessionPage__favoritePanelBar"><div className="emptySessionPage__favoritePanelBarTrack"><div className="emptySessionPage__favoritePanelBarFill" style={{ width: '30%' }} /></div><span>15</span></div>
                  </div>
                </div>
              </div>

              {/* Card 2: nDCG@10 trend (line chart) */}
              <div className="emptySessionPage__favoritePanel">
                <div className="emptySessionPage__favoritePanelTitle">nDCG@10 — wireless headphones</div>
                <div style={{ height: 120 }}>
                  <Chart>
                    <Settings showLegend={false} />
                    <Axis id="bottom" position="bottom" tickFormat={(d) => `${d}m`} />
                    <Axis id="left" position="left" tickFormat={(d) => d.toFixed(2)} />
                    <LineSeries
                      id="ndcg"
                      xScaleType={ScaleType.Linear}
                      yScaleType={ScaleType.Linear}
                      xAccessor="x"
                      yAccessors={['y']}
                      data={[
                        { x: 0, y: 0.78 },
                        { x: 10, y: 0.78 },
                        { x: 20, y: 0.77 },
                        { x: 30, y: 0.7 },
                        { x: 40, y: 0.66 },
                        { x: 50, y: 0.64 },
                        { x: 60, y: 0.64 },
                      ]}
                    />
                  </Chart>
                </div>
              </div>

              {/* Card 3: Index health */}
              <div className="emptySessionPage__favoritePanel" data-card="alerts">
                <div className="emptySessionPage__favoritePanelTitle">Index health</div>
                <div className="emptySessionPage__favoritePanelTable">
                  <div className="emptySessionPage__favoritePanelHeader">
                    <span>Index</span><span>Status</span>
                  </div>
                  <div className="emptySessionPage__favoritePanelRow">
                    <span className="emptySessionPage__favoritePanelLink--static">product-search</span>
                    <span style={{ color: '#5CB198', fontSize: '11px', fontWeight: 600 }}>Green · 100 docs</span>
                  </div>
                  <div className="emptySessionPage__favoritePanelRow">
                    <span className="emptySessionPage__favoritePanelLink--static">product-search_embedding</span>
                    <span style={{ color: '#5CB198', fontSize: '11px', fontWeight: 600 }}>Green · 100 docs</span>
                  </div>
                </div>
              </div>

              {/* Card 4: Relevance score distribution (bar chart) */}
              <div className="emptySessionPage__favoritePanel">
                <div className="emptySessionPage__favoritePanelTitle">Relevance distribution — wireless headphones</div>
                <div style={{ height: 120 }}>
                  <Chart>
                    <Settings showLegend={false} />
                    <Axis id="bottom" position="bottom" tickFormat={(d) => d.toFixed(1)} />
                    <Axis id="left" position="left" hide />
                    <BarSeries
                      id="scores"
                      xScaleType={ScaleType.Linear}
                      yScaleType={ScaleType.Linear}
                      xAccessor="x"
                      yAccessors={['y']}
                      data={[
                        { x: 0.1, y: 6 },
                        { x: 0.2, y: 9 },
                        { x: 0.3, y: 16 },
                        { x: 0.4, y: 22 },
                        { x: 0.5, y: 18 },
                        { x: 0.6, y: 12 },
                        { x: 0.7, y: 8 },
                        { x: 0.8, y: 5 },
                        { x: 0.9, y: 3 },
                        { x: 1.0, y: 1 },
                      ]}
                    />
                  </Chart>
                </div>
              </div>

              {/* Card 5: Zero-result queries (saved query card) */}
              <button type="button" className="emptySessionPage__savedQueryCard" data-card="timeout" onClick={() => onOpenPage('discover-log')}>
                <div className="emptySessionPage__favoritePanelTitle">Zero-result queries</div>
                <code className="emptySessionPage__savedQueryCode">source=search_logs | where hits=0</code>
                <div className="emptySessionPage__savedQueryBody">
                  <div className="emptySessionPage__savedQueryChart">
                    <svg viewBox="0 0 120 48" preserveAspectRatio="none" className="emptySessionPage__savedQuerySvg">
                      <path d="M0,40 L15,38 L30,35 L45,32 L60,28 L75,30 L90,26 L105,24 L120,22" fill="none" stroke="currentColor" strokeWidth="2" />
                      <path d="M0,40 L15,38 L30,35 L45,32 L60,28 L75,30 L90,26 L105,24 L120,22 L120,48 L0,48 Z" fill="currentColor" opacity="0.1" />
                    </svg>
                  </div>
                  <div className="emptySessionPage__savedQueryRight">
                    <span className="emptySessionPage__savedQueryValue">3</span>
                    <span className="emptySessionPage__savedQueryTrend">of 50 queries</span>
                  </div>
                </div>
              </button>

              {/* Card 6: Open a page — chips are individually clickable */}
              <div className="emptySessionPage__favoritePanel emptySessionPage__favoritePanel--openPage">
                <div className="emptySessionPage__favoritePanelTitle">Open another page</div>
                <div className="emptySessionPage__openPageChips">
                  <button
                    type="button"
                    className="emptySessionPage__openPageChip"
                    onClick={() => onOpenPage('query-set-comparison', 'Query Analysis')}>
                    Query Analysis
                  </button>
                  <button
                    type="button"
                    className="emptySessionPage__openPageChip"
                    onClick={() => onOpenPage('query-set-comparison', 'Query Set Comparison')}>
                    Query Set Comparison
                  </button>
                  <button
                    type="button"
                    className="emptySessionPage__openPageChip"
                    onClick={() => onOpenPage('query-set-comparison', 'Search Evaluation')}>
                    Search Evaluation
                  </button>
                  <button
                    type="button"
                    className="emptySessionPage__openPageChip"
                    onClick={() => onOpenPage('query-set-comparison', 'Hybrid Optimizer')}>
                    Hybrid Optimizer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Textarea — full width below columns */}
        <div className="emptySessionPage__bottomInput">
          <DualPurposeInput
            onStartThread={onStartThread}
            onOpenPage={onOpenPage}
            onSearchChange={setSearchQuery}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onHoverStart={() => setInputHovered(true)}
            onHoverEnd={() => setInputHovered(false)}
            borderActive={inputActive}
          />
        </div>
      </div>
    </div>
  );
};
