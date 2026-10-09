/** Encode dynamic plain-text values before inserting them into Email HTML. */
export function escapeEmailText(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });
}

/** Preserve merchant HTML, substituting customer data only into parsed text nodes. */
export function renderEmailTextTemplate(html: string, vars: Record<string, string>): string {
  const ranges: Array<{ start: number; end: number }> = [];
  const rawText = new Set(['script', 'style', 'xmp', 'iframe', 'noembed', 'noframes', 'noscript', 'plaintext']);
  function visit(node: DefaultTreeAdapterTypes.Node, blocked = false): void {
    if ('tagName' in node) {
      blocked ||= rawText.has(node.tagName) || node.namespaceURI !== 'http://www.w3.org/1999/xhtml';
    }
    if (node.nodeName === '#text' && !blocked && node.sourceCodeLocation) {
      ranges.push({ start: node.sourceCodeLocation.startOffset, end: node.sourceCodeLocation.endOffset });
    }
    if ('childNodes' in node) node.childNodes.forEach(child => visit(child, blocked));
    if ('content' in node) visit(node.content, blocked);
  }
  visit(parse(html, { sourceCodeLocationInfo: true }));
  return html.replace(/\{([a-zA-Z_]+)\}/g, (match, key: string, offset: number) => {
    if (!ranges.some(range => range.start <= offset && offset + match.length <= range.end)) {
      throw new Error('Email 模板變數僅可放在內文文字中。');
    }
    const value = Object.hasOwn(vars, key) && typeof vars[key] === 'string' ? vars[key] : '';
    return escapeEmailText(value);
  });
}
import { parse, type DefaultTreeAdapterTypes } from 'parse5';
