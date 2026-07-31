import * as Linking from 'expo-linking';
import { Text, View } from 'react-native';

// GitHub release bodies are markdown ("## What's Changed", "* feat(x): ..."),
// and dumping them raw into a <Text> shows the syntax. This renders the small
// subset that actually appears in release notes - headings, bullets, bold,
// inline code, links - without pulling in a markdown dependency.

type InlineToken = { text: string; bold?: boolean; code?: boolean; url?: string };

type Block =
  | { kind: 'heading'; tokens: InlineToken[] }
  | { kind: 'bullet'; tokens: InlineToken[] }
  | { kind: 'paragraph'; tokens: InlineToken[] };

const INLINE_PATTERN = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|(https?:\/\/\S+)/g;

export function parseInline(raw: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;

  for (const match of raw.matchAll(INLINE_PATTERN)) {
    const [full, linkText, linkUrl, boldStar, boldUnderscore, code, bareUrl] = match;
    const start = match.index ?? 0;
    if (start > cursor) tokens.push({ text: raw.slice(cursor, start) });

    if (linkText) tokens.push({ text: linkText, url: linkUrl });
    else if (boldStar || boldUnderscore) tokens.push({ text: boldStar ?? boldUnderscore, bold: true });
    else if (code) tokens.push({ text: code, code: true });
    else if (bareUrl) tokens.push({ text: shortenUrl(bareUrl), url: bareUrl });

    cursor = start + full.length;
  }

  if (cursor < raw.length) tokens.push({ text: raw.slice(cursor) });
  return tokens.filter((token) => token.text.length > 0);
}

/** `https://github.com/owner/repo/pull/1` -> `github.com/owner/repo/pull/1`. */
function shortenUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function parseMarkdown(body: string, maxBlocks = 14): Block[] {
  const blocks: Block[] = [];

  for (const line of body.split(/\r?\n/)) {
    if (blocks.length >= maxBlocks) break;

    const trimmed = line.trim();
    if (!trimmed || /^([-*_])\1{2,}$/.test(trimmed)) continue; // blank line or horizontal rule

    const heading = /^#{1,6}\s+(.*)$/.exec(trimmed);
    if (heading) {
      blocks.push({ kind: 'heading', tokens: parseInline(heading[1]) });
      continue;
    }

    const bullet = /^(?:[-*+]|\d+\.)\s+(.*)$/.exec(trimmed);
    if (bullet) {
      blocks.push({ kind: 'bullet', tokens: parseInline(bullet[1]) });
      continue;
    }

    blocks.push({ kind: 'paragraph', tokens: parseInline(trimmed) });
  }

  return blocks;
}

// Tokens deliberately set no colour of their own (links aside) - nested Text
// inherits from the block wrapper, so a heading stays heading-coloured.
function Inline({ tokens }: { tokens: InlineToken[] }) {
  return (
    <>
      {tokens.map((token, index) => {
        if (token.url) {
          return (
            <Text key={index} style={{ color: 'hsl(217 91% 60%)' }} onPress={() => void Linking.openURL(token.url!)}>
              {token.text}
            </Text>
          );
        }
        if (token.code) {
          return (
            <Text key={index} style={{ fontFamily: 'monospace' }}>
              {token.text}
            </Text>
          );
        }
        if (token.bold) {
          return (
            <Text key={index} className="font-semibold">
              {token.text}
            </Text>
          );
        }
        return <Text key={index}>{token.text}</Text>;
      })}
    </>
  );
}

export function ReleaseNotes({ body }: { body: string }) {
  const blocks = parseMarkdown(body);
  if (!blocks.length) return null;

  return (
    <View className="gap-1.5">
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          return (
            <Text key={index} className="pt-1 text-sm font-bold text-card-foreground">
              <Inline tokens={block.tokens} />
            </Text>
          );
        }
        if (block.kind === 'bullet') {
          return (
            <View key={index} className="flex-row gap-2 pl-1">
              <Text className="text-sm text-muted-foreground">•</Text>
              <Text className="flex-1 text-sm text-muted-foreground">
                <Inline tokens={block.tokens} />
              </Text>
            </View>
          );
        }
        return (
          <Text key={index} className="text-sm text-muted-foreground">
            <Inline tokens={block.tokens} />
          </Text>
        );
      })}
    </View>
  );
}
