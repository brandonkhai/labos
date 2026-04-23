/**
 * Lightweight inline Markdown renderer — no external deps.
 * Handles: **bold**, *italic*, `code`, - bullet lists, 1. numbered lists, blank-line paragraphs.
 */

import React from 'react';
import { cn } from '@/src/lib/utils';

function parseInline(text: string): React.ReactNode[] {
  // Split on **bold**, *italic*, `code` — in that priority order
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4)
      return <strong key={i} className="font-semibold text-slate-900 dark:text-slate-100">{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2)
      return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2)
      return (
        <code key={i} className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[0.8em] font-mono">
          {part.slice(1, -1)}
        </code>
      );
    return part;
  });
}

export function Markdown({ children, className }: { children: string; className?: string }) {
  if (!children) return null;

  // Group lines into blocks separated by blank lines
  const rawLines = children.split('\n');
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of rawLines) {
    if (line.trim() === '') {
      if (current.length) { blocks.push(current); current = []; }
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);

  const elements: React.ReactNode[] = [];

  for (const block of blocks) {
    // Bullet list block
    if (block.every((l) => /^[-*•]\s+/.test(l))) {
      elements.push(
        <ul key={elements.length} className="space-y-1 my-0.5">
          {block.map((item, j) => (
            <li key={j} className="flex gap-2 items-start">
              <span className="text-brand-500 shrink-0 leading-relaxed">•</span>
              <span>{parseInline(item.replace(/^[-*•]\s+/, ''))}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Numbered list block
    if (block.every((l) => /^\d+[.)]\s+/.test(l))) {
      elements.push(
        <ol key={elements.length} className="space-y-1 my-0.5">
          {block.map((item, j) => (
            <li key={j} className="flex gap-2 items-start">
              <span className="text-slate-400 dark:text-slate-500 shrink-0 font-mono text-xs leading-relaxed pt-px">
                {j + 1}.
              </span>
              <span>{parseInline(item.replace(/^\d+[.)]\s+/, ''))}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Regular paragraph (join lines with spaces)
    elements.push(
      <p key={elements.length} className="leading-relaxed">
        {parseInline(block.join(' '))}
      </p>,
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {elements}
    </div>
  );
}
