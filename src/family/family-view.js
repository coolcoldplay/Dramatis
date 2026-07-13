(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.DramatisFamilyView = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root) {
  'use strict';

  function createFamilyViewState(options) {
    var input = options || {};
    return {
      selectedNodeId: null,
      selectedRelationId: null,
      searchQuery: '',
      searchFuzzy: false,
      focusNodeId: null,
      focusDepth: 1,
      filters: {
        kind: ['union', 'parentage', 'kinship', 'succession', 'other'],
        certainty: ['confirmed', 'probable', 'rumored', 'disputed', 'unknown'],
        showHidden: false,
        followEpisode: true,
      },
      layoutMode: input.layoutMode === 'house' ? 'house' : 'lineage',
      houseTagCategoryId: input.houseTagCategoryId || null,
      generationGap: Number(input.generationGap) || 150,
      branchGap: Number(input.branchGap) || 48,
      componentGap: Number(input.componentGap) || 120,
      collapsedNodeIds: Array.isArray(input.collapsedNodeIds) ? input.collapsedNodeIds.slice() : [],
      layoutRevision: 0,
    };
  }

  function reduceFamilyView(state, action) {
    var current = state || createFamilyViewState();
    var event = action || {};
    var next;
    if (event.type === 'SELECT_NODE') {
      return Object.assign({}, current, { selectedNodeId: event.nodeId || null, selectedRelationId: null });
    }
    if (event.type === 'SELECT_RELATION') {
      return Object.assign({}, current, { selectedNodeId: null, selectedRelationId: event.relationId || null });
    }
    if (event.type === 'CLEAR_SELECTION') {
      return Object.assign({}, current, { selectedNodeId: null, selectedRelationId: null });
    }
    if (event.type === 'SET_SEARCH') {
      return Object.assign({}, current, { searchQuery: String(event.query || ''), searchFuzzy: event.fuzzy === true });
    }
    if (event.type === 'SET_FILTER') {
      next = Object.assign({}, current.filters);
      next[event.key] = Array.isArray(event.value) ? event.value.slice() : event.value;
      return Object.assign({}, current, { filters: next, layoutRevision: current.layoutRevision + 1 });
    }
    if (event.type === 'SET_SPACING') {
      if (['generationGap', 'branchGap', 'componentGap'].indexOf(event.key) === -1) return current;
      next = {};
      next[event.key] = Number(event.value);
      next.layoutRevision = current.layoutRevision + 1;
      return Object.assign({}, current, next);
    }
    if (event.type === 'SET_LAYOUT_MODE') {
      return Object.assign({}, current, {
        layoutMode: event.mode === 'house' ? 'house' : 'lineage',
        layoutRevision: current.layoutRevision + 1,
      });
    }
    if (event.type === 'SET_HOUSE_CATEGORY') {
      return Object.assign({}, current, {
        houseTagCategoryId: event.categoryId || null,
        layoutRevision: current.layoutRevision + 1,
      });
    }
    if (event.type === 'SET_FOCUS') {
      return Object.assign({}, current, {
        focusNodeId: event.nodeId || null,
        focusDepth: Math.max(1, Math.min(5, Number(event.depth) || 1)),
        layoutRevision: current.layoutRevision + 1,
      });
    }
    if (event.type === 'CLEAR_FOCUS') {
      return Object.assign({}, current, { focusNodeId: null, layoutRevision: current.layoutRevision + 1 });
    }
    if (event.type === 'TOGGLE_COLLAPSE') {
      var collapsed = new Set(current.collapsedNodeIds);
      if (collapsed.has(event.nodeId)) collapsed.delete(event.nodeId);
      else collapsed.add(event.nodeId);
      return Object.assign({}, current, {
        collapsedNodeIds: Array.from(collapsed),
        layoutRevision: current.layoutRevision + 1,
      });
    }
    return current;
  }

  function exactFamilySearch(index, query) {
    return index && index.searchExact ? index.searchExact(query) : [];
  }

  function fuzzyFamilySearch(index, query) {
    return index && index.searchFuzzy ? index.searchFuzzy(query) : [];
  }

  function createLayoutRequestGate() {
    var revision = 0;
    return {
      begin: function() { revision += 1; return revision; },
      isCurrent: function(token) { return token === revision; },
      cancel: function() { revision += 1; },
    };
  }

  function createFamilyView(options) {
    var opts = options || {};
    var appState = opts.state;
    var doc = opts.document || (root && root.document);
    var d3 = opts.d3 || (root && root.d3);
    var schema = opts.schema || (root && root.DramatisFamilySchema);
    var indexModule = opts.indexModule || (root && root.DramatisFamilyIndex);
    var validator = opts.validator || (root && root.DramatisFamilyValidator);
    var layoutModule = opts.layoutModule || (root && root.DramatisFamilyLayout);
    var rendererModule = opts.rendererModule || (root && root.DramatisFamilyRenderer);
    if (!appState || !doc || !d3 || !schema || !indexModule || !validator || !layoutModule || !rendererModule) {
      throw new Error('Family view dependencies are incomplete');
    }

    var overlay = doc.getElementById('family-tree-overlay');
    var svg = doc.getElementById('family-tree-svg');
    var elements = {
      summary: doc.getElementById('family-summary'),
      search: doc.getElementById('family-search-input'),
      fuzzy: doc.getElementById('family-search-fuzzy'),
      filters: doc.getElementById('family-filters'),
      inspector: doc.getElementById('family-inspector'),
      inspectorTitle: doc.getElementById('family-inspector-title'),
      inspectorContent: doc.getElementById('family-inspector-content'),
      diagnostics: doc.getElementById('family-diagnostics'),
      diagnosticList: doc.getElementById('family-diagnostic-list'),
      diagnosticCount: doc.getElementById('family-diagnostic-count'),
      help: doc.getElementById('family-help-panel'),
      loading: doc.getElementById('family-loading'),
      empty: doc.getElementById('family-empty'),
      houseCategory: doc.getElementById('family-house-category'),
      generationGap: doc.getElementById('family-generation-gap'),
      branchGap: doc.getElementById('family-branch-gap'),
      componentGap: doc.getElementById('family-component-gap'),
    };
    var runtime = createFamilyViewState(schema.normalizeFamilyView(appState.familyView));
    var requestGate = createLayoutRequestGate();
    var layoutEngine = null;
    var renderer;
    var index = null;
    var diagnostics = [];
    var model = null;
    var currentLayout = null;
    var allRelations = [];
    var previousFocus = null;
    var isOpen = false;
    var firstLayout = true;
    var sliderTimer = null;
    var searchResultCursor = -1;
    var listeners = [];

    function listen(target, type, handler, options) {
      if (!target) return;
      target.addEventListener(type, handler, options);
      listeners.push(function() { target.removeEventListener(type, handler, options); });
    }

    function tagsByNode() {
      var tagNames = new Map();
      (appState.tagCategories || []).forEach(function(category) {
        (category.tags || []).forEach(function(tag) { tagNames.set(String(tag.id), String(tag.name || tag.id)); });
      });
      var result = new Map();
      (appState.nodes || []).forEach(function(node) {
        var values = [];
        Object.keys(node.tags || {}).forEach(function(categoryId) {
          var raw = node.tags[categoryId];
          (Array.isArray(raw) ? raw : [raw]).forEach(function(tagId) {
            if (tagNames.has(String(tagId))) values.push(tagNames.get(String(tagId)));
          });
        });
        result.set(String(node.id), values);
      });
      return result;
    }

    function houseColorByNode() {
      var result = new Map();
      var categoryId = runtime.houseTagCategoryId;
      var category = (appState.tagCategories || []).find(function(item) { return String(item.id) === String(categoryId); });
      if (!category) return result;
      var colors = new Map((category.tags || []).map(function(tag) { return [String(tag.id), tag.color || '#d5a666']; }));
      (appState.nodes || []).forEach(function(node) {
        var tagId = node.tags && node.tags[categoryId];
        if (Array.isArray(tagId)) tagId = tagId[0];
        if (tagId != null && colors.has(String(tagId))) result.set(String(node.id), colors.get(String(tagId)));
      });
      return result;
    }

    function populateHouseCategories() {
      if (!elements.houseCategory) return;
      while (elements.houseCategory.options.length > 1) elements.houseCategory.remove(1);
      (appState.tagCategories || []).forEach(function(category) {
        var option = doc.createElement('option');
        option.value = category.id;
        option.textContent = category.name || category.id;
        elements.houseCategory.appendChild(option);
      });
      elements.houseCategory.value = runtime.houseTagCategoryId || '';
    }

    function relationVisibleAtEpisode(relation) {
      if (!runtime.filters.followEpisode || !appState.currentEpisode) return true;
      if (appState.currentEpisode.season === 0 && appState.currentEpisode.episode === 0) return false;
      if (!relation.episodes || !relation.episodes.length) return true;
      var timeline = opts.episodeTimeline || (root && root.DramatisEpisodeTimeline);
      if (!timeline || !timeline.episodeIndexInList) return true;
      var currentIndex = timeline.episodeIndexInList(appState.currentEpisode, appState.episodeList || []);
      if (currentIndex < 0) return true;
      var first = Infinity;
      relation.episodes.forEach(function(episode) {
        var episodeIndex = timeline.episodeIndexInList(episode, appState.episodeList || []);
        if (episodeIndex >= 0) first = Math.min(first, episodeIndex);
      });
      return !Number.isFinite(first) || first <= currentIndex;
    }

    function buildData() {
      var normalized = schema.normalizeFamilyGraph({
        familyRelations: appState.familyRelations,
        familyView: appState.familyView,
        links: appState.links,
      });
      allRelations = normalized.familyRelations;
      if ((!appState.familyRelations || !appState.familyRelations.length) && normalized.migratedLegacy) {
        appState.familyRelations = allRelations;
      }
      index = indexModule.buildFamilyIndex(appState.nodes, allRelations, { tagsByNode: tagsByNode() });
      diagnostics = validator.validateFamilyGraph(appState.nodes, allRelations);
      appState.familyDiagnostics = diagnostics;
      renderDiagnostics();
    }

    function collapsedHiddenIds() {
      var hidden = new Set();
      runtime.collapsedNodeIds.forEach(function(nodeId) {
        if (!index) return;
        index.descendantsOf(nodeId).forEach(function(id) { hidden.add(id); });
      });
      return hidden;
    }

    function filteredRelations() {
      var kinds = new Set(runtime.filters.kind);
      var certainty = new Set(runtime.filters.certainty);
      var collapsedHidden = collapsedHiddenIds();
      var focusIds = runtime.focusNodeId && index ? index.neighborhoodOf(runtime.focusNodeId, runtime.focusDepth) : null;
      return allRelations.filter(function(relation) {
        if (!kinds.has(relation.kind) || !certainty.has(relation.certainty || 'unknown')) return false;
        if (!runtime.filters.showHidden && relation.hidden) return false;
        if (!relationVisibleAtEpisode(relation)) return false;
        var participantIds = (relation.participants || []).map(function(item) { return String(item.nodeId || ''); }).filter(Boolean);
        if (participantIds.some(function(id) { return collapsedHidden.has(id); })) return false;
        if (focusIds && participantIds.some(function(id) { return !focusIds.has(id); })) return false;
        if (!runtime.filters.showHidden && participantIds.some(function(id) {
          var node = index.nodeById.get(id);
          return !node || node.hidden === true;
        })) return false;
        if (runtime.filters.followEpisode && opts.isNodeVisible && participantIds.some(function(id) {
          var node = index.nodeById.get(id);
          return node && !opts.isNodeVisible(node);
        })) return false;
        return true;
      });
    }

    function layoutOptions() {
      return {
        layoutMode: runtime.layoutMode,
        houseTagCategoryId: runtime.houseTagCategoryId,
        generationGap: runtime.generationGap,
        branchGap: runtime.branchGap,
        componentGap: runtime.componentGap,
        collapsedNodeIds: runtime.collapsedNodeIds,
      };
    }

    function setLoading(value) {
      elements.loading.hidden = !value;
    }

    async function relayout(reason) {
      if (!isOpen) return null;
      var token = requestGate.begin();
      setLoading(true);
      buildData();
      var visibleRelations = filteredRelations();
      var visibleIndex = indexModule.buildFamilyIndex(appState.nodes, visibleRelations, { tagsByNode: tagsByNode() });
      model = layoutModule.buildFamilyRenderModel(appState.nodes, visibleRelations, visibleIndex, diagnostics, layoutOptions());
      if (!model.personNodes.length) {
        setLoading(false);
        elements.empty.hidden = false;
        elements.summary.textContent = '0 人物 · 0 关系';
        return null;
      }
      elements.empty.hidden = true;
      try {
        if (!layoutEngine) layoutEngine = layoutModule.createLayoutEngine({ workerUrl: 'src/family/family-layout-worker.js' });
        var result = await layoutEngine.layout(model, layoutOptions());
        if (!requestGate.isCurrent(token) || !isOpen) return null;
        currentLayout = result;
        renderer.render(result, {
          model: model,
          houseColorByNode: houseColorByNode(),
          foldCounts: foldCounts(),
        });
        updateHighlight();
        elements.summary.textContent = model.personNodes.length + ' 人物 · ' + visibleRelations.length + ' 关系 · ' + (result.mode === 'elk' ? 'ELK' : '兼容布局');
        if (firstLayout || ['open', 'focus', 'mode', 'filter', 'spacing', 'house', 'collapse', 'refresh'].indexOf(reason) !== -1) {
          renderer.fitView({ animate: !firstLayout, padding: 56 });
        }
        firstLayout = false;
        return result;
      } catch (error) {
        if (!error || error.code !== 'LAYOUT_CANCELLED') {
          elements.empty.hidden = false;
          elements.empty.querySelector('strong').textContent = '谱系布局失败';
          elements.empty.querySelector('span').textContent = error && error.message ? error.message : '未知错误';
        }
        return null;
      } finally {
        if (requestGate.isCurrent(token)) setLoading(false);
      }
    }

    function foldCounts() {
      var result = new Map();
      if (!index) return result;
      runtime.collapsedNodeIds.forEach(function(id) { result.set(id, index.descendantsOf(id).size); });
      return result;
    }

    function visibleModelIds() {
      return new Set(model ? model.personNodes.map(function(person) { return person.id; }) : []);
    }

    function search(query, fuzzy) {
      runtime = reduceFamilyView(runtime, { type: 'SET_SEARCH', query: query, fuzzy: fuzzy });
      updateHighlight();
      return index ? (fuzzy ? fuzzyFamilySearch(index, query) : exactFamilySearch(index, query)) : [];
    }

    function updateHighlight() {
      if (!renderer || !index) return;
      var highlightedNodeIds = new Set();
      var highlightedEdgeIds = new Set();
      var searchNodeIds = new Set();
      var relationIds = new Set();
      if (runtime.selectedNodeId) {
        index.neighborhoodOf(runtime.selectedNodeId, 1).forEach(function(id) { highlightedNodeIds.add(id); });
        (index.relationsByNode.get(runtime.selectedNodeId) || []).forEach(function(id) { relationIds.add(id); });
      }
      if (runtime.selectedRelationId) {
        relationIds.add(runtime.selectedRelationId);
        var relation = index.relationById.get(runtime.selectedRelationId);
        (relation && relation.participants || []).forEach(function(item) { highlightedNodeIds.add(String(item.nodeId)); });
      }
      (model && model.edges || []).forEach(function(edge) {
        if (relationIds.has(edge.relationId)) highlightedEdgeIds.add(edge.id);
      });
      var visibleIds = visibleModelIds();
      var matches = runtime.searchFuzzy
        ? fuzzyFamilySearch(index, runtime.searchQuery)
        : exactFamilySearch(index, runtime.searchQuery);
      matches.forEach(function(node) {
        if (visibleIds.has(String(node.id))) searchNodeIds.add(String(node.id));
      });
      renderer.updateHighlight({
        selectedNodeId: runtime.selectedNodeId,
        selectedRelationId: runtime.selectedRelationId,
        highlightedNodeIds: highlightedNodeIds,
        highlightedEdgeIds: highlightedEdgeIds,
        searchNodeIds: searchNodeIds,
        dimOthers: true,
      });
    }

    function clearElement(element) {
      while (element && element.firstChild) element.removeChild(element.firstChild);
    }

    function appendInspectorSection(label, values, onClick) {
      if (!values || !values.length) return;
      var section = doc.createElement('section');
      section.className = 'family-inspector-section';
      var title = doc.createElement('div');
      title.className = 'family-inspector-label';
      title.textContent = label;
      section.appendChild(title);
      var list = doc.createElement('div');
      list.className = 'family-inspector-list';
      values.forEach(function(value) {
        var button = doc.createElement(onClick ? 'button' : 'span');
        button.className = 'family-chip';
        button.textContent = value.label;
        if (onClick) {
          button.type = 'button';
          button.addEventListener('click', function() { onClick(value.id); });
        }
        list.appendChild(button);
      });
      section.appendChild(list);
      elements.inspectorContent.appendChild(section);
    }

    function showNodeInspector(nodeId) {
      var node = index && index.nodeById.get(String(nodeId));
      if (!node) return;
      elements.inspector.hidden = false;
      elements.inspector.classList.add('is-open');
      elements.inspectorTitle.textContent = node.name || node.id;
      clearElement(elements.inspectorContent);
      var notes = doc.createElement('div');
      notes.textContent = node.notes || '暂无人物备注';
      elements.inspectorContent.appendChild(notes);
      function nodeValues(ids) {
        return Array.from(ids || []).map(function(id) {
          var target = index.nodeById.get(id);
          return { id: id, label: target ? target.name || id : id };
        });
      }
      appendInspectorSection('父母', nodeValues(index.parentsByChild.get(nodeId)), selectNode);
      appendInspectorSection('子女', nodeValues(index.childrenByParent.get(nodeId)), selectNode);
      var relationValues = Array.from(index.relationsByNode.get(nodeId) || []).map(function(id) {
        var relation = index.relationById.get(id);
        return { id: id, label: relation.label || relation.subtype || relation.kind };
      });
      appendInspectorSection('家系关系', relationValues, selectRelation);
    }

    function showRelationInspector(relationId) {
      var relation = index && index.relationById.get(String(relationId));
      if (!relation) return;
      elements.inspector.hidden = false;
      elements.inspector.classList.add('is-open');
      elements.inspectorTitle.textContent = relation.label || relation.subtype || relation.kind;
      clearElement(elements.inspectorContent);
      var meta = doc.createElement('div');
      meta.textContent = [relation.kind, relation.subtype, relation.status, relation.certainty].filter(Boolean).join(' · ');
      elements.inspectorContent.appendChild(meta);
      if (relation.notes) {
        var notes = doc.createElement('div');
        notes.textContent = relation.notes;
        elements.inspectorContent.appendChild(notes);
      }
      appendInspectorSection('参与者', (relation.participants || []).map(function(item) {
        var node = index.nodeById.get(String(item.nodeId));
        return { id: String(item.nodeId), label: (node ? node.name : item.nodeId) + ' · ' + item.role };
      }), selectNode);
      var edit = doc.createElement('button');
      edit.type = 'button';
      edit.className = 'family-secondary-btn';
      edit.textContent = '编辑关系';
      edit.addEventListener('click', function() {
        if (opts.onEditRelation) opts.onEditRelation(relationId);
      });
      elements.inspectorContent.appendChild(edit);
    }

    function closeInspector() {
      elements.inspector.hidden = true;
      elements.inspector.classList.remove('is-open');
    }

    function selectNode(nodeId) {
      runtime = reduceFamilyView(runtime, { type: 'SELECT_NODE', nodeId: nodeId });
      updateHighlight();
      showNodeInspector(String(nodeId));
    }

    function selectRelation(relationId) {
      runtime = reduceFamilyView(runtime, { type: 'SELECT_RELATION', relationId: relationId });
      updateHighlight();
      showRelationInspector(String(relationId));
    }

    function clearSelection() {
      runtime = reduceFamilyView(runtime, { type: 'CLEAR_SELECTION' });
      updateHighlight();
      closeInspector();
    }

    function focusNode(nodeId, depth) {
      var target = nodeId || runtime.selectedNodeId;
      if (!target) return;
      runtime = reduceFamilyView(runtime, { type: 'SET_FOCUS', nodeId: target, depth: depth || runtime.focusDepth });
      relayout('focus');
    }

    function clearFocus() {
      if (!runtime.focusNodeId) return;
      runtime = reduceFamilyView(runtime, { type: 'CLEAR_FOCUS' });
      relayout('focus');
    }

    function toggleCollapse(nodeId) {
      runtime = reduceFamilyView(runtime, { type: 'TOGGLE_COLLAPSE', nodeId: nodeId });
      persistView();
      relayout('collapse');
    }

    function persistView() {
      appState.familyView = schema.normalizeFamilyView({
        layoutMode: runtime.layoutMode,
        houseTagCategoryId: runtime.houseTagCategoryId,
        generationGap: runtime.generationGap,
        branchGap: runtime.branchGap,
        componentGap: runtime.componentGap,
        collapsedNodeIds: runtime.collapsedNodeIds,
      });
    }

    function renderDiagnostics() {
      clearElement(elements.diagnosticList);
      diagnostics.forEach(function(item) {
        var row = doc.createElement('button');
        row.type = 'button';
        row.className = 'family-diagnostic-item ' + item.severity;
        row.textContent = item.message;
        row.addEventListener('click', function() {
          elements.diagnostics.hidden = true;
          if (item.nodeIds && item.nodeIds[0]) selectNode(item.nodeIds[0]);
          else if (item.relationId) selectRelation(item.relationId);
        });
        elements.diagnosticList.appendChild(row);
      });
      elements.diagnosticCount.textContent = diagnostics.length;
      elements.diagnosticCount.hidden = diagnostics.length === 0;
      if (!diagnostics.length) {
        var empty = doc.createElement('div');
        empty.textContent = '未发现结构问题';
        empty.className = 'family-diagnostic-item info';
        elements.diagnosticList.appendChild(empty);
      }
    }

    function setFilter(key, value) {
      runtime = reduceFamilyView(runtime, { type: 'SET_FILTER', key: key, value: value });
      relayout('filter');
    }

    function setMode(mode) {
      runtime = reduceFamilyView(runtime, { type: 'SET_LAYOUT_MODE', mode: mode });
      doc.getElementById('family-mode-lineage').setAttribute('aria-pressed', String(runtime.layoutMode === 'lineage'));
      doc.getElementById('family-mode-house').setAttribute('aria-pressed', String(runtime.layoutMode === 'house'));
      persistView();
      relayout('mode');
    }

    function scheduleSpacing(key, value, input) {
      runtime = reduceFamilyView(runtime, { type: 'SET_SPACING', key: key, value: value });
      doc.getElementById(input.id + '-output').value = value;
      persistView();
      if (sliderTimer) clearTimeout(sliderTimer);
      sliderTimer = setTimeout(function() { relayout('spacing'); }, 120);
    }

    function syncControls() {
      elements.generationGap.value = runtime.generationGap;
      elements.branchGap.value = runtime.branchGap;
      elements.componentGap.value = runtime.componentGap;
      doc.getElementById('family-generation-gap-output').value = runtime.generationGap;
      doc.getElementById('family-branch-gap-output').value = runtime.branchGap;
      doc.getElementById('family-component-gap-output').value = runtime.componentGap;
      doc.getElementById('family-mode-lineage').setAttribute('aria-pressed', String(runtime.layoutMode === 'lineage'));
      doc.getElementById('family-mode-house').setAttribute('aria-pressed', String(runtime.layoutMode === 'house'));
      populateHouseCategories();
    }

    function open() {
      if (isOpen) return relayout('open');
      isOpen = true;
      firstLayout = true;
      previousFocus = doc.activeElement;
      overlay.hidden = false;
      runtime = createFamilyViewState(schema.normalizeFamilyView(appState.familyView));
      syncControls();
      doc.getElementById('family-workspace-title').focus();
      return relayout('open');
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      requestGate.cancel();
      if (layoutEngine) layoutEngine.cancel();
      overlay.hidden = true;
      closeInspector();
      elements.diagnostics.hidden = true;
      elements.help.hidden = true;
      if (previousFocus && previousFocus.focus) previousFocus.focus();
    }

    renderer = rendererModule.createFamilyRenderer({
      svg: svg,
      d3: d3,
      callbacks: {
        onSelectNode: selectNode,
        onSelectRelation: selectRelation,
        onFocusNode: function(nodeId) { focusNode(nodeId, 1); },
        onClearSelection: clearSelection,
      },
    });

    listen(doc.getElementById('family-mode-lineage'), 'click', function() { setMode('lineage'); });
    listen(doc.getElementById('family-mode-house'), 'click', function() { setMode('house'); });
    listen(elements.search, 'input', function() {
      searchResultCursor = -1;
      search(elements.search.value, elements.fuzzy.checked);
    });
    listen(elements.search, 'keydown', function(event) {
      if (event.key !== 'Enter' || !elements.search.value.trim()) return;
      var matches = search(elements.search.value, elements.fuzzy.checked).filter(function(node) {
        return visibleModelIds().has(String(node.id));
      });
      if (!matches.length) return;
      event.preventDefault();
      searchResultCursor = (searchResultCursor + 1) % matches.length;
      renderer.centerOnNode(matches[searchResultCursor].id, { scale: 0.9 });
    });
    listen(elements.fuzzy, 'change', function() {
      searchResultCursor = -1;
      search(elements.search.value, elements.fuzzy.checked);
    });
    listen(doc.getElementById('btn-family-close'), 'click', close);
    listen(doc.getElementById('btn-family-fit'), 'click', function() { renderer.fitView({ padding: 56 }); });
    listen(doc.getElementById('btn-family-relayout'), 'click', function() { relayout('manual'); });
    listen(doc.getElementById('btn-family-zoom-in'), 'click', function() { renderer.zoomBy(1.25); });
    listen(doc.getElementById('btn-family-zoom-out'), 'click', function() { renderer.zoomBy(0.8); });
    listen(doc.getElementById('btn-family-focus'), 'click', function() {
      if (runtime.focusNodeId) clearFocus(); else focusNode(runtime.selectedNodeId, 1);
    });
    listen(doc.getElementById('btn-family-filters'), 'click', function() { elements.filters.classList.add('is-open'); });
    listen(doc.getElementById('btn-family-filters-close'), 'click', function() { elements.filters.classList.remove('is-open'); });
    listen(doc.getElementById('btn-family-inspector-close'), 'click', function() {
      runtime = reduceFamilyView(runtime, { type: 'CLEAR_SELECTION' });
      updateHighlight();
      closeInspector();
    });
    listen(doc.getElementById('btn-family-diagnostics'), 'click', function() { elements.diagnostics.hidden = false; elements.help.hidden = true; });
    listen(doc.getElementById('btn-family-diagnostics-close'), 'click', function() { elements.diagnostics.hidden = true; });
    listen(doc.getElementById('btn-family-help'), 'click', function() { elements.help.hidden = false; elements.diagnostics.hidden = true; });
    listen(doc.getElementById('btn-family-help-close'), 'click', function() { elements.help.hidden = true; });
    listen(doc.getElementById('btn-family-add-relation'), 'click', function() { if (opts.onEditRelation) opts.onEditRelation(null); });
    listen(doc.getElementById('btn-family-export-svg'), 'click', function() { if (opts.onExportSvg) opts.onExportSvg(currentLayout, model, runtime); });
    listen(doc.getElementById('btn-family-export-png'), 'click', function() { if (opts.onExportPng) opts.onExportPng(currentLayout, model, runtime); });
    listen(doc.getElementById('family-show-hidden'), 'change', function(event) { setFilter('showHidden', event.target.checked); });
    listen(doc.getElementById('family-follow-episode'), 'change', function(event) { setFilter('followEpisode', event.target.checked); });
    listen(elements.houseCategory, 'change', function(event) {
      runtime = reduceFamilyView(runtime, { type: 'SET_HOUSE_CATEGORY', categoryId: event.target.value });
      persistView();
      if (runtime.layoutMode === 'house') relayout('house');
    });
    listen(elements.generationGap, 'input', function(event) { scheduleSpacing('generationGap', Number(event.target.value), event.target); });
    listen(elements.branchGap, 'input', function(event) { scheduleSpacing('branchGap', Number(event.target.value), event.target); });
    listen(elements.componentGap, 'input', function(event) { scheduleSpacing('componentGap', Number(event.target.value), event.target); });
    Array.from(doc.querySelectorAll('[data-family-kind]')).forEach(function(input) {
      listen(input, 'change', function() {
        setFilter('kind', Array.from(doc.querySelectorAll('[data-family-kind]:checked')).map(function(item) { return item.dataset.familyKind; }));
      });
    });
    Array.from(doc.querySelectorAll('[data-family-certainty]')).forEach(function(input) {
      listen(input, 'change', function() {
        setFilter('certainty', Array.from(doc.querySelectorAll('[data-family-certainty]:checked')).map(function(item) { return item.dataset.familyCertainty; }));
      });
    });
    listen(doc, 'keydown', function(event) {
      if (!isOpen) return;
      var editor = doc.getElementById('family-editor');
      if (editor && !editor.hidden) return;
      var editable = event.target && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName);
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!elements.help.hidden) elements.help.hidden = true;
        else if (!elements.diagnostics.hidden) elements.diagnostics.hidden = true;
        else if (elements.filters.classList.contains('is-open')) elements.filters.classList.remove('is-open');
        else if (!elements.inspector.hidden) clearSelection();
        else if (runtime.focusNodeId) clearFocus();
        else if (runtime.selectedNodeId || runtime.selectedRelationId) clearSelection();
        else close();
      } else if (!editable && event.key === '/') {
        event.preventDefault();
        elements.search.focus();
      } else if (!editable && event.key === '0') {
        event.preventDefault();
        renderer.fitView({ padding: 56 });
      } else if (!editable && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        if (runtime.focusNodeId) clearFocus(); else focusNode(runtime.selectedNodeId, 1);
      }
    }, true);

    return {
      open: open,
      close: close,
      relayout: relayout,
      setFilter: setFilter,
      selectNode: selectNode,
      selectRelation: selectRelation,
      focusNode: focusNode,
      clearFocus: clearFocus,
      toggleCollapse: toggleCollapse,
      search: search,
      exportState: function() { return JSON.parse(JSON.stringify(runtime)); },
      refresh: function() { buildData(); return relayout('refresh'); },
      isOpen: function() { return isOpen; },
      getLayout: function() { return currentLayout; },
      getModel: function() { return model; },
      destroy: function() {
        close();
        if (sliderTimer) clearTimeout(sliderTimer);
        listeners.forEach(function(remove) { remove(); });
        listeners.length = 0;
        if (layoutEngine) layoutEngine.dispose();
        renderer.destroy();
      },
    };
  }

  return {
    createFamilyViewState: createFamilyViewState,
    reduceFamilyView: reduceFamilyView,
    exactFamilySearch: exactFamilySearch,
    fuzzyFamilySearch: fuzzyFamilySearch,
    createLayoutRequestGate: createLayoutRequestGate,
    createFamilyView: createFamilyView,
  };
});
