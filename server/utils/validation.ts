import type { H3Event } from 'h3';
import { getRouterParam } from 'h3';

export function getValidatedId(event: H3Event, param: string = 'id'): number | null {
  const id = Number(getRouterParam(event, param));
  return Number.isFinite(id) ? id : null;
}

export function getValidatedPage(query: Record<string, unknown>): number {
  return Math.max(1, Number(query.page ?? 1));
}

export function getValidatedLimit(query: Record<string, unknown>, maxLimit: number = 60): number {
  return Math.min(Number(query.limit ?? 24), maxLimit);
}

export function getValidatedCategoryId(query: Record<string, unknown>): number | null {
  const categoryId = Number(query.categoryId ?? NaN);
  return Number.isFinite(categoryId) ? categoryId : null;
}