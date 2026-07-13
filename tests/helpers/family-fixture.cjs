function generateFamilyGraph(nodeCount, relationCount) {
  const totalNodes = Math.max(2, Number(nodeCount) || 2);
  const totalRelations = Math.max(1, Number(relationCount) || 1);
  const houseCount = Math.max(4, Math.ceil(Math.sqrt(totalNodes / 2)));
  const nodes = Array.from({ length: totalNodes }, (_, index) => ({
    id: `N${index + 1}`,
    name: `Character ${String(index + 1).padStart(4, '0')}`,
    aliases: [`Alias ${index + 1}`],
    titles: index % 17 === 0 ? [`Title ${index + 1}`] : [],
    generationLabel: `Generation ${Math.floor(Math.log2(index + 1)) + 1}`,
    tags: { C1: `T${(index % houseCount) + 1}` },
    notes: index % 11 === 0 ? `Synthetic note ${index + 1}` : '',
    episodes: [],
    hidden: false,
  }));
  const familyRelations = [];

  for (let index = 0; index + 1 < totalNodes && familyRelations.length < totalRelations; index += 2) {
    familyRelations.push({
      id: `F${familyRelations.length + 1}`,
      kind: 'union',
      subtype: index % 8 === 0 ? 'political_union' : 'marriage',
      participants: [
        { nodeId: `N${index + 1}`, role: 'partner' },
        { nodeId: `N${index + 2}`, role: 'partner' },
      ],
      status: 'active',
      certainty: 'confirmed',
      episodes: [],
      evidence: [],
      hidden: false,
    });
  }

  for (let child = 3; child <= totalNodes && familyRelations.length < totalRelations; child += 1) {
    const parentA = Math.max(1, Math.floor(child / 2));
    const parentB = Math.max(1, parentA - 1);
    familyRelations.push({
      id: `F${familyRelations.length + 1}`,
      kind: 'parentage',
      subtype: child % 13 === 0 ? 'adoptive' : 'biological',
      participants: [
        { nodeId: `N${parentA}`, role: 'parent' },
        { nodeId: `N${parentB}`, role: 'parent' },
        { nodeId: `N${child}`, role: 'child' },
      ],
      status: 'acknowledged',
      certainty: child % 29 === 0 ? 'disputed' : 'confirmed',
      episodes: [],
      evidence: [],
      hidden: false,
    });
  }

  while (familyRelations.length < totalRelations) {
    const relationIndex = familyRelations.length;
    const source = (relationIndex * 17) % (totalNodes - 1) + 1;
    const target = Math.min(totalNodes, source + 1);
    const succession = relationIndex % 3 === 0;
    familyRelations.push({
      id: `F${relationIndex + 1}`,
      kind: succession ? 'succession' : 'kinship',
      subtype: succession ? 'claimant' : 'sibling',
      participants: succession
        ? [{ nodeId: `N${source}`, role: 'predecessor' }, { nodeId: `N${target}`, role: 'successor' }]
        : [{ nodeId: `N${source}`, role: 'member' }, { nodeId: `N${target}`, role: 'member' }],
      status: succession ? 'disputed' : 'unknown',
      certainty: relationIndex % 19 === 0 ? 'rumored' : 'confirmed',
      episodes: [],
      evidence: [],
      hidden: false,
    });
  }

  return {
    version: 5,
    nodes,
    links: [],
    familyRelations,
    familyView: {
      layoutMode: 'lineage',
      houseTagCategoryId: 'C1',
      generationGap: 150,
      branchGap: 48,
      componentGap: 120,
      collapsedNodeIds: [],
    },
    tagCategories: [{
      id: 'C1',
      name: 'House',
      visible: true,
      tags: Array.from({ length: houseCount }, (_, index) => ({
        id: `T${index + 1}`,
        name: `House ${index + 1}`,
        color: `hsl(${Math.round(index * 360 / houseCount)} 45% 58%)`,
      })),
    }],
    nextId: Math.max(totalNodes, totalRelations) + 1,
  };
}

module.exports = { generateFamilyGraph };
