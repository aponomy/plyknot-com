/**
 * Typed task queue with cost tracking.
 */

import type { Task, TaskType, TaskStatus, AgentRole } from './types.js';

let taskCounter = 0;

export function createTask(
  type: TaskType,
  agent_role: AgentRole,
  input: Record<string, unknown>,
  opts: {
    project_id: string;
    crack_id: string;
    round: number;
    cost_estimate_usd?: number;
    parent_task_id?: string;
  },
): Task {
  return {
    id: `task-${Date.now()}-${++taskCounter}`,
    type,
    status: 'queued',
    agent_role,
    input,
    cost_estimate_usd: opts.cost_estimate_usd ?? 0,
    project_id: opts.project_id,
    crack_id: opts.crack_id,
    round: opts.round,
    parent_task_id: opts.parent_task_id,
    created_at: new Date().toISOString(),
  };
}

export class TaskQueue {
  private tasks: Task[] = [];
  private totalCost = 0;

  enqueue(task: Task): void {
    this.tasks.push(task);
  }

  enqueueMany(tasks: Task[]): void {
    this.tasks.push(...tasks);
  }

  /** Get next queued task, optionally filtered by type */
  next(type?: TaskType): Task | undefined {
    const idx = this.tasks.findIndex(
      (t) => t.status === 'queued' && (!type || t.type === type),
    );
    if (idx === -1) return undefined;
    this.tasks[idx].status = 'running';
    return this.tasks[idx];
  }

  /** Get all queued tasks of a given type */
  pending(type?: TaskType): Task[] {
    return this.tasks.filter(
      (t) => t.status === 'queued' && (!type || t.type === type),
    );
  }

  /** Mark a task as completed */
  complete(taskId: string, output: Record<string, unknown>, cost_usd: number): void {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.status = 'completed';
    task.output = output;
    task.cost_actual_usd = cost_usd;
    task.completed_at = new Date().toISOString();
    this.totalCost += cost_usd;
  }

  /** Mark a task as failed */
  fail(taskId: string, error: string): void {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.status = 'failed';
    task.error = error;
    task.completed_at = new Date().toISOString();
  }

  /** Get total actual cost */
  getTotalCost(): number {
    return this.totalCost;
  }

  /** Get all tasks */
  all(): Task[] {
    return [...this.tasks];
  }

  /** Get tasks for a specific round */
  forRound(round: number): Task[] {
    return this.tasks.filter((t) => t.round === round);
  }

  /** Summary stats */
  stats(): { total: number; queued: number; running: number; completed: number; failed: number; cost_usd: number } {
    const byStatus = (s: TaskStatus) => this.tasks.filter((t) => t.status === s).length;
    return {
      total: this.tasks.length,
      queued: byStatus('queued'),
      running: byStatus('running'),
      completed: byStatus('completed'),
      failed: byStatus('failed'),
      cost_usd: this.totalCost,
    };
  }
}
