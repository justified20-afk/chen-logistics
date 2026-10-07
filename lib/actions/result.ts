export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
      /** True when another operator changed the record first. */
      conflict?: boolean;
      /** Number to reload the caller with after a conflict. */
      currentVersion?: number;
    };

export function ok<T>(data?: T): ActionResult<T> {
  return { ok: true, data } as ActionResult<T>;
}

export function fail(
  error: string,
  extra: Partial<Extract<ActionResult<never>, { ok: false }>> = {},
): ActionResult<never> {
  return { ok: false, error, ...extra };
}

export const UNAUTHORIZED = "You do not have permission to perform this action.";
export const NOT_FOUND = "That record no longer exists.";
export const CONFLICT =
  "This record was changed by someone else while you were working. Reload to see the latest state.";
