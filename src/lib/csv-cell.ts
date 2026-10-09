/** Neutralize spreadsheet formulas before quoting; numeric values stay numeric. */
export function csvEscape(value: unknown): string {
  let str = value == null ? '' : String(value)
  if (typeof value !== 'number' && /^[\s\u0000-\u001f\u007f]*[=+\-@]/u.test(str)) {
    str = `'${str}`
  }
  return /[,"\r\n\t]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}
