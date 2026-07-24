// 更新记录渲染：把扁平的 notes 按「标题行」分组。
//
// 数据源（data/releases.json）里，标题行保留了 Markdown 的 `#` 前缀
// （由 scripts/sync_release_notes.py 写入），其余为纯文本条目。
// 这里据此渲染成「小节标题 + 其下条目列表」，避免标题被拍平成普通圆点项。
// 老版本条目没有标题，则整段作为一个列表——向后兼容。

const HEADING_RE = /^#{1,6}\s+(.*)$/;

interface Block {
  heading: string | null;
  items: string[];
}

function groupNotes(notes: string[]): Block[] {
  const blocks: Block[] = [];
  for (const note of notes) {
    const m = HEADING_RE.exec(note);
    if (m) {
      blocks.push({ heading: m[1], items: [] });
    } else {
      if (blocks.length === 0) blocks.push({ heading: null, items: [] });
      blocks[blocks.length - 1].items.push(note);
    }
  }
  return blocks;
}

export function ReleaseNotes({ notes }: { notes: string[] }) {
  const blocks = groupNotes(notes);

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <div key={block.heading ?? `block-${i}`}>
          {block.heading && (
            <h3 className="font-semibold text-fd-foreground">
              {block.heading}
            </h3>
          )}
          {block.items.length > 0 && (
            <ul
              className={`list-inside list-disc space-y-1.5 text-fd-muted-foreground${
                block.heading ? " mt-1.5" : ""
              }`}
            >
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
