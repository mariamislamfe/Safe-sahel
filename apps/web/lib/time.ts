/** Current time for server-rendered status math (kept out of component bodies for the React compiler). */
export function nowMs(): number {
  return Date.now();
}
