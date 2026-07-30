import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { findRepoRoot } from '$lib/server/repo.js';

interface ServiceInfo {
	name: string;
	status: 'running' | 'stopped' | 'not_loaded';
	port: number;
	pid: number | null;
	logPath: string;
	logTail: string[];
}

function parsePlist(plistPath: string): { label: string; port: number; logPath: string } | null {
	try {
		const content = readFileSync(plistPath, 'utf-8');
		
		const labelMatch = content.match(/<key>Label<\/key>\s*<string>([^<]+)<\/string>/);
		if (!labelMatch) return null;
		const label = labelMatch[1];
		
		// Extract port from EnvironmentVariables
		const portMatch = content.match(/<key>(?:OS_)?PORT<\/key>\s*<string>(\d+)<\/string>/);
		const port = portMatch ? parseInt(portMatch[1]) : 0;
		
		// Extract log path
		const logMatch = content.match(/<key>StandardOutPath<\/key>\s*<string>([^<]+)<\/string>/);
		const logPath = logMatch ? logMatch[1] : '';
		
		return { label, port, logPath };
	} catch {
		return null;
	}
}

function getLaunchctlStatus(label: string): { running: boolean; pid: number | null } {
	try {
		const output = execSync(`launchctl list | grep "^${label}"`, { encoding: 'utf-8' });
		const parts = output.trim().split(/\s+/);
		if (parts.length >= 3) {
			const pid = parts[0] === '-' ? null : parseInt(parts[0]);
			return { running: pid !== null, pid };
		}
	} catch {
		// Service not found in launchctl
	}
	return { running: false, pid: null };
}

function readLogTail(logPath: string, lines: number = 30): string[] {
	if (!logPath || !existsSync(logPath)) return [];
	
	try {
		const content = readFileSync(logPath, 'utf-8');
		const allLines = content.split('\n');
		return allLines.slice(-lines).filter(l => l.trim());
	} catch {
		return [];
	}
}

export const GET: RequestHandler = async () => {
	const repoRoot = findRepoRoot();
	const scriptsDir = join(repoRoot, 'scripts');
	
	// Discover plist files
	const services: ServiceInfo[] = [];
	
	try {
		const files = execSync(`ls ${scriptsDir}/com.neuralj.*.plist 2>/dev/null || true`, { encoding: 'utf-8' });
		const plistFiles = files.trim().split('\n').filter(f => f);
		
		for (const plistPath of plistFiles) {
			const parsed = parsePlist(plistPath);
			if (!parsed) continue;
			
			// Extract service name from label
			const name = parsed.label.replace('com.neuralj.', '');
			
			// Get launchctl status
			const status = getLaunchctlStatus(parsed.label);
			
			// Read log tail
			const logTail = readLogTail(parsed.logPath);
			
			services.push({
				name,
				status: status.running ? 'running' : 'not_loaded',
				port: parsed.port,
				pid: status.pid,
				logPath: parsed.logPath,
				logTail
			});
		}
	} catch {
		// No plist files found
	}
	
	return json({ services });
};
