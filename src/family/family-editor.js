(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.DramatisFamilyEditor = factory(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function(root) {
  'use strict';

  var SUBTYPES = {
    union: ['marriage', 'partnership', 'betrothal', 'affair', 'political_union', 'former_union', 'other'],
    parentage: ['biological', 'adoptive', 'legal', 'guardian', 'step', 'surrogate', 'supernatural', 'other'],
    kinship: ['sibling', 'half_sibling', 'twin', 'step_sibling', 'other'],
    succession: ['heir', 'claimant', 'designated_successor', 'other'],
    other: ['other'],
  };
  var ROLES = {
    union: ['partner'],
    parentage: ['parent', 'child'],
    kinship: ['member'],
    succession: ['predecessor', 'successor'],
    other: ['member'],
  };
  var STATUSES = {
    union: ['active', 'ended', 'annulled', 'widowed', 'unknown'],
    parentage: ['acknowledged', 'unacknowledged', 'disputed', 'unknown'],
    kinship: ['unknown'],
    succession: ['active', 'ended', 'disputed', 'unknown'],
    other: ['unknown'],
  };
  var KINDS = ['union', 'parentage', 'kinship', 'succession', 'other'];
  var CERTAINTIES = ['confirmed', 'probable', 'rumored', 'disputed', 'unknown'];
  var LABELS = {
    union: '伴侣 / 联姻', parentage: '亲子 / 监护', kinship: '手足 / 同辈', succession: '继承 / 权位', other: '其他',
    marriage: '婚姻', partnership: '伴侣', betrothal: '订婚', affair: '婚外关系', political_union: '政治联姻', former_union: '已结束关系',
    biological: '生物亲子', adoptive: '收养', legal: '法律亲子', guardian: '监护', step: '继亲', surrogate: '代理 / 代孕', supernatural: '超自然亲子',
    sibling: '兄弟姐妹', half_sibling: '同父或同母手足', twin: '双生', step_sibling: '继兄弟姐妹',
    heir: '继承人', claimant: '宣称者', designated_successor: '指定继承人',
    partner: '伴侣', parent: '父母 / 亲代', child: '子女 / 后代', member: '成员', predecessor: '前任', successor: '继任者', witness: '见证者',
    active: '持续中', ended: '已结束', annulled: '已撤销', widowed: '丧偶', acknowledged: '已承认', unacknowledged: '未承认', disputed: '有争议',
    confirmed: '已确认', probable: '较可信', rumored: '传闻', unknown: '未知', sealed: '已确立',
  };

  function displayLabel(value) {
    return LABELS[value] || String(value || '');
  }

  function valuesFor(map, kind) {
    return (map[kind] || map.other).slice();
  }

  function allowedSubtypes(kind) { return valuesFor(SUBTYPES, kind); }
  function allowedRoles(kind) { return valuesFor(ROLES, kind); }
  function allowedStatuses(kind) { return valuesFor(STATUSES, kind); }

  function nextFamilyRelationId(relations) {
    var maximum = 0;
    (relations || []).forEach(function(relation) {
      var match = relation && String(relation.id || '').match(/^F(\d+)$/);
      if (match) maximum = Math.max(maximum, Number(match[1]));
    });
    return 'F' + (maximum + 1);
  }

  function episodeText(episodes) {
    return (episodes || []).map(function(episode) {
      return episode.raw || ('S' + episode.season + 'E' + episode.episode);
    }).join(' ');
  }

  function evidenceText(evidence) {
    return (evidence || []).map(function(item) {
      if (typeof item === 'string') return item;
      return item.source || item.label || item.note || '';
    }).filter(Boolean).join('\n');
  }

  function createDraft(relation, relations) {
    if (!relation) {
      return {
        id: nextFamilyRelationId(relations || []),
        kind: 'union',
        subtype: 'marriage',
        status: 'unknown',
        certainty: 'unknown',
        contextId: null,
        label: '',
        participants: [{ nodeId: '', role: 'partner' }, { nodeId: '', role: 'partner' }],
        startYear: '',
        endYear: '',
        episodesText: '',
        evidenceText: '',
        notes: '',
        hidden: false,
      };
    }
    return {
      id: String(relation.id || ''),
      kind: String(relation.kind || 'other'),
      subtype: String(relation.subtype || 'other'),
      status: String(relation.status || 'unknown'),
      certainty: String(relation.certainty || 'unknown'),
      contextId: relation.contextId || null,
      label: relation.label || '',
      participants: (relation.participants || []).map(function(item) {
        return { nodeId: String(item.nodeId || ''), role: String(item.role || '') };
      }),
      startYear: relation.time && relation.time.start && relation.time.start.year != null ? String(relation.time.start.year) : '',
      endYear: relation.time && relation.time.end && relation.time.end.year != null ? String(relation.time.end.year) : '',
      episodesText: episodeText(relation.episodes),
      evidenceText: evidenceText(relation.evidence),
      notes: relation.notes || '',
      hidden: relation.hidden === true,
    };
  }

  function parseEpisodes(value) {
    var matches = String(value || '').toUpperCase().match(/S\d+E\d+/g) || [];
    return matches.map(function(raw) {
      var parts = raw.match(/S(\d+)E(\d+)/);
      return { season: Number(parts[1]), episode: Number(parts[2]), raw: raw };
    });
  }

  function timePoint(value) {
    if (value == null || String(value).trim() === '') return null;
    var year = Number(value);
    return Number.isFinite(year) ? { year: year, label: String(value).trim() } : { label: String(value).trim() };
  }

  function normalizeDraft(value) {
    var draft = value || {};
    var relation = {
      id: String(draft.id || ''),
      kind: String(draft.kind || 'other'),
      subtype: String(draft.subtype || 'other'),
      participants: (draft.participants || []).map(function(item) {
        return { nodeId: String(item.nodeId || ''), role: String(item.role || '') };
      }),
      contextId: draft.contextId || null,
      status: String(draft.status || 'unknown'),
      certainty: String(draft.certainty || 'unknown'),
      label: String(draft.label || ''),
      time: { start: timePoint(draft.startYear), end: timePoint(draft.endYear) },
      episodes: parseEpisodes(draft.episodesText),
      evidence: String(draft.evidenceText || '').split(/\r?\n/).map(function(line) { return line.trim(); })
        .filter(Boolean).map(function(source) { return { source: source }; }),
      notes: String(draft.notes || ''),
      hidden: draft.hidden === true,
    };
    var schema = root && root.DramatisFamilySchema;
    return schema && schema.normalizeFamilyRelation ? schema.normalizeFamilyRelation(relation, 0) : relation;
  }

  function validateDraft(value, nodes, relations, options) {
    var draft = value || {};
    var settings = options || {};
    var errors = [];
    var nodeIds = new Set((nodes || []).filter(Boolean).map(function(node) { return String(node.id); }));
    var relationId = String(draft.id || '').trim();
    function error(code, message) { errors.push({ code: code, message: message }); }
    if (!relationId) error('MISSING_ID', '关系 ID 不能为空');
    if ((relations || []).some(function(relation) {
      return relation && String(relation.id) === relationId && String(relation.id) !== String(settings.currentId || '');
    })) error('DUPLICATE_ID', '关系 ID 已存在');
    var participants = Array.isArray(draft.participants) ? draft.participants : [];
    if (participants.length < 2) error('TOO_FEW_PARTICIPANTS', '至少需要两位参与者');
    var participantKeys = new Set();
    participants.forEach(function(item) {
      var nodeId = item && String(item.nodeId || '').trim();
      var role = item && String(item.role || '').trim();
      if (!nodeId) error('MISSING_PARTICIPANT', '参与者必须选择人物');
      else if (!nodeIds.has(nodeId)) error('UNKNOWN_PARTICIPANT', '参与者不存在：' + nodeId);
      if (!role) error('MISSING_ROLE', '参与者必须选择角色');
      var key = nodeId + '\u0000' + role;
      if (nodeId && role && participantKeys.has(key)) error('DUPLICATE_PARTICIPANT', '同一人物与角色不能重复');
      participantKeys.add(key);
    });
    var roles = participants.map(function(item) { return item && item.role; });
    if (draft.kind === 'union' && roles.filter(function(role) { return role === 'partner'; }).length < 2) {
      error('MISSING_PARTNERS', '伴侣关系至少需要两位 partner');
    }
    if (draft.kind === 'parentage') {
      if (!roles.includes('parent')) error('MISSING_PARENT', '亲子关系至少需要一位 parent');
      if (!roles.includes('child')) error('MISSING_CHILD', '亲子关系需要一位 child');
      if (roles.filter(function(role) { return role === 'child'; }).length > 1) error('MULTIPLE_CHILDREN', '单个亲子事件只能有一位 child');
    }
    if (draft.kind === 'succession') {
      if (!roles.includes('predecessor')) error('MISSING_PREDECESSOR', '继承关系需要 predecessor');
      if (!roles.includes('successor')) error('MISSING_SUCCESSOR', '继承关系需要 successor');
    }
    return { valid: errors.length === 0, errors: errors };
  }

  function bindFamilyEditor(options) {
    var opts = options || {};
    var doc = opts.document || (root && root.document);
    var state = opts.state;
    var editor = doc.getElementById('family-editor');
    var form = doc.getElementById('family-editor-form');
    var participantsElement = doc.getElementById('family-editor-participants');
    var errorsElement = doc.getElementById('family-editor-errors');
    var editingId = null;
    var draft = null;
    var listeners = [];
    if (!editor || !form || !state) throw new Error('Family editor markup or state is missing');

    function listen(target, type, handler) {
      target.addEventListener(type, handler);
      listeners.push(function() { target.removeEventListener(type, handler); });
    }

    function field(id) { return doc.getElementById(id); }

    function setOptions(select, values, current) {
      while (select.firstChild) select.removeChild(select.firstChild);
      var all = values.slice();
      if (current && all.indexOf(current) === -1) all.unshift(current);
      all.forEach(function(value) {
        var option = doc.createElement('option');
        option.value = value;
        option.textContent = displayLabel(value);
        select.appendChild(option);
      });
      select.value = current || values[0];
    }

    function renderContextOptions() {
      var select = field('family-editor-context');
      while (select.firstChild) select.removeChild(select.firstChild);
      var none = doc.createElement('option');
      none.value = '';
      none.textContent = '无';
      select.appendChild(none);
      (state.familyRelations || []).filter(function(relation) {
        return relation.kind === 'union' && relation.id !== editingId;
      }).forEach(function(relation) {
        var option = doc.createElement('option');
        option.value = relation.id;
        option.textContent = relation.label || relation.id + ' · ' + relation.subtype;
        select.appendChild(option);
      });
      select.value = draft.contextId || '';
    }

    function renderParticipants() {
      while (participantsElement.firstChild) participantsElement.removeChild(participantsElement.firstChild);
      var roles = allowedRoles(draft.kind);
      draft.participants.forEach(function(participant, participantIndex) {
        var row = doc.createElement('div');
        row.className = 'family-participant-row';
        var personSelect = doc.createElement('select');
        personSelect.setAttribute('aria-label', '参与人物 ' + (participantIndex + 1));
        var placeholder = doc.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '选择人物';
        personSelect.appendChild(placeholder);
        (state.nodes || []).slice().sort(function(a, b) {
          return String(a.name || a.id).localeCompare(String(b.name || b.id));
        }).forEach(function(node) {
          var option = doc.createElement('option');
          option.value = node.id;
          option.textContent = node.name || node.id;
          personSelect.appendChild(option);
        });
        personSelect.value = participant.nodeId || '';
        personSelect.addEventListener('change', function() { participant.nodeId = personSelect.value; });
        var roleSelect = doc.createElement('select');
        roleSelect.setAttribute('aria-label', '参与角色 ' + (participantIndex + 1));
        setOptions(roleSelect, roles, participant.role);
        roleSelect.addEventListener('change', function() { participant.role = roleSelect.value; });
        var remove = doc.createElement('button');
        remove.type = 'button';
        remove.className = 'family-icon-btn';
        remove.setAttribute('aria-label', '移除参与者 ' + (participantIndex + 1));
        remove.textContent = '×';
        remove.addEventListener('click', function() {
          draft.participants.splice(participantIndex, 1);
          renderParticipants();
        });
        row.appendChild(personSelect);
        row.appendChild(roleSelect);
        row.appendChild(remove);
        participantsElement.appendChild(row);
      });
    }

    function renderDraft() {
      field('family-editor-id').value = draft.id;
      setOptions(field('family-editor-kind'), KINDS, draft.kind);
      setOptions(field('family-editor-subtype'), allowedSubtypes(draft.kind), draft.subtype);
      setOptions(field('family-editor-status'), allowedStatuses(draft.kind), draft.status);
      setOptions(field('family-editor-certainty'), CERTAINTIES, draft.certainty);
      field('family-editor-label').value = draft.label;
      field('family-editor-start').value = draft.startYear;
      field('family-editor-end').value = draft.endYear;
      field('family-editor-episodes').value = draft.episodesText;
      field('family-editor-evidence').value = draft.evidenceText;
      field('family-editor-notes').value = draft.notes;
      field('family-editor-hidden').checked = draft.hidden;
      renderContextOptions();
      renderParticipants();
      errorsElement.hidden = true;
      field('btn-family-editor-delete').hidden = !editingId;
    }

    function collectDraft() {
      return Object.assign({}, draft, {
        id: field('family-editor-id').value.trim(),
        kind: field('family-editor-kind').value,
        subtype: field('family-editor-subtype').value,
        status: field('family-editor-status').value,
        certainty: field('family-editor-certainty').value,
        contextId: field('family-editor-context').value || null,
        label: field('family-editor-label').value.trim(),
        startYear: field('family-editor-start').value.trim(),
        endYear: field('family-editor-end').value.trim(),
        episodesText: field('family-editor-episodes').value.trim(),
        evidenceText: field('family-editor-evidence').value.trim(),
        notes: field('family-editor-notes').value.trim(),
        hidden: field('family-editor-hidden').checked,
      });
    }

    function showErrors(errors) {
      while (errorsElement.firstChild) errorsElement.removeChild(errorsElement.firstChild);
      errors.forEach(function(error) {
        var item = doc.createElement('div');
        item.textContent = error.message;
        errorsElement.appendChild(item);
      });
      errorsElement.hidden = errors.length === 0;
    }

    function open(relationId) {
      editingId = relationId || null;
      var relation = editingId ? (state.familyRelations || []).find(function(item) { return item.id === editingId; }) : null;
      draft = createDraft(relation, state.familyRelations || []);
      renderDraft();
      editor.hidden = false;
      field('family-editor-kind').focus();
    }

    function close() {
      editor.hidden = true;
      editingId = null;
      draft = null;
    }

    listen(field('family-editor-kind'), 'change', function(event) {
      draft.kind = event.target.value;
      var roles = allowedRoles(draft.kind);
      draft.participants.forEach(function(participant, index) {
        if (roles.indexOf(participant.role) === -1) participant.role = roles[Math.min(index, roles.length - 1)];
      });
      draft.subtype = allowedSubtypes(draft.kind)[0];
      draft.status = allowedStatuses(draft.kind)[0];
      renderDraft();
    });
    listen(field('btn-family-participant-add'), 'click', function() {
      draft.participants.push({ nodeId: '', role: allowedRoles(draft.kind)[0] });
      renderParticipants();
    });
    listen(field('btn-family-editor-close'), 'click', close);
    listen(field('btn-family-editor-cancel'), 'click', close);
    listen(editor, 'click', function(event) { if (event.target === editor) close(); });
    listen(form, 'submit', function(event) {
      event.preventDefault();
      var collected = collectDraft();
      var validation = validateDraft(collected, state.nodes, state.familyRelations, { currentId: editingId });
      showErrors(validation.errors);
      if (!validation.valid) return;
      var normalized = normalizeDraft(collected);
      var index = editingId ? state.familyRelations.findIndex(function(item) { return item.id === editingId; }) : -1;
      if (index >= 0) state.familyRelations[index] = normalized;
      else state.familyRelations.push(normalized);
      close();
      if (opts.onSave) opts.onSave(normalized);
    });
    listen(field('btn-family-editor-delete'), 'click', function() {
      if (!editingId) return;
      state.familyRelations = state.familyRelations.filter(function(item) { return item.id !== editingId; });
      var removedId = editingId;
      close();
      if (opts.onDelete) opts.onDelete(removedId);
    });
    listen(doc, 'keydown', function(event) {
      if (!editor.hidden && event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      }
    });

    return {
      open: open,
      close: close,
      destroy: function() { listeners.forEach(function(remove) { remove(); }); listeners.length = 0; },
    };
  }

  return {
    allowedSubtypes: allowedSubtypes,
    allowedRoles: allowedRoles,
    allowedStatuses: allowedStatuses,
    displayLabel: displayLabel,
    nextFamilyRelationId: nextFamilyRelationId,
    createDraft: createDraft,
    validateDraft: validateDraft,
    normalizeDraft: normalizeDraft,
    bindFamilyEditor: bindFamilyEditor,
  };
});
