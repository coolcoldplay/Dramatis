(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DramatisEpisodeTimeline = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function compareEpisodes(a, b) {
    if (a.season !== b.season) return a.season - b.season;
    if (a.episode !== b.episode) return a.episode - b.episode;
    return (a.sequence || 0) - (b.sequence || 0);
  }

  function parseEpisodes(str) {
    if (!str) return [];
    var episodes = [];
    String(str).toUpperCase().split(/[,\s]+/).filter(Boolean).forEach(function(part) {
      var match = part.match(/S(\d+)E(\d+)/i);
      if (!match) return;
      episodes.push({
        season: parseInt(match[1], 10),
        episode: parseInt(match[2], 10),
        raw: part,
      });
    });
    return episodes.sort(compareEpisodes);
  }

  function episodeToString(ep) {
    return 'S' + ep.season + 'E' + ep.episode;
  }

  function uniqueStringList(value) {
    var seen = new Set();
    return (Array.isArray(value) ? value : []).map(function(item) {
      return String(item == null ? '' : item).trim();
    }).filter(function(item) {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
  }

  function normalizeEpisodeGuide(value) {
    var seen = new Set();
    return (Array.isArray(value) ? value : []).map(function(item) {
      var source = item || {};
      var season = Math.trunc(Number(source.season));
      var episode = Math.trunc(Number(source.episode));
      if (!Number.isFinite(season) || season < 1 || !Number.isFinite(episode) || episode < 1) {
        return null;
      }
      var key = season + '-' + episode;
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        season: season,
        episode: episode,
        raw: source.raw ? String(source.raw) : episodeToString({ season: season, episode: episode }),
        title: source.title ? String(source.title) : '',
        englishTitle: source.englishTitle ? String(source.englishTitle) : '',
        airDate: source.airDate ? String(source.airDate) : '',
        summary: source.summary ? String(source.summary) : '',
        sourceUrl: source.sourceUrl ? String(source.sourceUrl) : '',
        eventNodeIds: uniqueStringList(source.eventNodeIds),
        participantNodeIds: uniqueStringList(source.participantNodeIds),
      };
    }).filter(Boolean).sort(compareEpisodes);
  }

  function findEpisodeGuideEntry(episodeGuide, episode) {
    if (!episode || episode.season < 1 || episode.episode < 1) return null;
    var guide = episodeGuide || [];
    for (var i = 0; i < guide.length; i++) {
      if (guide[i].season === episode.season && guide[i].episode === episode.episode) return guide[i];
    }
    return null;
  }

  function resolveEpisode(ep, episodeList) {
    if (!ep || (ep.season === 0 && ep.episode === 0)) return ep;
    var list = episodeList || [];
    for (var i = list.length - 1; i >= 0; i--) {
      var item = list[i];
      if (item.season === ep.season && item.episode === ep.episode) return item;
    }
    return ep;
  }

  function parseEpisodesPreserveSeq(str, existingEpisodes) {
    var parsed = parseEpisodes(str);
    if (!existingEpisodes || existingEpisodes.length === 0) return parsed;
    return parsed.map(function(ep) {
      for (var i = 0; i < existingEpisodes.length; i++) {
        var old = existingEpisodes[i];
        if (old.season === ep.season && old.episode === ep.episode) {
          if (old.sequence !== undefined) ep.sequence = old.sequence;
          break;
        }
      }
      return ep;
    });
  }

  function episodeIndexInList(ep, episodeList) {
    var list = episodeList || [];
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (
        item.season === ep.season &&
        item.episode === ep.episode &&
        (item.sequence || 0) === (ep.sequence || 0)
      ) {
        return i;
      }
    }
    return -1;
  }

  function addEpisodes(episodeSet, episodes) {
    (episodes || []).forEach(function(ep) {
      var key = ep.season + '-' + ep.episode + '-' + (ep.sequence || 0);
      if (!episodeSet.has(key)) episodeSet.set(key, Object.assign({}, ep));
    });
  }

  function collectAllEpisodes(nodes, links, episodeGuide) {
    var episodeSet = new Map();
    (nodes || []).forEach(function(node) {
      addEpisodes(episodeSet, node && node.episodes);
    });
    (links || []).forEach(function(link) {
      addEpisodes(episodeSet, link && link.episodes);
    });
    addEpisodes(episodeSet, (episodeGuide || []).map(function(item) {
      return { season: item.season, episode: item.episode };
    }));
    return Array.from(episodeSet.values()).sort(compareEpisodes);
  }

  return {
    collectAllEpisodes: collectAllEpisodes,
    compareEpisodes: compareEpisodes,
    episodeIndexInList: episodeIndexInList,
    episodeToString: episodeToString,
    findEpisodeGuideEntry: findEpisodeGuideEntry,
    normalizeEpisodeGuide: normalizeEpisodeGuide,
    parseEpisodes: parseEpisodes,
    parseEpisodesPreserveSeq: parseEpisodesPreserveSeq,
    resolveEpisode: resolveEpisode,
  };
});
