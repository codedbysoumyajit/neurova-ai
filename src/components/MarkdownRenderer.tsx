import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Clipboard,
  useWindowDimensions,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '@/src/theme/useTheme';

// ─── Types ────────────────────────────────────────────────────────────────────

type SegmentType = 'bold' | 'italic' | 'boldItalic' | 'inlineCode' | 'plain' | 'link';

interface TextSegment {
  type: SegmentType;
  content: string;
  href?: string;
}

type Align = 'left' | 'center' | 'right';

type BlockType =
  | 'h1' | 'h2' | 'h3' | 'h4'
  | 'paragraph'
  | 'codeBlock'
  | 'unorderedItem'
  | 'orderedItem'
  | 'table'
  | 'blockquote'
  | 'divider'
  | 'blank';

interface Block {
  type: BlockType;
  content: string;
  lang?: string;
  index?: number;
  indent?: number;
  tableHeaders?: string[];
  tableAligns?: Align[];
  tableRows?: string[][];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function splitTableRow(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function isSeparatorRow(line: string): boolean {
  return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(line.trim());
}

function parseAlign(cell: string): Align {
  const t = cell.trim();
  if (t.startsWith(':') && t.endsWith(':')) return 'center';
  if (t.endsWith(':')) return 'right';
  return 'left';
}

function isTableRow(line: string): boolean {
  return line.trim().startsWith('|');
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
      // Remove leading/trailing blank lines inside code block
      while (codeLines.length > 0 && codeLines[0].trim() === '') codeLines.shift();
      while (codeLines.length > 0 && codeLines[codeLines.length - 1].trim() === '') codeLines.pop();
      blocks.push({ type: 'codeBlock', content: codeLines.join('\n'), lang });
      continue;
    }

    // ── Blockquote ──
    if (trimmed.startsWith('> ')) {
      blocks.push({ type: 'blockquote', content: trimmed.slice(2) });
      i++;
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
    if (isTableRow(trimmed) && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      const headers = splitTableRow(trimmed);
      const sepCells = splitTableRow(lines[i + 1]);
      const aligns: Align[] = sepCells.map(parseAlign);
      i += 2;
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

    // ── Unordered list (supports -, *, +) ──
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)/);
    if (ulMatch) {
      const indent = Math.floor(ulMatch[1].length / 2);
      blocks.push({ type: 'unorderedItem', content: ulMatch[2], indent });
      i++;
      continue;
    }

    // ── Ordered list ──
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);
    if (olMatch) {
      const indent = Math.floor(olMatch[1].length / 2);
      blocks.push({ type: 'orderedItem', content: olMatch[3], index: parseInt(olMatch[2]), indent });
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
    blocks.push({ type: 'paragraph', content: trimmed });
    i++;
  }

  return blocks;
}

// ─── Inline text parser ───────────────────────────────────────────────────────

function parseInline(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  // Matches: links, bold+italic, bold, italic, inline code
  const regex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'plain', content: text.slice(lastIndex, match.index) });
    }
    if (match[2] !== undefined) {
      // Link
      segments.push({ type: 'link', content: match[2], href: match[3] });
    } else if (match[4] !== undefined) {
      segments.push({ type: 'boldItalic', content: match[4] });
    } else if (match[5] !== undefined) {
      segments.push({ type: 'bold', content: match[5] });
    } else if (match[6] !== undefined) {
      segments.push({ type: 'italic', content: match[6] });
    } else if (match[7] !== undefined) {
      segments.push({ type: 'inlineCode', content: match[7] });
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

  const handleCopy = useCallback(() => {
    Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

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
  primaryColor,
}: {
  text: string;
  baseStyle: any;
  inlineCodeBg: string;
  inlineCodeColor: string;
  primaryColor?: string;
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
                {seg.content}
              </Text>
            );
          case 'link':
            return (
              <Text key={idx} style={[baseStyle, { color: primaryColor ?? inlineCodeColor, textDecorationLine: 'underline' }]}>
                {seg.content}
              </Text>
            );
          default:
            return <Text key={idx} style={baseStyle}>{seg.content}</Text>;
        }
      })}
    </Text>
  );
}

