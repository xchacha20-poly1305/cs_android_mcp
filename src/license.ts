/** Compact license boilerplate in displayed source, without changing API data. */

export interface SourceLine {
  lineText: string;
  lineNumber: string;
}

const MIN_LICENSE_LENGTH = 400;
const LICENSE_FILE = /^(?:licen[cs]e|copying|unlicense)(?:[._-](?:txt|md|rst|mit|bsd|isc|lesser|lib|(?:apache|[al]?gpl|mpl)(?:[-_.]?v?\d+(?:\.\d+)*)?))?(?:\.(?:txt|md|rst))?$/i;
const HEADER_START = /^(?:copyright\b|\(c\)|licensed under\b|(?:the )?mit license\b|spdx-license-identifier:|permission\b|redistribution and use\b|this (?:program|library|file|software|source code form|is free and unencumbered software)\b)/i;
const GNU_HEADER_END = /(?:gnu\.org\/licenses\/?>\.?|USA\.?)$/i;

interface LicenseDefinition {
  name: string;
  title: RegExp;
  terms: readonly RegExp[];
  headerEnd: RegExp;
}

const LICENSES: readonly LicenseDefinition[] = [
  {
    name: 'Apache-2.0',
    title: /^apache license,? version 2\.0\b/i,
    terms: [/apache license,? version 2\.0/i, /you may not use this file except in compliance|terms and conditions for use, reproduction, and distribution/i],
    headerEnd: /limitations under the license\.$/i,
  },
  {
    name: 'MIT',
    title: /^(?:the )?mit license\b/i,
    terms: [/permission is hereby granted, free of charge, to any person obtaining a copy/i],
    headerEnd: /other dealings in the software\.$/i,
  },
  {
    name: 'BSD',
    title: /^bsd(?: [234]-clause)? license\b/i,
    terms: [/redistribution and use in source and binary forms,? with or without modification,? are permitted/i],
    headerEnd: /possibility of such damage\.$/i,
  },
  {
    name: 'ISC',
    title: /^isc license\b/i,
    terms: [/permission to use, copy, modify, and(?:\/or)? distribute this software for any purpose with or without fee/i],
    headerEnd: /use or performance of this software\.$/i,
  },
  ...(['GPL', 'LGPL', 'AGPL'] as const).map(name => {
    const modifier = name === 'LGPL' ? '(?:Lesser|Library) ' : name === 'AGPL' ? 'Affero ' : '';
    const title = `GNU ${modifier}General Public License`;
    return {
      name,
      title: new RegExp(`^${title}\\b`, 'i'),
      terms: [new RegExp(title, 'i'), /redistribute|terms and conditions|no warranty|copy and distribute verbatim copies of this license document/i],
      headerEnd: GNU_HEADER_END,
    };
  }),
  {
    name: 'MPL-2.0',
    title: /^mozilla public license(?:,? version|,? v\.?) 2\.0\b/i,
    terms: [/this source code form is subject to the terms of the mozilla public license, v\.? 2\.0|^mozilla public license version 2\.0/i],
    headerEnd: /mozilla\.org\/MPL\/2\.0\/\.?$/i,
  },
  {
    name: 'Unlicense',
    title: /^(?:the )?unlicense\b|^this is free and unencumbered software released into the public domain/i,
    terms: [/this is free and unencumbered software released into the public domain/i],
    headerEnd: /(?:unlicense\.org\/?>\.?|other dealings in the software\.)$/i,
  },
];

function identifyLicense(text: string, isComment: boolean): LicenseDefinition | undefined {
  if (text.length < MIN_LICENSE_LENGTH) return undefined;
  const matches = LICENSES.filter(license => license.terms.every(pattern => pattern.test(text)));
  if (!isComment) {
    // A license can discuss other licenses. Its own title takes precedence;
    // unknown titles and license inventories must not inherit a referenced name.
    const titled = matches.find(license => license.title.test(text));
    if (titled) return titled;
    if (!HEADER_START.test(text)) return undefined;
  }
  return matches.length === 1 ? matches[0] : undefined;
}

