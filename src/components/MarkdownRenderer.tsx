import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Clipboard,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/src/theme/useTheme';

// ─── Types ────────────────────────────────────────────────────────────────────

type SegmentType = 'bold' | 'italic' | 'boldItalic' | 'inlineCode' | 'plain';

interface TextSegment {
  type: SegmentType;
  content: string;
}

type Align = 'left' | 'center' | 'right';

type BlockType =
  | 'h1' | 'h2' | 'h3' | 'h4'
  | 'paragraph'
  | 'codeBlock'
  | 'unorderedItem'
  | 'orderedItem'
  | 'table'
  | 'divider'
  | 'blank';

interface Block {
  type: BlockType;
  content: string;
  lang?: string;
  index?: number;
  // table-specific
  tableHeaders?: string[];
  tableAligns?: Align[];
  tableRows?: string[][];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Split a markdown table row like `| a | b | c |` → ['a','b','c'] */
function splitTableRow(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

/** Detect a separator row like `|---|:---:|---:|` */
function isSeparatorRow(line: string): boolean {
  return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line.trim());
}

/** Parse alignment from separator cell */
function parseAlign(cell: string): Align {
  const t = cell.trim();
  if (t.startsWith(':') && t.endsWith(':')) return 'center';
  if (t.endsWith(':')) return 'right';
  return 'left';
}

/** Detect any table row (has at least one `|`) */
function isTableRow(line: string): boolean {
  return line.trim().startsWith('|') || (line.includes('|') && !line.startsWith('#'));
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function parseMarkdown(md: string): Block[] {
  const lines = md.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Code block fence ──
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || 'plaintext';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // consume closing ```
      blocks.push({ type: 'codeBlock', content: codeLines.join('\n'), lang });
      continue;
    }

    // ── Headings ──
    const h4 = trimmed.match(/^####\s+(.*)/);
    const h3 = trimmed.match(/^###\s+(.*)/);
    const h2 = trimmed.match(/^##\s+(.*)/);
    const h1 = trimmed.match(/^#\s+(.*)/);
    if (h4) { blocks.push({ type: 'h4', content: h4[1] }); i++; continue; }
    if (h3) { blocks.push({ type: 'h3', content: h3[1] }); i++; continue; }
    if (h2) { blocks.push({ type: 'h2', content: h2[1] }); i++; continue; }
    if (h1) { blocks.push({ type: 'h1', content: h1[1] }); i++; continue; }

    // ── Horizontal rule ──
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'divider', content: '' });
      i++;
      continue;
    }

    // ── Table detection ──
    // A table block starts with a pipe-delimited row, then a separator row
    if (isTableRow(trimmed) && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      const headers = splitTableRow(trimmed);
      const sepCells = splitTableRow(lines[i + 1]);
      const aligns: Align[] = sepCells.map(parseAlign);
      i += 2; // skip header + separator

      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i].trim()) && !isSeparatorRow(lines[i])) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }

      blocks.push({
        type: 'table',
        content: '',
        tableHeaders: headers,
        tableAligns: aligns,
        tableRows: rows,
      });
      continue;
    }

    // ── Unordered list ──
    const ulMatch = trimmed.match(/^[-*+]\s+(.*)/);
    if (ulMatch) {
      blocks.push({ type: 'unorderedItem', content: ulMatch[1] });
      i++;
      continue;
    }

    // ── Ordered list ──
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (olMatch) {
      blocks.push({ type: 'orderedItem', content: olMatch[2], index: parseInt(olMatch[1]) });
      i++;
      continue;
    }

    // ── Blank line ──
    if (trimmed === '') {
      blocks.push({ type: 'blank', content: '' });
      i++;
      continue;
    }

    // ── Paragraph ──
    blocks.push({ type: 'paragraph', content: line });
    i++;
  }

  return blocks;
}

// ─── Inline text parser ───────────────────────────────────────────────────────