// ─── Code Block Component ─────────────────────────────────────────────────────

function CodeBlock({
  lang,
  content,
  codeBg,
  codeHeaderBg,
  borderColor,
  accentColor,
  primaryColor,
  textColor,
}: {
  lang: string;
  content: string;
  codeBg: string;
  codeHeaderBg: string;
  borderColor: string;
  accentColor: string;
  primaryColor: string;
  textColor: string;
}) {
  return (
    <View style={[styles.codeBlock, { backgroundColor: codeBg, borderColor }]}>
      <View style={[styles.codeHeader, { backgroundColor: codeHeaderBg }]}>
        <Text style={[styles.codeLang, { color: accentColor }]}>{lang}</Text>
        <CopyButton code={content} primaryColor={primaryColor} />
      </View>
      {/* 
        Key fix: ScrollView here uses native React Native's ScrollView (not gesture handler).
        We use onStartShouldSetResponder to capture touch so parent TouchableOpacity 
        doesn't steal horizontal gestures.
      */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        bounces={false}
        style={styles.codeScroll}
        contentContainerStyle={styles.codeScrollContent}
      >
        <Text style={[styles.codeText, { color: textColor }]}>
          {content}
        </Text>
      </ScrollView>
    </View>
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
  const { width } = useWindowDimensions();
  const colCount = headers.length;
  // Calculate a sensible minimum column width
  const COL_MIN = Math.max(90, Math.floor((width * 0.72) / colCount));

  const alignStyle = (col: number): 'left' | 'center' | 'right' => aligns[col] ?? 'left';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      bounces={false}
      style={styles.tableScroll}
    >
      <View style={[styles.table, { borderColor }]}>
        {/* Header row */}
        <View style={[styles.tableRow, { backgroundColor: headerBg, borderBottomColor: primaryColor + '80', borderBottomWidth: 2 }]}>
          {headers.map((cell, ci) => (
            <View
              key={ci}
              style={[
                styles.tableCell,
                {
                  minWidth: COL_MIN,
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
                primaryColor={primaryColor}
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
                    minWidth: COL_MIN,
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
                  primaryColor={primaryColor}
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
  const inlineCodeBg = isDark ? '#1A2340' : '#E8ECF2';
  const inlineCodeColor = c.accent;
  const codeBg = isDark ? '#070C18' : '#F0F2F5';
  const codeHeaderBg = isDark ? '#0D1120' : '#E5E8ED';
  const tableHeaderBg = isDark ? 'rgba(79,142,247,0.12)' : 'rgba(59,124,245,0.08)';
  const tableRowAltBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)';
  const blockquoteBg = isDark ? 'rgba(79,142,247,0.07)' : 'rgba(59,124,245,0.06)';

  return (
    <View style={styles.root}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'blank':
            return <View key={idx} style={styles.blankLine} />;

          case 'divider':
            return <View key={idx} style={[styles.divider, { backgroundColor: c.border }]} />;

          case 'h1':
            return (
              <Text key={idx} style={[styles.h1, { color: c.text }]}>
                {block.content}
              </Text>
            );

          case 'h2':
            return (
              <View key={idx} style={[styles.h2Wrap, { borderBottomColor: c.border }]}>
                <InlineText
                  text={block.content}
                  baseStyle={[styles.h2, { color: c.text }]}
                  inlineCodeBg={inlineCodeBg}
                  inlineCodeColor={inlineCodeColor}
                  primaryColor={c.primary}
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
                primaryColor={c.primary}
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
                primaryColor={c.primary}
              />
            );

          case 'blockquote':
            return (
              <View key={idx} style={[styles.blockquote, { backgroundColor: blockquoteBg, borderLeftColor: c.primary }]}>
                <InlineText
                  text={block.content}
                  baseStyle={[styles.blockquoteText, { color: c.text }]}
                  inlineCodeBg={inlineCodeBg}
                  inlineCodeColor={inlineCodeColor}
                  primaryColor={c.primary}
                />
              </View>
            );

          case 'unorderedItem':
            return (
              <View key={idx} style={[styles.listItem, { paddingLeft: (block.indent ?? 0) * 16 }]}>
                <View style={[styles.bullet, { backgroundColor: c.primary }]} />
                <InlineText
                  text={block.content}
                  baseStyle={[styles.listText, { color: c.text }]}
                  inlineCodeBg={inlineCodeBg}
                  inlineCodeColor={inlineCodeColor}
                  primaryColor={c.primary}
                />
              </View>
            );

          case 'orderedItem':
            return (
              <View key={idx} style={[styles.listItem, { paddingLeft: (block.indent ?? 0) * 16 }]}>
                <Text style={[styles.orderedNum, { color: c.primary }]}>{block.index}.</Text>
                <InlineText
                  text={block.content}
                  baseStyle={[styles.listText, { color: c.text }]}
                  inlineCodeBg={inlineCodeBg}
                  inlineCodeColor={inlineCodeColor}
                  primaryColor={c.primary}
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
              <Animated.View key={idx} entering={FadeIn.duration(300)}>
                <CodeBlock
                  lang={block.lang || 'plaintext'}
                  content={block.content}
                  codeBg={codeBg}
                  codeHeaderBg={codeHeaderBg}
                  borderColor={c.border}
                  accentColor={c.accent}
                  primaryColor={c.primary}
                  textColor={c.text}
                />
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
                primaryColor={c.primary}
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
  h1: { fontSize: 22, fontWeight: '800', lineHeight: 30, marginBottom: 6, marginTop: 4 },
  h2Wrap: { borderBottomWidth: 1, marginBottom: 8, paddingBottom: 4, marginTop: 10 },
  h2: { fontSize: 19, fontWeight: '700', lineHeight: 27 },
  h3: { fontSize: 17, fontWeight: '700', lineHeight: 24, marginBottom: 4, marginTop: 8 },
  h4: { fontSize: 15, fontWeight: '700', lineHeight: 22, marginBottom: 2, marginTop: 6 },

  // Paragraph
  paragraph: { fontSize: 15, lineHeight: 24, marginBottom: 2 },

  // Inline styles
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  inlineCode: {
    fontFamily: 'monospace',
    fontSize: 13,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },

  // Blockquote
  blockquote: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 8,
    paddingRight: 8,
    borderRadius: 4,
    marginVertical: 6,
  },
  blockquoteText: { fontSize: 15, lineHeight: 22, fontStyle: 'italic' },

  // Lists
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 9, marginRight: 10, flexShrink: 0 },
  orderedNum: { fontSize: 15, fontWeight: '600', marginRight: 8, lineHeight: 24, minWidth: 22 },
  listText: { fontSize: 15, lineHeight: 24, flex: 1 },

  // Table
  tableWrap: { marginVertical: 8 },
  tableScroll: {},
  table: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableRow: { flexDirection: 'row' },
  tableCell: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  tableHeaderText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  tableCellText: { fontSize: 13, lineHeight: 20 },

  // Code block
  codeBlock: {
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
    overflow: 'hidden',
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  codeLang: { fontSize: 12, fontWeight: '600', fontFamily: 'monospace', letterSpacing: 0.5 },
  copyBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  copyBtnText: { fontSize: 12, fontWeight: '600' },
  codeScroll: {},
  codeScrollContent: { paddingHorizontal: 14, paddingVertical: 10 },
  codeText: { fontFamily: 'monospace', fontSize: 13, lineHeight: 20 },
});
