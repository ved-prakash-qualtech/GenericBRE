"use client";

import { useState } from "react";
import { HelpCircle, Mail, Phone, Clock, ExternalLink, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const LINKS = [
  { label: "Rule Builder Guide", href: "#" },
  { label: "Decision Matrix Validation Rules", href: "#" },
  { label: "Understanding Decision Traces", href: "#" },
];

export function HelpDesk() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" className="size-9" onClick={() => setOpen(true)} aria-label="Help">
        <HelpCircle className="size-[18px]" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Help &amp; Support</SheetTitle>
            <SheetDescription>Reach the BRE platform team or browse quick guides.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-4">
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="size-4 text-muted-foreground" />
                <span>+91 22 6142 7788</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="size-4 text-muted-foreground" />
                <a href="mailto:bre-support@qualtechedge.com" className="hover:underline">
                  bre-support@qualtechedge.com
                </a>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="size-4 text-muted-foreground" />
                <span>Mon – Sat, 9:00 AM – 8:00 PM IST</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <BookOpen className="size-3.5" /> Quick Guides
              </p>
              {LINKS.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  onClick={(e) => e.preventDefault()}
                  className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm hover:bg-accent transition-colors"
                >
                  {l.label}
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                </a>
              ))}
            </div>

            <Button render={<a href="mailto:bre-support@qualtechedge.com" />} className="mt-2">
              <Mail className="size-4" /> Email Support
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
