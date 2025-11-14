import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardBody, Input, Select, SelectItem, Tabs, Tab } from "@heroui/react";
import type { TypographyScale, TypographyToken } from "@/types/clientWebsite";
import { listGoogleFonts, ensureFontLoaded, tokenToStyle } from "@/services/fontsService";

type Scope = "global" | "page" | "component";

export default function TypographyPanel({
  scope,
  tokens,
  onChange,
  onLoadFont,
}: {
  scope: Scope;
  tokens: TypographyScale;
  onChange: (tag: keyof TypographyScale, patch: Partial<TypographyToken>) => void;
  onLoadFont?: (family: string) => void;
}) {
  const [fonts, setFonts] = useState<{ family: string }[]>([]);
  const [activeTag, setActiveTag] = useState<keyof TypographyScale>("h1");

  useEffect(() => {
    (async () => {
      const list = await listGoogleFonts();
      setFonts(list.map((f) => ({ family: f.family })));
    })();
  }, []);

  const tags: (keyof TypographyScale)[] = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "span"];
  const token = tokens[activeTag];

  async function applyFontFamily(family: string) {
    const w = token.weight ?? 400;
    await ensureFontLoaded(family, [w]);
    onChange(activeTag, { font_family: family });
    if (onLoadFont) await onLoadFont(family);
  }

  return (
    <Card className="bg-transparent shadow-none">
      <CardBody className="space-y-3 p-0 overflow-hidden">
        <Tabs aria-label="Tokens" color="primary" variant="underlined" selectedKey={activeTag} onSelectionChange={(k) => setActiveTag(k as keyof TypographyScale)}>
          {tags.map((t) => (
            <Tab key={t} title={t.toUpperCase()} />
          ))}
        </Tabs>

        <div className="grid grid-cols-1 gap-2">
          <Select
            label="Fuente (Google Fonts)"
            selectedKeys={[token.font_family]}
            onSelectionChange={(keys) => {
              const first = Array.from(keys)[0] as string | undefined;
              if (first) applyFontFamily(first);
            }}
          >
            {fonts.map((f) => (
              <SelectItem key={f.family} value={f.family}>{f.family}</SelectItem>
            ))}
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              label="size (px)"
              value={String(token.size_px ?? 0)}
              onValueChange={(v) => onChange(activeTag, { size_px: Number(v) || 0 })}
            />
            <Select
              label="weight"
              selectedKeys={[String(token.weight ?? 400)]}
              onSelectionChange={async (keys) => {
                const first = Array.from(keys)[0] as string | undefined;
                const w = Number(first ?? 400) || 400;
                await ensureFontLoaded(token.font_family, [w]);
                onChange(activeTag, { weight: w });
              }}
            >
              {[100,200,300,400,500,600,700,800,900].map((w) => (
                <SelectItem key={String(w)} value={String(w)}>{w}</SelectItem>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <Input
              type="number"
              label="letterSpacing (px)"
              className="col-span-2"
              value={String(token.letter_spacing_px ?? 0)}
              onValueChange={(v) => onChange(activeTag, { letter_spacing_px: Number(v) || 0 })}
            />
            <Input
              type="number"
              label="lineHeight (%)"
              className="col-span-2"
              value={String(token.line_height_percent ?? 120)}
              onValueChange={(v) => onChange(activeTag, { line_height_percent: Number(v) || 0 })}
            />
          </div>

          <div className="text-xs opacity-70">Preview</div>
          <div className="p-3 rounded bg-content1/50" style={tokenToStyle(token)}>
            {activeTag.toUpperCase()} · The quick brown fox jumps over the lazy dog.
          </div>
        </div>
      </CardBody>
    </Card>
  );
}