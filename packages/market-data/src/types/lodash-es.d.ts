declare module 'lodash-es' {
  export function groupBy<T>(collection: T[], iteratee: (value: T) => unknown): Record<string, T[]>
  export function sortBy<T>(collection: T[], iteratees: ((value: T) => unknown)[]): T[]
  export function sortBy<T>(collection: T[], iteratee: (value: T) => unknown): T[]
}
