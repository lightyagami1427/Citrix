'use client';

import React, { useState, useMemo } from 'react';
import { Message } from '@/types';

interface ChatMessageProps {
  message: Message;
  onRegenerate?: () => void;
}

/**
 * Parse the AI response into structured sections.
 * Looks for 🔍, 🛠️, 🔗 headers.
 */
function parseResponse(content: string) {
  const sections: { type: string; header: string; content: string }[] = [];

  // Split by emoji headers
  const parts = content.split(/(?=🔍|🛠️|🔗)/);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('🔍')) {
      const lines = trimmed.split('\n');
      sections.push({
        type: 'root-cause',
        header: lines[0].replace('🔍', '').trim(),
        content: lines.slice(1).join('\n').trim(),
      });
    } else if (trimmed.startsWith('🛠️')) {
      const lines = trimmed.split('\n');
      sections.push({
        type: 'action-plan',
        header: lines[0].replace('🛠️', '').trim(),
        content: lines.slice(1).join('\n').trim(),
      });
    } else if (trimmed.startsWith('🔗')) {
      const lines = trimmed.split('\n');
      sections.push({
        type: 'sources',
        header: lines[0].replace('🔗', '').trim(),
        content: lines.slice(1).join('\n').trim(),
      });
    } else {
      // Unstructured content
      sections.push({
        type: 'text',
        header: '',
        content: trimmed,
      });
    }
  }

  return sections;
}

/**
 * Represents a parsed block of markdown content.
 */
interface Block {
  type: 'paragraph' | 'ordered-list' | 'unordered-list' | 'code-block';
  items?: { main: string; sub: string[] }[]; // for lists
  content?: string; // for paragraphs and code blocks
  language?: string; // for code blocks
}

/**
 * Parse markdown content into structured blocks.
 * Handles code blocks, ordered lists with sub-items, unordered lists, and paragraphs.
 */
function parseBlocks(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Code block (``` ... ```)
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({
        type: 'code-block',
        content: codeLines.join('\n'),
        language,
      });
      continue;
    }

    // Ordered list item (1. or 1) )
    if (/^\d+[\.\)]\s/.test(trimmed)) {
      const items: { main: string; sub: string[] }[] = [];

      while (i < lines.length) {
        const currentLine = lines[i];
        const currentTrimmed = currentLine.trim();

        if (!currentTrimmed) {
          // Empty line might end the list or just be spacing
          // Peek ahead to see if the list continues
          const nextNonEmpty = lines.slice(i + 1).find((l) => l.trim());
          if (nextNonEmpty && /^\d+[\.\)]\s/.test(nextNonEmpty.trim())) {
            i++;
            continue;
          }
          break;
        }

        // New numbered item
        if (/^\d+[\.\)]\s/.test(currentTrimmed)) {
          const mainText = currentTrimmed.replace(/^\d+[\.\)]\s*/, '');
          items.push({ main: mainText, sub: [] });
          i++;

          // Collect sub-items (indented lines, bullets, or continuation text)
          while (i < lines.length) {
            const subLine = lines[i];
            const subTrimmed = subLine.trim();

            if (!subTrimmed) {
              // Check if next line is still a sub-item or a new number
              const nextLine = lines[i + 1]?.trim();
              if (
                nextLine &&
                !(/^\d+[\.\)]\s/.test(nextLine)) &&
                (nextLine.startsWith('-') ||
                  nextLine.startsWith('•') ||
                  nextLine.startsWith('*') ||
                  nextLine.startsWith('```') ||
                  /^\s/.test(lines[i + 1] || ''))
              ) {
                i++;
                continue;
              }
              break;
            }

            // If it's a new top-level numbered item, stop collecting sub-items
            if (/^\d+[\.\)]\s/.test(subTrimmed)) {
              break;
            }

            // Sub-item code block
            if (subTrimmed.startsWith('```')) {
              const lang = subTrimmed.slice(3).trim();
              const codeLines: string[] = [];
              i++;
              while (
                i < lines.length &&
                !lines[i].trim().startsWith('```')
              ) {
                codeLines.push(lines[i]);
                i++;
              }
              i++; // skip closing ```
              const codeContent = codeLines.join('\n');
              items[items.length - 1].sub.push(
                `\`\`\`${lang}\n${codeContent}\n\`\`\``
              );
              continue;
            }

            // Sub-bullet or indented continuation
            items[items.length - 1].sub.push(subTrimmed);
            i++;
          }
        } else {
          // Non-numbered line after the list — stop
          break;
        }
      }

      blocks.push({ type: 'ordered-list', items });
      continue;
    }

    // Unordered list item (- or • or *)
    if (/^[-•*]\s/.test(trimmed)) {
      const items: { main: string; sub: string[] }[] = [];

      while (i < lines.length) {
        const currentTrimmed = lines[i].trim();

        if (!currentTrimmed) {
          i++;
          continue;
        }

        if (/^[-•*]\s/.test(currentTrimmed)) {
          items.push({
            main: currentTrimmed.replace(/^[-•*]\s*/, ''),
            sub: [],
          });
          i++;

          // Collect indented sub-items
          while (i < lines.length) {
            const subLine = lines[i];
            const subTrimmed = subLine.trim();

            if (!subTrimmed || /^[-•*]\s/.test(subTrimmed) || /^\d+[\.\)]\s/.test(subTrimmed)) {
              break;
            }

            // Indented or continuation
            if (/^\s{2,}/.test(subLine) || subTrimmed.startsWith('```')) {
              if (subTrimmed.startsWith('```')) {
                const lang = subTrimmed.slice(3).trim();
                const codeLines: string[] = [];
                i++;
                while (i < lines.length && !lines[i].trim().startsWith('```')) {
                  codeLines.push(lines[i]);
                  i++;
                }
                i++;
                items[items.length - 1].sub.push(
                  `\`\`\`${lang}\n${codeLines.join('\n')}\n\`\`\``
                );
                continue;
              }
              items[items.length - 1].sub.push(subTrimmed);
              i++;
            } else {
              break;
            }
          }
        } else {
          break;
        }
      }

      blocks.push({ type: 'unordered-list', items });
      continue;
    }

    // Paragraph (anything else)
    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const pTrimmed = lines[i].trim();
      if (
        !pTrimmed ||
        pTrimmed.startsWith('```') ||
        /^\d+[\.\)]\s/.test(pTrimmed) ||
        /^[-•*]\s/.test(pTrimmed)
      ) {
        break;
      }
      paragraphLines.push(pTrimmed);
      i++;
    }
    if (paragraphLines.length > 0) {
      blocks.push({ type: 'paragraph', content: paragraphLines.join(' ') });
    }
  }

  return blocks;
}

