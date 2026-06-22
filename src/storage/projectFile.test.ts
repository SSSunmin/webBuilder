import { describe, expect, it } from "vitest";
import {
  ProjectFileError,
  parseProject,
  prepareImport,
  serializeProject,
} from "./projectFile";
import type { PageDocument } from "../types/page";

function validDoc(): PageDocument {
  return {
    id: "abc",
    version: 1,
    rootId: "root",
    nodes: {
      root: {
        id: "root",
        type: "Layout",
        props: {},
        children: [],
        frame: { x: 0, y: 0, w: 1280, h: 800 },
      },
    },
    meta: { name: "데모", createdAt: "2026-01-01", updatedAt: "2026-01-02" },
  };
}

describe("serializeProject / parseProject round-trip", () => {
  it("re-parses a serialized document into an equal object", () => {
    const doc = validDoc();
    expect(parseProject(serializeProject(doc))).toEqual(doc);
  });

  it("pretty-prints with indentation", () => {
    expect(serializeProject(validDoc())).toContain("\n  ");
  });
});

describe("parseProject validation", () => {
  it("rejects malformed JSON", () => {
    expect(() => parseProject("{not json")).toThrow(ProjectFileError);
  });

  it("rejects a non-object payload", () => {
    expect(() => parseProject("42")).toThrow(/형식이 아닙니다/);
  });

  it("rejects a missing rootId / nodes / meta", () => {
    expect(() => parseProject(JSON.stringify({ rootId: "r", nodes: {} }))).toThrow(
      /구조가 올바르지 않습니다/,
    );
  });

  it("rejects a rootId that is absent from nodes", () => {
    const node = { type: "Layout", children: [] };
    const bad = { rootId: "ghost", nodes: { root: node }, meta: { name: "x" } };
    expect(() => parseProject(JSON.stringify(bad))).toThrow(/rootId/);
  });

  it("rejects a meta without a name", () => {
    const node = { type: "Layout", children: [] };
    const bad = { rootId: "root", nodes: { root: node }, meta: {} };
    expect(() => parseProject(JSON.stringify(bad))).toThrow(/meta\.name/);
  });

  it("rejects a node missing its type", () => {
    const bad = { rootId: "root", nodes: { root: { children: [] } }, meta: { name: "x" } };
    expect(() => parseProject(JSON.stringify(bad))).toThrow(/type/);
  });

  it("rejects a node whose children is not an array", () => {
    const bad = {
      rootId: "root",
      nodes: { root: { type: "Layout", children: {} } },
      meta: { name: "x" },
    };
    expect(() => parseProject(JSON.stringify(bad))).toThrow(/children/);
  });

  it("accepts a structurally valid document", () => {
    expect(() => parseProject(serializeProject(validDoc()))).not.toThrow();
  });
});

describe("prepareImport", () => {
  it("assigns a fresh id so an import cannot overwrite an existing project", () => {
    const doc = validDoc();
    const prepared = prepareImport(doc);
    expect(prepared.id).not.toBe(doc.id);
    expect(prepared.version).toBe(1);
  });

  it("keeps the node tree and name intact", () => {
    const doc = validDoc();
    const prepared = prepareImport(doc);
    expect(prepared.nodes).toEqual(doc.nodes);
    expect(prepared.meta.name).toBe("데모");
  });
});
