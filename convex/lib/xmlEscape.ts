/**
 * XML injection prevention for pacs.009 batch generation.
 * Ported from supabase/migrations/*_fix_pacs009_xml_injection.sql xml_escape() helper.
 *
 * SECURITY: Every user-sourced value embedded in SWIFT XML output MUST pass through
 * xmlEscape() before concatenation. Failure to do so constitutes an XML injection
 * vulnerability in financial messaging.
 */

const XML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

/**
 * Escapes all five XML special characters in a string.
 * Safe to call on null/undefined — returns empty string.
 *
 * @example
 * xmlEscape('AT&T <Bank>') // → 'AT&amp;T &lt;Bank&gt;'
 */
export function xmlEscape(value: string | null | undefined): string {
  if (value == null) return '';
  return String(value).replace(/[&<>"']/g, (ch) => XML_ENTITY_MAP[ch] ?? ch);
}

/**
 * Wraps a value in an XML element with the given tag name.
 * Both tag and value are escaped — tag must be a safe constant in practice.
 */
export function xmlElement(tag: string, value: string | null | undefined): string {
  return `<${tag}>${xmlEscape(value)}</${tag}>`;
}
