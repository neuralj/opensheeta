import { execSync } from 'child_process';
import { findRepoRoot } from './repo.js';

export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  head_branch: string;
  head_sha: string;
  html_url: string;
  run_number: number;
  event: string;
}

export interface WorkflowJob {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string;
  completed_at: string | null;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  name: string;
  status: string;
  conclusion: string | null;
  number: number;
}

export interface CIStatus {
  runs: WorkflowRun[];
  latestStatus: 'passing' | 'failing' | 'pending' | 'unknown';
}

let ciCache: { result: CIStatus; timestamp: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 minute

function getGitHubRepoInfo(): { owner: string; repo: string } | null {
  try {
    const root = findRepoRoot();
    const remote = execSync('git remote get-url origin', { cwd: root, encoding: 'utf-8' }).trim();
    
    // Parse GitHub URL (supports both HTTPS and SSH)
    const match = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  } catch {
    // Ignore errors
  }
  return null;
}

export async function getCIStatus(): Promise<CIStatus> {
  // Check cache first
  if (ciCache && Date.now() - ciCache.timestamp < CACHE_TTL) {
    return ciCache.result;
  }

  const repoInfo = getGitHubRepoInfo();
  
  if (!repoInfo) {
    const result: CIStatus = {
      runs: [],
      latestStatus: 'unknown'
    };
    ciCache = { result, timestamp: Date.now() };
    return result;
  }

  try {
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'opensheeta-dashboard'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/actions/runs?per_page=10`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    const runs: WorkflowRun[] = data.workflow_runs.map((run: any) => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      created_at: run.created_at,
      updated_at: run.updated_at,
      head_branch: run.head_branch,
      head_sha: run.head_sha,
      html_url: run.html_url,
      run_number: run.run_number,
      event: run.event
    }));

    // Determine latest status
    const completedRuns = runs.filter(r => r.status === 'completed');
    let latestStatus: 'passing' | 'failing' | 'pending' | 'unknown' = 'unknown';
    
    if (runs.some(r => r.status === 'in_progress' || r.status === 'queued')) {
      latestStatus = 'pending';
    } else if (completedRuns.length > 0) {
      latestStatus = completedRuns[0].conclusion === 'success' ? 'passing' : 'failing';
    }

    const result: CIStatus = { runs, latestStatus };
    ciCache = { result, timestamp: Date.now() };
    return result;
  } catch (error) {
    console.error('Failed to fetch CI status:', error);
    const result: CIStatus = {
      runs: [],
      latestStatus: 'unknown'
    };
    ciCache = { result, timestamp: Date.now() };
    return result;
  }
}

export async function getWorkflowJobs(runId: number): Promise<WorkflowJob[]> {
  const repoInfo = getGitHubRepoInfo();
  
  if (!repoInfo) {
    return [];
  }

  try {
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'opensheeta-dashboard'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/actions/runs/${runId}/jobs`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    return data.jobs.map((job: any) => ({
      id: job.id,
      name: job.name,
      status: job.status,
      conclusion: job.conclusion,
      started_at: job.started_at,
      completed_at: job.completed_at,
      steps: job.steps.map((step: any) => ({
        name: step.name,
        status: step.status,
        conclusion: step.conclusion,
        number: step.number
      }))
    }));
  } catch (error) {
    console.error('Failed to fetch workflow jobs:', error);
    return [];
  }
}
