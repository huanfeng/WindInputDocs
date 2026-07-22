"use client";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";
import SearchDialog from "@/components/search";
import { zhTranslations } from "@/lib/translations";

export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      search={{ SearchDialog }}
      i18n={{ locale: "cn", translations: zhTranslations }}
    >
      {children}
    </RootProvider>
  );
}