/**
 * Render markdown content to JSX using block-aware parsing.
 */
function renderContent(content: string, type: string) {
  if (type === 'sources') {
    return renderSources(content);
  }

  const blocks = parseBlocks(content);

  return (
    <div>
      {blocks.map((block, blockIdx) => {
        switch (block.type) {
          case 'code-block':
            return (
              <pre key={blockIdx}>
                <code>{block.content}</code>
              </pre>
            );

          case 'ordered-list':
            return (
              <ol key={blockIdx}>
                {block.items?.map((item, itemIdx) => (
                  <li key={itemIdx}>
                    {renderInlineFormatting(item.main)}
                    {item.sub.length > 0 && (
                      <div style={{ marginTop: '6px' }}>
                        {item.sub.map((subItem, subIdx) => {
                          // Embedded code block inside a list item
                          if (subItem.startsWith('```')) {
                            const codeLines = subItem.split('\n');
                            const codeContent = codeLines.slice(1, -1).join('\n');
                            return (
                              <pre key={subIdx}>
                                <code>{codeContent}</code>
                              </pre>
                            );
                          }
                          // Sub-bullet
                          if (/^[-•*]\s/.test(subItem)) {
                            return (
                              <div
                                key={subIdx}
                                style={{
                                  paddingLeft: '16px',
                                  marginBottom: '4px',
                                  color: 'var(--text-secondary)',
                                  fontSize: '13px',
                                }}
                              >
                                <span style={{ color: 'var(--accent)', marginRight: '8px' }}>›</span>
                                {renderInlineFormatting(subItem.replace(/^[-•*]\s*/, ''))}
                              </div>
                            );
                          }
                          // Plain continuation text
                          return (
                            <div
                              key={subIdx}
                              style={{
                                marginBottom: '4px',
                                color: 'var(--text-secondary)',
                                fontSize: '13px',
                              }}
                            >
                              {renderInlineFormatting(subItem)}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            );

          case 'unordered-list':
            return (
              <ul key={blockIdx}>
                {block.items?.map((item, itemIdx) => (
                  <li key={itemIdx}>
                    {renderInlineFormatting(item.main)}
                    {item.sub.length > 0 && (
                      <div style={{ marginTop: '4px' }}>
                        {item.sub.map((subItem, subIdx) => {
                          if (subItem.startsWith('```')) {
                            const codeLines = subItem.split('\n');
                            const codeContent = codeLines.slice(1, -1).join('\n');
                            return (
                              <pre key={subIdx}>
                                <code>{codeContent}</code>
                              </pre>
                            );
                          }
                          return (
                            <div
                              key={subIdx}
                              style={{
                                paddingLeft: '12px',
                                marginBottom: '3px',
                                color: 'var(--text-secondary)',
                                fontSize: '13px',
                              }}
                            >
                              {renderInlineFormatting(subItem)}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            );

          case 'paragraph':
          default:
            return (
              <p key={blockIdx} style={{ marginBottom: '8px' }}>
                {renderInlineFormatting(block.content || '')}
              </p>
            );
        }
      })}
    </div>
  );
}

/**
 * Render sources section with clickable links.
 */
function renderSources(content: string) {
  const lines = content.split('\n').filter((l) => l.trim());

  return (
    <div>
      {lines.map((line, i) => {
        const urlMatch = line.match(/https?:\/\/[^\s)>\]]+/);
        const cleanLine = line
          .replace(/^[-•*]\s*/, '')
          .replace(/^\d+[\.\)]\s*/, '')
          .trim();

        if (urlMatch) {
          // Extract display text: remove the URL itself for cleaner display
          const displayText =
            cleanLine
              .replace(/\[([^\]]+)\]\([^)]+\)/, '$1')
              .replace(/https?:\/\/[^\s)>\]]+/, '')
              .replace(/[()]/g, '')
              .trim() || urlMatch[0];

          return (
            <a
              key={i}
              href={urlMatch[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="source-link"
            >
              <span className="source-link__icon">🔗</span>
              <span className="source-link__url">{displayText}</span>
            </a>
          );
        }

        if (cleanLine) {
          return (
            <div key={i} className="source-link">
              <span className="source-link__icon">📄</span>
              <span className="source-link__url">{cleanLine}</span>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

/**
 * Render inline formatting: bold, italic, code, links, bare URLs.
 */
function renderInlineFormatting(text: string): React.ReactNode {
  const parts: (string | React.ReactNode)[] = [];
  let remaining = text;
  let keyCounter = 0;

  // Safety limit to prevent infinite loops
  let iterations = 0;
  const MAX_ITERATIONS = 200;

  while (remaining.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;

    // Find the earliest match among all inline patterns
    const patterns: { type: string; match: RegExpMatchArray }[] = [];

    const codeMatch = remaining.match(/`([^`]+)`/);
    if (codeMatch) patterns.push({ type: 'code', match: codeMatch });

    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    if (boldMatch) patterns.push({ type: 'bold', match: boldMatch });

    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) patterns.push({ type: 'link', match: linkMatch });

    const urlMatch = remaining.match(/(https?:\/\/[^\s)>\]]+)/);
    if (urlMatch) patterns.push({ type: 'url', match: urlMatch });

    if (patterns.length === 0) {
      parts.push(remaining);
      break;
    }

    // Sort by position (earliest first)
    patterns.sort((a, b) => (a.match.index || 0) - (b.match.index || 0));

    const first = patterns[0];
    const idx = first.match.index || 0;

    // Text before the match
    if (idx > 0) {
      parts.push(remaining.substring(0, idx));
    }

    const k = keyCounter++;

    switch (first.type) {
      case 'code':
        parts.push(<code key={`c${k}`}>{first.match[1]}</code>);
        break;
      case 'bold':
        parts.push(<strong key={`b${k}`}>{first.match[1]}</strong>);
        break;
      case 'link':
        parts.push(
          <a key={`l${k}`} href={first.match[2]} target="_blank" rel="noopener noreferrer">
            {first.match[1]}
          </a>
        );
        break;
      case 'url':
        parts.push(
          <a key={`u${k}`} href={first.match[1]} target="_blank" rel="noopener noreferrer">
            {first.match[1]}
          </a>
        );
        break;
    }

    remaining = remaining.substring(idx + first.match[0].length);
  }

  return <>{parts}</>;
}

export default function ChatMessage({
  message,
  onRegenerate,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);

  const sections = useMemo(
    () =>
      message.role === 'assistant' && !message.isError
        ? parseResponse(message.content)
        : [],
    [message.content, message.role, message.isError]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = message.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (message.role === 'user') {
    return (
      <div className="message message--user" id={`message-${message.id}`}>
        <div className="message__content">
          <div className="message__bubble message__bubble--user">
            {message.content}
          </div>
        </div>
        <div className="message__avatar message__avatar--user">👤</div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="message message--assistant" id={`message-${message.id}`}>
      <div className="message__avatar message__avatar--assistant">🛡️</div>
      <div className="message__content">
        <div
          className={`message__bubble message__bubble--assistant ${
            message.isError ? 'message__bubble--error' : ''
          }`}
        >
          {message.isError ? (
            <div>{message.content}</div>
          ) : sections.length > 0 ? (
            <>
              {sections.map((section, i) => (
                <div key={i} className="response-section">
                  {section.header && (
                    <div className="response-section__header">
                      {section.type === 'root-cause' && '🔍'}
                      {section.type === 'action-plan' && '🛠️'}
                      {section.type === 'sources' && '🔗'}
                      {section.type === 'text' && '📝'}
                      {section.header}
                    </div>
                  )}
                  <div className="response-section__content">
                    {renderContent(section.content, section.type)}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div>{message.content}</div>
          )}
        </div>

        {!message.isError && (
          <div className="message__actions">
            <button
              className={`action-btn ${copied ? 'action-btn--copied' : ''}`}
              onClick={handleCopy}
              id={`copy-btn-${message.id}`}
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
            {onRegenerate && (
              <button
                className="action-btn"
                onClick={onRegenerate}
                id={`regenerate-btn-${message.id}`}
              >
                🔄 Regenerate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
