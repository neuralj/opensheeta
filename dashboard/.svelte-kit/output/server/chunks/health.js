import { t as findRepoRoot } from "./repo.js";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
//#region src/lib/server/health.ts
var healthCache = null;
var CACHE_TTL = 60 * 1e3;
function runTypecheck(root) {
	try {
		return {
			pass: true,
			errors: 0,
			output: execSync("npx tsc --noEmit 2>&1", {
				cwd: root,
				encoding: "utf-8",
				timeout: 3e4
			}).trim()
		};
	} catch (e) {
		const output = e.stdout || String(e);
		const errorMatches = output.match(/error TS/g);
		return {
			pass: false,
			errors: errorMatches ? errorMatches.length : 1,
			output: output.slice(0, 2e3)
		};
	}
}
function runTests(root) {
	try {
		const output = execSync("npx vitest run 2>&1", {
			cwd: root,
			encoding: "utf-8",
			timeout: 6e4
		});
		const totalMatch = output.match(/Tests\s+(\d+)\s+passed/);
		const passed = totalMatch ? parseInt(totalMatch[1]) : 0;
		return {
			pass: true,
			total: passed,
			passed,
			failed: 0,
			output: output.slice(0, 2e3)
		};
	} catch (e) {
		const output = e.stdout || String(e);
		const totalMatch = output.match(/Tests\s+(\d+)/);
		const passedMatch = output.match(/(\d+)\s+passed/);
		const failedMatch = output.match(/(\d+)\s+failed/);
		return {
			pass: false,
			total: totalMatch ? parseInt(totalMatch[1]) : 0,
			passed: passedMatch ? parseInt(passedMatch[1]) : 0,
			failed: failedMatch ? parseInt(failedMatch[1]) : 0,
			output: output.slice(0, 2e3)
		};
	}
}
function runBuild(root) {
	try {
		execSync("npm run build:backend 2>&1", {
			cwd: root,
			encoding: "utf-8",
			timeout: 6e4
		});
		return {
			pass: true,
			output: "Build succeeded"
		};
	} catch (e) {
		return {
			pass: false,
			output: (e.stdout || String(e)).slice(0, 2e3)
		};
	}
}
function analyzeComplexity(root) {
	const srcDir = join(root, "src");
	let totalLines = 0;
	let maxLines = 0;
	let filesOver300 = 0;
	let totalFiles = 0;
	function walk(dir) {
		try {
			const entries = readdirSync(dir);
			for (const entry of entries) {
				const full = join(dir, entry);
				try {
					const stat = statSync(full);
					if (stat.isDirectory() && entry !== "node_modules") walk(full);
					else if (stat.isFile() && entry.endsWith(".ts")) {
						const lines = readFileSync(full, "utf-8").split("\n").length;
						totalLines += lines;
						totalFiles++;
						if (lines > maxLines) maxLines = lines;
						if (lines > 300) filesOver300++;
					}
				} catch {}
			}
		} catch {}
	}
	walk(srcDir);
	return {
		avgLines: totalFiles > 0 ? Math.round(totalLines / totalFiles) : 0,
		maxLines,
		filesOver300,
		totalFiles
	};
}
function countDependencies(root) {
	try {
		const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
		return {
			total: Object.keys(pkg.dependencies || {}).length,
			devTotal: Object.keys(pkg.devDependencies || {}).length
		};
	} catch {
		return {
			total: 0,
			devTotal: 0
		};
	}
}
function analyzeHealth() {
	if (healthCache && Date.now() - healthCache.timestamp < CACHE_TTL) return healthCache.result;
	const root = findRepoRoot();
	const typecheck = runTypecheck(root);
	const tests = runTests(root);
	const build = runBuild(root);
	const complexity = analyzeComplexity(root);
	const dependencies = countDependencies(root);
	const dimensions = [];
	const typeScore = typecheck.pass ? 100 : Math.max(0, 100 - typecheck.errors * 10);
	dimensions.push({
		name: "Type Safety",
		score: typeScore,
		status: typecheck.pass ? "pass" : typecheck.errors <= 3 ? "warn" : "fail",
		detail: typecheck.pass ? "0 type errors" : `${typecheck.errors} type error(s)`
	});
	const testScore = tests.pass ? 100 : tests.total > 0 ? Math.round(tests.passed / tests.total * 100) : 0;
	dimensions.push({
		name: "Tests",
		score: testScore,
		status: tests.pass ? "pass" : tests.failed <= 2 ? "warn" : "fail",
		detail: `${tests.passed}/${tests.total} passed`
	});
	const buildScore = build.pass ? 100 : 0;
	dimensions.push({
		name: "Build",
		score: buildScore,
		status: build.pass ? "pass" : "fail",
		detail: build.pass ? "Build succeeds" : "Build fails"
	});
	const complexityScore = complexity.filesOver300 === 0 ? 100 : Math.max(0, 100 - complexity.filesOver300 * 15);
	dimensions.push({
		name: "Complexity",
		score: complexityScore,
		status: complexity.filesOver300 === 0 ? "pass" : complexity.filesOver300 <= 2 ? "warn" : "fail",
		detail: `avg ${complexity.avgLines} lines/file, ${complexity.filesOver300} files > 300 lines`
	});
	const depScore = dependencies.total < 15 ? 100 : dependencies.total < 25 ? 80 : 60;
	dimensions.push({
		name: "Dependencies",
		score: depScore,
		status: dependencies.total < 15 ? "pass" : "warn",
		detail: `${dependencies.total} runtime, ${dependencies.devTotal} dev`
	});
	const docsDir = join(root, "docs");
	let docCount = 0;
	try {
		docCount = readdirSync(docsDir).filter((f) => f.endsWith(".md")).length;
	} catch {}
	const docScore = docCount >= 3 ? 100 : docCount >= 1 ? 60 : 20;
	dimensions.push({
		name: "Documentation",
		score: docScore,
		status: docCount >= 3 ? "pass" : docCount >= 1 ? "warn" : "fail",
		detail: `${docCount} doc file(s)`
	});
	const orgScore = complexity.totalFiles > 20 ? 90 : complexity.totalFiles > 10 ? 70 : 50;
	dimensions.push({
		name: "Organization",
		score: orgScore,
		status: orgScore >= 80 ? "pass" : "warn",
		detail: `${complexity.totalFiles} source files`
	});
	const result = {
		score: Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length),
		dimensions,
		details: {
			typecheck,
			tests,
			build,
			dependencies,
			complexity
		}
	};
	healthCache = {
		result,
		timestamp: Date.now()
	};
	return result;
}
//#endregion
export { analyzeHealth as t };
