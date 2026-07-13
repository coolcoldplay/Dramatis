(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisFamilySchema = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  var FAMILY_DEFAULTS = Object.freeze({
    version: 5,
    kinds: ['union', 'parentage', 'kinship', 'succession', 'other'],
    certainty: ['confirmed', 'probable', 'rumored', 'disputed', 'unknown'],
    subtypes: Object.freeze({
      union: ['marriage', 'partnership', 'betrothal', 'affair', 'political_union', 'former_union', 'other'],
      parentage: ['biological', 'adoptive', 'legal', 'guardian', 'step', 'surrogate', 'supernatural', 'other'],
      kinship: ['sibling', 'half_sibling', 'twin', 'step_sibling', 'other'],
      succession: ['heir', 'claimant', 'designated_successor', 'other'],
      other: ['other'],
    }),
    statuses: Object.freeze({
      union: ['active', 'ended', 'annulled', 'widowed', 'unknown'],
      parentage: ['acknowledged', 'unacknowledged', 'disputed', 'unknown'],
      kinship: ['unknown'],
      succession: ['active', 'ended', 'disputed', 'unknown'],
      other: ['unknown'],
    }),
    roles: Object.freeze({
      union: ['partner'],
      parentage: ['parent', 'child'],
      kinship: ['member'],
      succession: ['predecessor', 'successor'],
      other: ['member'],
    }),
    view: Object.freeze({
      layoutMode: 'lineage',
      houseTagCategoryId: null,
      generationGap: 150,
      branchGap: 48,
      componentGap: 120,
      collapsedNodeIds: [],
    }),
  });

  function asString(value, fallback) {
    if (value == null) return fallback == null ? '' : fallback;
    return String(value);
  }

  function endpointId(value) {
    if (value && typeof value === 'object') return asString(value.id, '');
    return asString(value, '');
  }

  function finiteNumber(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }

  function cloneArray(value) {
    return Array.isArray(value) ? value.map(function(item) {
      return item && typeof item === 'object' ? Object.assign({}, item) : item;
    }) : [];
  }

  function normalizeTimePoint(value) {
    if (!value || typeof value !== 'object') return null;
    var point = Object.assign({}, value);
    ['year', 'season', 'episode', 'sequence'].forEach(function(key) {
      var normalized = finiteNumber(point[key]);
      if (normalized === undefined) delete point[key];
      else point[key] = normalized;
    });
    if (point.label != null) point.label = asString(point.label, '');
    return Object.keys(point).length ? point : null;
  }

  function normalizeTime(value) {
    if (!value || typeof value !== 'object') return { start: null, end: null };
    return {
      start: normalizeTimePoint(value.start),
      end: normalizeTimePoint(value.end),
    };
  }

  function normalizeFamilyRelation(value, index) {
    var input = value && typeof value === 'object' ? value : {};
    var kind = asString(input.kind, 'other') || 'other';
    var participants = Array.isArray(input.participants) ? input.participants : [];
    return {
      id: asString(input.id, 'F' + (Number(index || 0) + 1)),
      kind: kind,
      subtype: asString(input.subtype, 'other') || 'other',
      participants: participants.map(function(participant) {
        var item = participant && typeof participant === 'object' ? participant : {};
        return {
          nodeId: endpointId(item.nodeId),
          role: asString(item.role, ''),
        };
      }),
      contextId: input.contextId == null || input.contextId === '' ? null : asString(input.contextId, ''),
      status: asString(input.status, 'unknown') || 'unknown',
      certainty: asString(input.certainty, 'unknown') || 'unknown',
      label: asString(input.label, ''),
      time: normalizeTime(input.time),
      episodes: cloneArray(input.episodes),
      evidence: cloneArray(input.evidence),
      notes: asString(input.notes, ''),
      hidden: input.hidden === true,
    };
  }

  function normalizeFamilyRelations(values) {
    return (Array.isArray(values) ? values : []).map(normalizeFamilyRelation);
  }

  function clamp(value, fallback, minimum, maximum) {
    var number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(maximum, Math.max(minimum, number));
  }

  function normalizeFamilyView(value) {
    var input = value && typeof value === 'object' ? value : {};
    var collapsed = Array.isArray(input.collapsedNodeIds) ? input.collapsedNodeIds : [];
    var seen = new Set();
    return {
      layoutMode: input.layoutMode === 'house' ? 'house' : 'lineage',
      houseTagCategoryId: input.houseTagCategoryId == null || input.houseTagCategoryId === ''
        ? null
        : asString(input.houseTagCategoryId, ''),
      generationGap: clamp(input.generationGap, FAMILY_DEFAULTS.view.generationGap, 90, 260),
      branchGap: clamp(input.branchGap, FAMILY_DEFAULTS.view.branchGap, 24, 120),
      componentGap: clamp(input.componentGap, FAMILY_DEFAULTS.view.componentGap, 60, 260),
      collapsedNodeIds: collapsed.reduce(function(result, id) {
        var normalized = asString(id, '');
        if (normalized && !seen.has(normalized)) {
          seen.add(normalized);
          result.push(normalized);
        }
        return result;
      }, []),
    };
  }

  function legacyRelation(link, index) {
    var input = link || {};
    var relation = asString(input.familyRelation, '');
    var sourceId = endpointId(input.source);
    var targetId = endpointId(input.target);
    var kind;
    var subtype;
    var participants;

    if (relation === 'parent') {
      kind = 'parentage';
      subtype = 'biological';
      participants = [{ nodeId: sourceId, role: 'parent' }, { nodeId: targetId, role: 'child' }];
    } else if (relation === 'child') {
      kind = 'parentage';
      subtype = 'biological';
      participants = [{ nodeId: targetId, role: 'parent' }, { nodeId: sourceId, role: 'child' }];
    } else if (relation === 'spouse') {
      kind = 'union';
      subtype = 'marriage';
      participants = [{ nodeId: sourceId, role: 'partner' }, { nodeId: targetId, role: 'partner' }];
    } else if (relation === 'sibling') {
      kind = 'kinship';
      subtype = 'sibling';
      participants = [{ nodeId: sourceId, role: 'member' }, { nodeId: targetId, role: 'member' }];
    } else {
      return null;
    }

    return normalizeFamilyRelation({
      id: 'FLEGACY_' + (input.id || index + 1),
      kind: kind,
      subtype: subtype,
      participants: participants,
      status: 'unknown',
      certainty: 'unknown',
      label: input.label,
      episodes: input.episodes,
      notes: input.notes,
      hidden: input.hidden,
    }, index);
  }

  function migrateLegacyFamilyRelations(links) {
    return (Array.isArray(links) ? links : []).reduce(function(result, link, index) {
      var relation = legacyRelation(link, index);
      if (relation) result.push(relation);
      return result;
    }, []);
  }

  function normalizeFamilyGraph(value) {
    var input = value && typeof value === 'object' ? value : {};
    var hasV5Relations = Array.isArray(input.familyRelations) && input.familyRelations.length > 0;
    var migrated = hasV5Relations ? [] : migrateLegacyFamilyRelations(input.links);
    return {
      familyRelations: hasV5Relations ? normalizeFamilyRelations(input.familyRelations) : migrated,
      familyView: normalizeFamilyView(input.familyView),
      migratedLegacy: !hasV5Relations && migrated.length > 0,
    };
  }

  function hasMetadataLoss(relation) {
    var time = relation.time || {};
    return (relation.certainty && relation.certainty !== 'unknown')
      || (relation.status && relation.status !== 'unknown')
      || relation.contextId
      || (time.start || time.end)
      || (relation.evidence && relation.evidence.length > 0);
  }

  function exportLegacyFamilyRelations(nodes, relations) {
    var links = [];
    var losses = [];
    normalizeFamilyRelations(relations).forEach(function(relation) {
      var participants = relation.participants;
      var base = {
        label: relation.label,
        episodes: relation.episodes,
        notes: relation.notes,
        hidden: relation.hidden,
      };
      if (hasMetadataLoss(relation)) {
        losses.push({ code: 'RELATION_METADATA', relationId: relation.id });
      }
      if (relation.kind === 'union') {
        if (participants.length !== 2) {
          losses.push({ code: 'MULTI_PARTICIPANT_UNION', relationId: relation.id });
          return;
        }
        links.push(Object.assign({}, base, {
          id: 'LLEGACY_' + relation.id,
          source: participants[0].nodeId,
          target: participants[1].nodeId,
          familyRelation: 'spouse',
        }));
        return;
      }
      if (relation.kind === 'parentage') {
        var child = participants.find(function(item) { return item.role === 'child'; });
        var parents = participants.filter(function(item) { return item.role === 'parent'; });
        if (!child || !parents.length) {
          losses.push({ code: 'UNREPRESENTABLE_RELATION', relationId: relation.id });
          return;
        }
        parents.forEach(function(parent, index) {
          links.push(Object.assign({}, base, {
            id: 'LLEGACY_' + relation.id + '_' + (index + 1),
            source: parent.nodeId,
            target: child.nodeId,
            familyRelation: 'parent',
          }));
        });
        return;
      }
      if (relation.kind === 'kinship' && participants.length === 2) {
        links.push(Object.assign({}, base, {
          id: 'LLEGACY_' + relation.id,
          source: participants[0].nodeId,
          target: participants[1].nodeId,
          familyRelation: 'sibling',
        }));
        return;
      }
      losses.push({ code: 'UNREPRESENTABLE_RELATION', relationId: relation.id });
    });
    return { links: links, losses: losses };
  }

  return {
    FAMILY_DEFAULTS: FAMILY_DEFAULTS,
    normalizeFamilyRelation: normalizeFamilyRelation,
    normalizeFamilyRelations: normalizeFamilyRelations,
    normalizeFamilyView: normalizeFamilyView,
    migrateLegacyFamilyRelations: migrateLegacyFamilyRelations,
    normalizeFamilyGraph: normalizeFamilyGraph,
    exportLegacyFamilyRelations: exportLegacyFamilyRelations,
  };
});
