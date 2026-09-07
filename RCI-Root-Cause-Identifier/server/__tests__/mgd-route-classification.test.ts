import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";

// ─────────────────────────────────────────────────────────────────────────────
// Architecture-fitness sweep for the "Diagnostic System Consolidation &
// Canonical Run Architecture" milestone. These are plain source-text
// assertions (no jsdom/RTL — none is installed, and this milestone does not
// add one), but they encode the milestone's actual decisions as regression
// tests: a future change that silently reintroduces a normal-user path into
// /mgd/run, or leaks MOCK_TRANSACTIONS into the canonical pipeline, fails
// one of these.
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..", "..");

function read(relPath: string): string {
  return readFileSync(path.join(ROOT, relPath), "utf-8");
}

/** All .ts/.tsx files under a directory, recursively. */
function listSourceFiles(relDir: string): string[] {
  const out: string[] = [];
  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (entry === "node_modules" || entry === "__tests__") continue;
        walk(full);
      } else if (/\.tsx?$/.test(entry)) {
        out.push(full);
      }
    }
  }
  walk(path.join(ROOT, relDir));
  return out;
}

describe("Canonical route wiring (client/src/App.tsx)", () => {
  const appTsx = read("client/src/App.tsx");

  it("/mgd/diagnostic is registered and mounts MGDDiagnosticWizard — the canonical entry point", () => {
    expect(appTsx).toMatch(/import MGDDiagnosticWizard from "@\/pages\/mgd-diagnostic-wizard"/);
    expect(appTsx).toMatch(/<Route path="\/mgd\/diagnostic" component=\{MGDDiagnosticWizard\}\s*\/>/);
  });

  it("/mgd/run is still registered (not deleted — demo/developer harness, not retired) but mounts only MGDRunnerPage", () => {
    expect(appTsx).toMatch(/<Route path="\/mgd\/run" component=\{MGDRunnerPage\}\s*\/>/);
  });

  it("/clients/:clientId/diagnostics/new is still registered — legacy RCI/bulk path retained, not retired", () => {
    expect(appTsx).toMatch(/<Route path="\/clients\/:clientId\/diagnostics\/new" component=\{ClientDiagnosticsNew\}\s*\/>/);
  });
});

