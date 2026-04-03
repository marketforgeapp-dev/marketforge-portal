import React from "react";

type Props = {
  markdown: string;
};

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern =
    /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null = null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      parts.push(
        <a
          key={`link-${key++}`}
          href={match[3]}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline"
        >
          {match[2]}
        </a>
      );
    } else if (match[4]) {
      parts.push(
        <strong key={`strong-${key++}`} className="font-semibold">
          {match[4]}
        </strong>
      );
    } else if (match[5]) {
      parts.push(
        <code
          key={`code-${key++}`}
          className="rounded bg-gray-100 px-1.5 py-0.5 text-sm text-gray-900"
        >
          {match[5]}
        </code>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function MarkdownDocument({ markdown }: Props) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];

  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={key++} className="mt-6 text-lg font-semibold text-gray-900">
          {line.replace(/^###\s+/, "")}
        </h3>
      );
      i += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={key++} className="mt-8 text-2xl font-bold text-gray-900">
          {line.replace(/^##\s+/, "")}
        </h2>
      );
      i += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={key++} className="text-3xl font-bold text-gray-900">
          {line.replace(/^#\s+/, "")}
        </h1>
      );
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];

      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }

      blocks.push(
        <ul key={key++} className="ml-6 list-disc space-y-2 text-gray-700">
          {items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];

      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }

      blocks.push(
        <ol key={key++} className="ml-6 list-decimal space-y-2 text-gray-700">
          {items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    const paragraphLines: string[] = [];

    while (i < lines.length) {
      const current = lines[i].trim();

      if (
        !current ||
        current.startsWith("# ") ||
        current.startsWith("## ") ||
        current.startsWith("### ") ||
        /^[-*]\s+/.test(current) ||
        /^\d+\.\s+/.test(current)
      ) {
        break;
      }

      paragraphLines.push(current);
      i += 1;
    }

    blocks.push(
      <p key={key++} className="text-base leading-7 text-gray-700">
        {renderInline(paragraphLines.join(" "))}
      </p>
    );
  }

  return <div className="space-y-4">{blocks}</div>;
}