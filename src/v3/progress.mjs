export const V3_KEY = "js-lab-academy-v3";
export function readAcademy(raw) {
  try {
    const p = JSON.parse(raw || "{}");
    return {
      completed: Array.isArray(p?.completed)
        ? [
            ...new Set(
              p.completed.filter(
                (x) => typeof x === "string" && x.length < 120,
              ),
            ),
          ]
        : [],
      current:
        typeof p?.current === "string" && p.current.length < 80
          ? p.current
          : "zero",
      attempts:
        p?.attempts && typeof p.attempts === "object"
          ? Object.fromEntries(
              Object.entries(p.attempts).filter(
                ([k, v]) =>
                  k.length < 120 && Number.isInteger(v) && v >= 0 && v < 100000,
              ),
            )
          : {},
    };
  } catch {
    return { completed: [], current: "zero", attempts: {} };
  }
}
export function mergeAcademy(a, b) {
  return {
    completed: [...new Set([...a.completed, ...b.completed])],
    current: a.current,
    attempts: Object.fromEntries(
      [
        ...new Set([...Object.keys(a.attempts), ...Object.keys(b.attempts)]),
      ].map((k) => [k, Math.max(a.attempts[k] || 0, b.attempts[k] || 0)]),
    ),
  };
}