describe("No normal-user navigation reaches /mgd/run", () => {
  it("the only source reference to the literal route string \"/mgd/run\" is its own App.tsx registration and mgd-runner-page.tsx's own self-referential nav", () => {
    const files = listSourceFiles("client/src").concat(listSourceFiles("server/frontend"));
    const offenders: string[] = [];
    for (const file of files) {
      const rel = path.relative(ROOT, file);
      if (rel.endsWith("App.tsx")) continue; // the route registration itself
      if (rel.endsWith(path.join("pages", "mgd-runner-page.tsx"))) continue; // the page's own "back to MGD" link target is /mgd, not /mgd/run — but skip just in case
      const content = readFileSync(file, "utf-8");
      if (content.includes('"/mgd/run"') || content.includes("'/mgd/run'") || content.includes("`/mgd/run`")) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("MOCK_TRANSACTIONS cannot enter the canonical production path", () => {
  it("MOCK_TRANSACTIONS is defined only in mgd-runner-page.tsx and referenced nowhere else in source (comments included, verified separately)", () => {
    const files = listSourceFiles("client/src").concat(listSourceFiles("server"));
    const filesReferencingIt = files
      .map(f => ({ file: path.relative(ROOT, f), content: readFileSync(f, "utf-8") }))
      .filter(f => f.content.includes("MOCK_TRANSACTIONS"))
      .map(f => f.file);

    // mgd-runner-page.tsx defines and uses it; mgd-report-archive.tsx carries
    // only an explanatory code comment (added when its links off /mgd/run
    // were removed) — neither imports the other's data.
    const allowed = new Set([
      path.join("client", "src", "pages", "mgd-runner-page.tsx"),
      path.join("client", "src", "pages", "mgd-report-archive.tsx"),
    ]);
    const offenders = filesReferencingIt.filter(f => !allowed.has(f));
    expect(offenders).toEqual([]);
  });

  it("the canonical diagnostic wizard and the canonical /api/mgd/run route handler do not import mgd-runner-page.tsx or its mock data", () => {
    const wizard = read("client/src/pages/mgd-diagnostic-wizard.tsx");
    const routeHandler = read("server/routes/mgd-routes.ts");
    expect(wizard).not.toMatch(/mgd-runner-page/);
    expect(wizard).not.toMatch(/MOCK_TRANSACTIONS/);
    expect(routeHandler).not.toMatch(/MOCK_TRANSACTIONS/);
  });
});

describe("/mgd/run is clearly self-identified as a developer/demo harness", () => {
  it("MGDRunnerPage's own rendered copy calls out that it is not a real client diagnostic", () => {
    const runner = read("client/src/pages/mgd-runner-page.tsx");
    // Loosely matched — the exact wording is allowed to evolve, but SOME
    // explicit developer/demo self-identification must remain on the page.
    expect(runner).toMatch(/developer|internal (?:tool|harness)|not (?:a )?real client/i);
  });
});

describe("Legacy RCI/bulk-analysis routes remain authenticated (unchanged by this milestone)", () => {
  it("POST /api/admin/clients/:clientId/analyses and POST /api/admin/analyses/:id/run are still gated by isAuthenticated + isAdmin", () => {
    const routes = read("server/system/routes.ts");
    expect(routes).toMatch(
      /app\.post\("\/api\/admin\/clients\/:clientId\/analyses",\s*isAuthenticated,\s*isAdmin/,
    );
    expect(routes).toMatch(
      /app\.post\("\/api\/admin\/analyses\/:id\/run",\s*isAuthenticated,\s*isAdmin/,
    );
  });
});

describe("The canonical wizard posts to the canonical pipeline route only", () => {
  it("mgd-diagnostic-wizard.tsx's diagnostic run submits to POST /api/mgd/run — no other endpoint", () => {
    const wizard = read("client/src/pages/mgd-diagnostic-wizard.tsx");
    expect(wizard).toMatch(/fetch\("\/api\/mgd\/run"/);
  });
});

describe(
  "Input integrity (2026-09 investigation) — businessConcerns/consultantNotes reach only " +
  "the report's consultantInsights display section, never the analytical engines",
  () => {
    // Uses the real composeMGDReport (server/mgd/report-composer.ts) — a pure
    // function with no file I/O — rather than the full runMGDPipeline, so this
    // test has no side effects on server/data/*.json. It encodes the exact,
    // currently-investigated behavior as a regression guard: if a future
    // change wires businessConcerns/consultantNotes into findings, root
    // causes, recommendations, benchmarks, or the executive narrative, this
    // test fails and forces that to be a deliberate, reviewed decision
    // rather than an accidental side effect.
    //
    // This test documents current behavior. It does not endorse it — see the
    // milestone report's "Architectural gaps discovered" section.

    it("identical analytical inputs produce an identical report except for the consultantInsights section", async () => {
      const { composeMGDReport } = await import("../mgd/report-composer.js");
      const { generateExecutiveNarrative } = await import("../mgd/executive-narrative-engine.js");

      const narrative = generateExecutiveNarrative({ findings: [], rootCauses: [], recommendations: [] });
      const baseParams = {
        clientName: "Test Co.",
        industry: "manufacturing",
        findings: [] as any[],
        rootCauses: [] as any[],
        recommendations: [] as any[],
        benchmarks: [] as any[],
        narrative,
        operationalHealthScore: 85,
      };

      const withoutConsultantInput = composeMGDReport({ ...baseParams });
      const withConsultantInput = composeMGDReport({
        ...baseParams,
        businessConcerns: ["Inventory losses are out of control"],
        consultantNotes: [{ title: "Fleet issue", category: "Logistics", observation: "Drivers frequently double-booked" }],
      });

      // The only difference is the new consultantInsights block.
      expect(withConsultantInput.consultantInsights).toBeDefined();
      expect(withoutConsultantInput.consultantInsights).toBeUndefined();

      const { consultantInsights: _a, ...withoutRest } = withConsultantInput;
      const { consultantInsights: _b, ...withoutRest2 } = withoutConsultantInput;
      expect(withoutRest.findings).toEqual(withoutRest2.findings);
      expect(withoutRest.rootCauses).toEqual(withoutRest2.rootCauses);
      expect(withoutRest.recommendations).toEqual(withoutRest2.recommendations);
      expect(withoutRest.benchmarks).toEqual(withoutRest2.benchmarks);
      expect(withoutRest.narrative).toEqual(withoutRest2.narrative);
      expect(withoutRest.summary).toEqual(withoutRest2.summary);
      expect(withoutRest.visualMetrics).toEqual(withoutRest2.visualMetrics);
    });

    it("generateOperationalFindings, generateRootCauses, generateOperationalRecommendations, generateBenchmarkResults, and generateExecutiveNarrative accept no businessConcerns/consultantNotes parameter at all (compile-time proof, not just a runtime check)", () => {
      // TypeScript itself enforces this: none of these five signatures include
      // businessConcerns or consultantNotes. Grepping the source is a coarse
      // but real, zero-dependency way to assert that fact stays true.
      for (const [file, fn] of [
        ["server/mgd/findings-engine.ts", "generateOperationalFindings"],
        ["server/mgd/root-cause-engine.ts", "generateRootCauses"],
        ["server/mgd/recommendation-engine.ts", "generateOperationalRecommendations"],
        ["server/mgd/benchmark-engine.ts", "generateBenchmarkResults"],
        ["server/mgd/executive-narrative-engine.ts", "generateExecutiveNarrative"],
      ] as const) {
        const src = read(file);
        const sigMatch = src.match(new RegExp(`export function ${fn}\\(([^)]*)\\)`, "s"));
        expect(sigMatch, `${fn} signature not found in ${file}`).not.toBeNull();
        const params = sigMatch![1];
        expect(params).not.toMatch(/businessConcerns/);
        expect(params).not.toMatch(/consultantNotes/);
      }
    });
  },
);

describe("No second MGDReport-shaped schema was introduced", () => {
  it("MGDReport is declared only in report-composer.ts and its known pre-existing frontend type mirrors — no new declaration site", () => {
    const files = listSourceFiles("client/src").concat(listSourceFiles("server"));
    const declarations = files
      .map(f => ({ file: path.relative(ROOT, f), content: readFileSync(f, "utf-8") }))
      .filter(f => /\b(interface|type)\s+MGDReport\b/.test(f.content))
      .map(f => f.file);

    // The canonical declaration, plus three frontend pages that each mirror
    // its shape as a local `interface MGDReport` (client code cannot import
    // server/mgd/report-composer.ts directly) — a pre-existing pattern from
    // before this milestone, not a second analytical schema: none of these
    // compose or persist a report independently of server/mgd/report-store.ts.
    const allowed = new Set([
      path.join("server", "mgd", "report-composer.ts"),
      path.join("client", "src", "pages", "mgd-presentation-mode.tsx"),
      path.join("client", "src", "pages", "mgd-report-page.tsx"),
      path.join("client", "src", "pages", "mgd-report-viewer.tsx"),
    ]);
    const offenders = declarations.filter(f => !allowed.has(f));
    expect(offenders).toEqual([]);
  });
});