function omission(lines: readonly SourceLine[], isComment = false): SourceLine | undefined {
  const text = lines.map(({ lineText }) => lineText
    .trim()
    .replace(/^(?:\/\*+|\*+\/?|\/\/+|#+|<!--|-->)\s?/, '')
    .replace(/(?:\*\/|-->)$/, '')
  ).join(' ').replace(/\s+/g, ' ').trim();
  const license = identifyLicense(text, isComment);
  if (!license) return undefined;
  // Avoid discarding documentation that shares a comment with license terms.
  // Unknown or incomplete boilerplate stays visible rather than guessing its end.
  if (isComment && (!HEADER_START.test(text) || !license.headerEnd.test(text))) return undefined;

  const first = lines[0];
  const last = lines[lines.length - 1];
  const range = first.lineNumber === last.lineNumber
    ? first.lineNumber
    : `${first.lineNumber}-${last.lineNumber}`;

  return {
    lineNumber: first.lineNumber,
    lineText: `<ignore long ${license.name} license; lines ${range}>${last.lineText.endsWith('\r') ? '\r' : ''}`,
  };
}

/** Exclusive end of a whole-line comment, or undefined if code shares a line. */
function commentEnd(lines: readonly SourceLine[], start: number): number | undefined {
  const text = lines[start].lineText.trim();
  const close = text.startsWith('/*') ? '*/' : text.startsWith('<!--') ? '-->' : undefined;
  if (close) {
    for (let end = start; end < lines.length; end++) {
      const closing = lines[end].lineText.indexOf(close, end === start ? (close === '*/' ? 2 : 4) : 0);
      if (closing !== -1) {
        return lines[end].lineText.slice(closing + close.length).trim() === '' ? end + 1 : undefined;
      }
    }
    // A search snippet may end partway through a license header.
    return lines.length;
  }

  const prefix = text.startsWith('//') ? /^\s*\/\// : text.startsWith('#') ? /^\s*#/ : undefined;
  if (prefix) {
    let end = start + 1;
    while (end < lines.length && prefix.test(lines[end].lineText)) end++;
    return end;
  }

  // Search snippets can start inside a C-style header, without its opening /*.
  if (start === 0 && Number(lines[start].lineNumber) > 1 && /^\*(?!\/)/.test(text)) {
    let end = start;
    while (end < lines.length && /^\s*\*/.test(lines[end].lineText)) {
      const closing = lines[end].lineText.indexOf('*/');
      if (closing !== -1) {
        return lines[end].lineText.slice(closing + 2).trim() === '' ? end + 1 : undefined;
      }
      end++;
    }
    return end;
  }
  return undefined;
}

function compactContiguousLines(lines: readonly SourceLine[], path: string): SourceLine[] {
  const basename = path.split('/').pop() || '';
  if (LICENSE_FILE.test(basename)) {
    const start = lines.findIndex(line => line.lineText.trim() !== '');
    if (start === -1) return [...lines];
    let end = lines.length;
    while (end > start && lines[end - 1].lineText.trim() === '') end--;
    const replacement = omission(lines.slice(start, end));
    if (replacement) return [...lines.slice(0, start), replacement, ...lines.slice(end)];
    return [...lines];
  }

  const result: SourceLine[] = [];
  let start = 0;
  // Only inspect the preamble. Stopping at code also protects multiline strings
  // containing examples of licenses or comment syntax.
  while (start < lines.length) {
    const text = lines[start].lineText.trim();
    if (!text || (lines[start].lineNumber === '1' && text.startsWith('#!')) || /^<\?xml\b.*\?>$/.test(text)) {
      result.push(lines[start++]);
      continue;
    }
    const end = commentEnd(lines, start);
    if (end === undefined) break;
    const comment = lines.slice(start, end);
    const replacement = omission(comment, true);
    if (replacement) result.push(replacement);
    else for (const line of comment) result.push(line);
    start = end;
  }
  return [...result, ...lines.slice(start)];
}

/** Preserve original line numbers, including across gaps in search snippets. */
export function compactLicenseLines(
  lines: readonly SourceLine[],
  path: string,
  includeLicense = false
): SourceLine[] {
  if (includeLicense) return [...lines];

  const result: SourceLine[] = [];
  let start = 0;
  while (start < lines.length) {
    let end = start + 1;
    while (end < lines.length && Number(lines[end].lineNumber) === Number(lines[end - 1].lineNumber) + 1) end++;
    for (const line of compactContiguousLines(lines.slice(start, end), path)) result.push(line);
    start = end;
  }
  return result;
}

export function compactLicenses(content: string, path: string, includeLicense = false): string {
  if (includeLicense) return content;
  const lines = content.split('\n').map((lineText, index) => ({ lineText, lineNumber: String(index + 1) }));
  const compacted = compactLicenseLines(lines, path).map(line => line.lineText).join('\n');
  // A byte-order mark belongs to the file, rather than to its license header.
  return content.startsWith('\uFEFF') && !compacted.startsWith('\uFEFF') ? `\uFEFF${compacted}` : compacted;
}
