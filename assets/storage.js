'use strict';

const LIST_KEY = 'randomisera-saved-lists-v1';
const DRAFT_KEY = 'randomisera-list-draft-v1';
const normalizeName = name => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('sv');
const validCount = value => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 1000;

function parseDraft(raw, maxLength = 100000) {
  if (raw === null) return null;
  const draft = JSON.parse(raw);
  if (!draft || draft.version !== 1 || typeof draft.text !== 'string' || draft.text.length > maxLength ||
      !['choose', 'groups', 'list'].includes(draft.mode) || typeof draft.unique !== 'boolean') return null;
  const counts = {choose: 1, groups: 2};
  for (const mode of Object.keys(counts)) if (validCount(draft.counts?.[mode])) counts[mode] = Number(draft.counts[mode]);
  // Pre-group-size drafts store a GROUP COUNT. Never reinterpret it as a size.
  const grouping = {
    method: ['groups', 'size'].includes(draft.grouping?.method) ? draft.grouping.method : 'groups',
    size: validCount(draft.grouping?.size) ? Number(draft.grouping.size) : 4
  };
  const candidate = draft.active;
  const active = candidate && typeof candidate.name === 'string' && Array.isArray(candidate.entries) &&
    candidate.entries.every(entry => typeof entry === 'string') ? {name: candidate.name, entries: [...candidate.entries]} : null;
  return {version: 1, text: draft.text, mode: draft.mode, counts, grouping, unique: draft.unique, active};
}

function createListStorage({local, session}) {
  return {
    readDraft(maxLength) { return parseDraft(session.getItem(DRAFT_KEY), maxLength); },
    writeDraft(draft) { session.setItem(DRAFT_KEY, JSON.stringify({...draft, version: 1})); },
    readLists() {
      const raw = local.getItem(LIST_KEY);
      if (raw === null) return [];
      const data = JSON.parse(raw);
      if (!data || data.version !== 1 || !Array.isArray(data.lists) || !data.lists.every(list =>
        typeof list.name === 'string' && list.name.trim() && Array.isArray(list.entries) && list.entries.every(entry => typeof entry === 'string'))) throw Error('Invalid saved lists');
      if (new Set(data.lists.map(list => normalizeName(list.name))).size !== data.lists.length) throw Error('Duplicate saved lists');
      return data.lists;
    },
    writeLists(lists) { local.setItem(LIST_KEY, JSON.stringify({version: 1, lists})); }
  };
}

module.exports = {LIST_KEY, DRAFT_KEY, normalizeName, parseDraft, createListStorage};
