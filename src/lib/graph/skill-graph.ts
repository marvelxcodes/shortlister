import Graph from "graphology";
import ontology from "../../../data/skills/ontology.json" with {
  type: "json",
};

type RawSkill = {
  id: string;
  label: string;
  aliases?: string[];
  related?: string[];
};

type Ontology = {
  version: string;
  disciplines: Array<{
    id: string;
    label: string;
    categories: Array<{
      id: string;
      label: string;
      skills: RawSkill[];
    }>;
  }>;
};

const ONT = ontology as Ontology;

export type NodeKind = "discipline" | "category" | "skill";

export interface SkillNode {
  kind: NodeKind;
  label: string;
}

let _graph: Graph<SkillNode> | null = null;
let _aliasIndex: Map<string, string> | null = null;
let _labelIndex: Map<string, string> | null = null;

function build(): {
  graph: Graph<SkillNode>;
  aliasIndex: Map<string, string>;
  labelIndex: Map<string, string>;
} {
  const graph = new Graph<SkillNode>({ type: "undirected", multi: false });
  const aliasIndex = new Map<string, string>();
  const labelIndex = new Map<string, string>();

  for (const discipline of ONT.disciplines) {
    const dId = `d:${discipline.id}`;
    if (!graph.hasNode(dId)) {
      graph.addNode(dId, { kind: "discipline", label: discipline.label });
    }
    for (const cat of discipline.categories) {
      const cId = `c:${cat.id}`;
      if (!graph.hasNode(cId)) {
        graph.addNode(cId, { kind: "category", label: cat.label });
      }
      if (!graph.hasEdge(dId, cId)) graph.addEdge(dId, cId);

      for (const skill of cat.skills) {
        const sId = `s:${skill.id}`;
        if (!graph.hasNode(sId)) {
          graph.addNode(sId, { kind: "skill", label: skill.label });
        }
        if (!graph.hasEdge(cId, sId)) graph.addEdge(cId, sId);
        labelIndex.set(norm(skill.label), sId);
        aliasIndex.set(norm(skill.id), sId);
        aliasIndex.set(norm(skill.label), sId);
        for (const alias of skill.aliases ?? []) {
          aliasIndex.set(norm(alias), sId);
        }
      }
    }
  }

  // pass 2: related edges (skill ↔ skill)
  for (const discipline of ONT.disciplines) {
    for (const cat of discipline.categories) {
      for (const skill of cat.skills) {
        for (const rel of skill.related ?? []) {
          const a = `s:${skill.id}`;
          const b = `s:${rel}`;
          if (graph.hasNode(b) && !graph.hasEdge(a, b)) graph.addEdge(a, b);
        }
      }
    }
  }

  return { graph, aliasIndex, labelIndex };
}

export function getGraph() {
  if (!_graph) {
    const built = build();
    _graph = built.graph;
    _aliasIndex = built.aliasIndex;
    _labelIndex = built.labelIndex;
  }
  return {
    graph: _graph!,
    aliasIndex: _aliasIndex!,
    labelIndex: _labelIndex!,
  };
}

function norm(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[._/]/g, " ")
    .trim();
}

/** Resolve a free-text skill string to a canonical node id (or null). */
export function resolveSkill(input: string): string | null {
  const { aliasIndex, labelIndex } = getGraph();
  const key = norm(input);
  return aliasIndex.get(key) ?? labelIndex.get(key) ?? null;
}

/** Resolve many skills; unknown ones are dropped and reported separately. */
export function resolveSkills(inputs: string[]) {
  const resolved: string[] = [];
  const unknown: string[] = [];
  for (const i of inputs) {
    const id = resolveSkill(i);
    if (id) resolved.push(id);
    else unknown.push(i);
  }
  return { resolved: dedupe(resolved), unknown };
}

/** Walk one hop from each skill node — includes siblings via category. */
export function expandOneHop(skillNodes: string[]): string[] {
  const { graph } = getGraph();
  const out = new Set<string>(skillNodes);
  for (const id of skillNodes) {
    if (!graph.hasNode(id)) continue;
    graph.forEachNeighbor(id, (neighbor, attr) => {
      if (attr.kind === "skill") out.add(neighbor);
      if (attr.kind === "category") {
        // include sibling skills in the same category
        graph.forEachNeighbor(neighbor, (sib, sibAttr) => {
          if (sibAttr.kind === "skill") out.add(sib);
        });
      }
    });
  }
  return [...out];
}

export function jaccard(a: Iterable<string>, b: Iterable<string>) {
  const sA = new Set(a);
  const sB = new Set(b);
  if (sA.size === 0 && sB.size === 0) return 0;
  let inter = 0;
  for (const x of sA) if (sB.has(x)) inter += 1;
  const union = sA.size + sB.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function labelOf(id: string): string {
  const { graph } = getGraph();
  if (!graph.hasNode(id)) return id;
  return graph.getNodeAttribute(id, "label");
}

export function categoryOf(skillId: string): string | null {
  const { graph } = getGraph();
  if (!graph.hasNode(skillId)) return null;
  let cat: string | null = null;
  graph.forEachNeighbor(skillId, (_n, attr) => {
    if (attr.kind === "category" && !cat) cat = attr.label;
  });
  return cat;
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

/** All canonical skills, mostly used for evals + onboarding fixtures. */
export function allSkills() {
  const { graph } = getGraph();
  const skills: { id: string; label: string; category: string | null }[] = [];
  graph.forEachNode((id, attr) => {
    if (attr.kind === "skill") {
      skills.push({ id, label: attr.label, category: categoryOf(id) });
    }
  });
  return skills;
}