function parseInline(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'plain', content: text.slice(lastIndex, match.index) });
    }
    if (match[2] !== undefined) {
      segments.push({ type: 'boldItalic', content: match[2] });
    } else if (match[3] !== undefined) {
      segments.push({ type: 'bold', content: match[3] });
    } else if (match[4] !== undefined) {
      segments.push({ type: 'italic', content: match[4] });
    } else if (match[5] !== undefined) {
      segments.push({ type: 'inlineCode', content: match[5] });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'plain', content: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: 'plain', content: text }];
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ code, primaryColor }: { code: string; primaryColor: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <TouchableOpacity
      style={[styles.copyBtn, { borderColor: primaryColor + '55' }]}
      onPress={handleCopy}
      activeOpacity={0.7}
    >
      <Text style={[styles.copyBtnText, { color: copied ? primaryColor : '#8B93A7' }]}>
        {copied ? '✓ Copied' : 'Copy'}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Inline Styled Text ───────────────────────────────────────────────────────

function InlineText({
  text,
  baseStyle,
  inlineCodeBg,
  inlineCodeColor,
}: {
  text: string;
  baseStyle: any;
  inlineCodeBg: string;
  inlineCodeColor: string;
}) {
  const segments = parseInline(text);

  return (
    <Text style={baseStyle}>
      {segments.map((seg, idx) => {
        switch (seg.type) {
          case 'bold':
            return <Text key={idx} style={[baseStyle, styles.bold]}>{seg.content}</Text>;
          case 'italic':
            return <Text key={idx} style={[baseStyle, styles.italic]}>{seg.content}</Text>;
          case 'boldItalic':
            return <Text key={idx} style={[baseStyle, styles.bold, styles.italic]}>{seg.content}</Text>;
          case 'inlineCode':
            return (
              <Text key={idx} style={[styles.inlineCode, { backgroundColor: inlineCodeBg, color: inlineCodeColor }]}>
                {' '}{seg.content}{' '}
              </Text>
            );
          default:
            return <Text key={idx} style={baseStyle}>{seg.content}</Text>;
        }
      })}
    </Text>
  );
}

// ─── Table Component ──────────────────────────────────────────────────────────

function TableBlock({
  headers,
  aligns,
  rows,
  borderColor,
  headerBg,
  rowAltBg,
  textColor,
  primaryColor,
  inlineCodeBg,
  inlineCodeColor,
}: {
  headers: string[];
  aligns: Align[];
  rows: string[][];
  borderColor: string;
  headerBg: string;
  rowAltBg: string;
  textColor: string;
  primaryColor: string;
  inlineCodeBg: string;
  inlineCodeColor: string;
}) {
  const colCount = headers.length;

  const alignStyle = (col: number): 'left' | 'center' | 'right' => {
    return aligns[col] ?? 'left';
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
      <View style={[styles.table, { borderColor }]}>
        {/* Header row */}
        <View style={[styles.tableRow, styles.tableHeaderRow, { backgroundColor: headerBg, borderBottomColor: primaryColor + '60' }]}>
          {headers.map((cell, ci) => (
            <View
              key={ci}
              style={[
                styles.tableCell,
                styles.tableHeaderCell,
                {
                  borderColor,
                  borderRightWidth: ci < colCount - 1 ? 1 : 0,
                },
              ]}
            >
              <InlineText
                text={cell}
                baseStyle={[styles.tableHeaderText, { color: primaryColor, textAlign: alignStyle(ci) }]}
                inlineCodeBg={inlineCodeBg}
                inlineCodeColor={inlineCodeColor}
              />
            </View>
          ))}
        </View>

        {/* Data rows */}
        {rows.map((row, ri) => (
          <View
            key={ri}
            style={[
              styles.tableRow,
              {
                backgroundColor: ri % 2 === 1 ? rowAltBg : 'transparent',
                borderBottomColor: borderColor,
                borderBottomWidth: ri < rows.length - 1 ? 1 : 0,
              },
            ]}
          >
            {headers.map((_, ci) => (
              <View
                key={ci}
                style={[
                  styles.tableCell,
                  {
                    borderColor,
                    borderRightWidth: ci < colCount - 1 ? 1 : 0,
                  },
                ]}
              >
                <InlineText
                  text={row[ci] ?? ''}
                  baseStyle={[styles.tableCellText, { color: textColor, textAlign: alignStyle(ci) }]}
                  inlineCodeBg={inlineCodeBg}
                  inlineCodeColor={inlineCodeColor}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const c = useTheme();
  const blocks = parseMarkdown(content);

  const isDark = c.bg === '#0A0E1A';
  const inlineCodeBg = isDark ? '#0D1120' : '#E8ECF2';
  const inlineCodeColor = c.accent;
  const codeBg = isDark ? '#070C18' : '#F0F2F5';
  const codeHeaderBg = isDark ? '#0D1120' : '#E5E8ED';
  const tableHeaderBg = isDark ? 'rgba(79,142,247,0.1)' : 'rgba(59,124,245,0.08)';
  const tableRowAltBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)';

  return (
    <View style={styles.root}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'blank':
            return <View key={idx} style={styles.blankLine} />;

          case 'divider':
            return <View key={idx} style={[styles.divider, { backgroundColor: c.border }]} />;

          case 'h1':
            return <Text key={idx} style={[styles.h1, { color: c.text }]}>{block.content}</Text>;

          case 'h2':
            return (
              <View key={idx} style={[styles.h2Wrap, { borderBottomColor: c.border }]}>
                <InlineText
                  text={block.content}
                  baseStyle={[styles.h2, { color: c.text }]}
                  inlineCodeBg={inlineCodeBg}
                  inlineCodeColor={inlineCodeColor}
                />
              </View>
            );

          case 'h3':
            return (
              <InlineText
                key={idx}
                text={block.content}
                baseStyle={[styles.h3, { color: c.text }]}
                inlineCodeBg={inlineCodeBg}
                inlineCodeColor={inlineCodeColor}
              />
            );

          case 'h4':
            return (
              <InlineText
                key={idx}
                text={block.content}
                baseStyle={[styles.h4, { color: c.text }]}
                inlineCodeBg={inlineCodeBg}
                inlineCodeColor={inlineCodeColor}
              />
            );

          case 'unorderedItem':
            return (
              <View key={idx} style={styles.listItem}>
                <View style={[styles.bullet, { backgroundColor: c.primary }]} />
                <InlineText
                  text={block.content}
                  baseStyle={[styles.listText, { color: c.text }]}
                  inlineCodeBg={inlineCodeBg}
                  inlineCodeColor={inlineCodeColor}
                />
              </View>
            );

          case 'orderedItem':
            return (
              <View key={idx} style={styles.listItem}>
                <Text style={[styles.orderedNum, { color: c.primary }]}>{block.index}.</Text>
                <InlineText
                  text={block.content}
                  baseStyle={[styles.listText, { color: c.text }]}
                  inlineCodeBg={inlineCodeBg}
                  inlineCodeColor={inlineCodeColor}
                />
              </View>
            );

          case 'table':
            return (
              <Animated.View key={idx} entering={FadeIn.duration(300)} style={styles.tableWrap}>
                <TableBlock
                  headers={block.tableHeaders ?? []}
                  aligns={block.tableAligns ?? []}
                  rows={block.tableRows ?? []}
                  borderColor={c.border}
                  headerBg={tableHeaderBg}
                  rowAltBg={tableRowAltBg}
                  textColor={c.text}
                  primaryColor={c.primary}
                  inlineCodeBg={inlineCodeBg}
                  inlineCodeColor={inlineCodeColor}
                />
              </Animated.View>
            );

          case 'codeBlock':
            return (
              <Animated.View
                key={idx}
                entering={FadeIn.duration(300)}
                style={[styles.codeBlock, { backgroundColor: codeBg, borderColor: c.border }]}
              >
                <View style={[styles.codeHeader, { backgroundColor: codeHeaderBg }]}>
                  <Text style={[styles.codeLang, { color: c.accent }]}>
                    {block.lang || 'plaintext'}
                  </Text>
                  <CopyButton code={block.content} primaryColor={c.primary} />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.codeScroll}>
                  <Text style={[styles.codeText, { color: c.text }]} selectable>
                    {block.content}
                  </Text>
                </ScrollView>
              </Animated.View>
            );

          case 'paragraph':
          default:
            return (
              <InlineText
                key={idx}
                text={block.content}
                baseStyle={[styles.paragraph, { color: c.text }]}
                inlineCodeBg={inlineCodeBg}
                inlineCodeColor={inlineCodeColor}
              />
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'column' },

  blankLine: { height: 6 },
  divider: { height: 1, marginVertical: 12, borderRadius: 1 },

  // Headings
  h1: { fontSize: 22, fontWeight: '800', lineHeight: 30, marginBottom: 6, marginTop: 4, letterSpacing: 0.1 },
  h2Wrap: { borderBottomWidth: 1, marginBottom: 8, paddingBottom: 4, marginTop: 10 },
  h2: { fontSize: 19, fontWeight: '700', lineHeight: 27, letterSpacing: 0.1 },
  h3: { fontSize: 17, fontWeight: '700', lineHeight: 24, marginBottom: 4, marginTop: 8 },
  h4: { fontSize: 15, fontWeight: '700', lineHeight: 22, marginBottom: 2, marginTop: 6 },

  // Paragraph
  paragraph: { fontSize: 15, lineHeight: 24, marginBottom: 2 },

  // Inline styles
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  inlineCode: { fontFamily: 'monospace', fontSize: 13, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },

  // Lists
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, paddingRight: 4 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 9, marginRight: 10, flexShrink: 0 },
  orderedNum: { fontSize: 15, fontWeight: '600', marginRight: 8, lineHeight: 24, minWidth: 20 },
  listText: { fontSize: 15, lineHeight: 24, flex: 1 },

  // Table
  tableWrap: { marginVertical: 8 },
  tableScroll: { flexGrow: 0 },
  table: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    minWidth: '100%',
  },
  tableRow: { flexDirection: 'row' },
  tableHeaderRow: { borderBottomWidth: 2 },
  tableCell: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    minWidth: 80,
    justifyContent: 'center',
  },
  tableHeaderCell: {},
  tableHeaderText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  tableCellText: { fontSize: 13, lineHeight: 20 },

  // Code block
  codeBlock: { borderRadius: 12, borderWidth: 1, marginVertical: 8, overflow: 'hidden' },
  codeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8 },
  codeLang: { fontSize: 12, fontWeight: '600', fontFamily: 'monospace', textTransform: 'lowercase', letterSpacing: 0.5 },
  copyBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  copyBtnText: { fontSize: 12, fontWeight: '600' },
  codeScroll: { paddingHorizontal: 14, paddingVertical: 10 },
  codeText: { fontFamily: 'monospace', fontSize: 13, lineHeight: 20 },
});
