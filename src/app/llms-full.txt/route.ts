import { getLLMText, isUnreleasedPage, source } from "@/lib/source";

export const revalidate = false;

export async function GET() {
  const scan = source
    .getPages()
    // 整页未发布的略过。页内小节由 getLLMText 里的 stripUnreleased 摘。
    .filter((page) => !isUnreleasedPage(page.url))
    .map(getLLMText);
  const scanned = await Promise.all(scan);

  return new Response(scanned.join("\n\n"));
}
