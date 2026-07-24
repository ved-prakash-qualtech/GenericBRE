"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles, ThumbsUp, ThumbsDown, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "bot" | "user";
  text: string;
  quickReplies?: { label: string; href?: string }[];
  feedbackGiven?: "up" | "down";
}

interface KbEntry {
  keywords: string[];
  reply: string;
  quickReplies?: { label: string; href?: string }[];
}

const KNOWLEDGE_BASE: KbEntry[] = [
  {
    keywords: ["create", "new rule", "add rule"],
    reply: "You can create a rule without writing any code. Open the Rule Builder, fill in metadata, add IF conditions, and choose a THEN action.",
    quickReplies: [{ label: "Open Rule Builder", href: "/rule-builder" }],
  },
  {
    keywords: ["matrix", "slab", "haircut", "premium", "interest rate", "ltv"],
    reply: "Pricing tables like interest rate slabs, LTV/haircut bands, and premium loadings live in the Decision Matrix — edit a cell and it updates the Simulator instantly.",
    quickReplies: [{ label: "Open Decision Matrix", href: "/matrix" }],
  },
  {
    keywords: ["simulate", "simulator", "test", "run"],
    reply: "The Rule Simulator lets you enter sample customer data and see the decision, the exact rules that fired, and a full explanation trace.",
    quickReplies: [{ label: "Open Simulator", href: "/simulator" }],
  },
  {
    keywords: ["reject", "rejected", "why", "explain", "trace"],
    reply: "Every decision includes a Decision Explanation timeline — it shows each rule, the condition it checked, the expected vs. actual value, and whether it passed, failed, or was skipped.",
    quickReplies: [{ label: "Open Simulator", href: "/simulator" }],
  },
  {
    keywords: ["repository", "search rule", "find rule", "clone", "disable", "archive"],
    reply: "The Rule Repository is the searchable catalogue of every rule. You can filter by status/category/priority/owner, and clone, disable, or archive rules inline.",
    quickReplies: [{ label: "Open Repository", href: "/repository" }],
  },
  {
    keywords: ["theme", "branding", "logo", "dark mode", "appearance", "wallpaper"],
    reply: "Appearance Studio lets you switch theme presets, toggle light/dark mode, upload a wallpaper, and replace the client logo — with a live preview before you apply.",
    quickReplies: [{ label: "Open Appearance Studio", href: "/appearance" }],
  },
  {
    keywords: ["export", "csv", "download"],
    reply: "Every data table has a one-click CSV export in its toolbar — it respects your current filters and column order.",
  },
  {
    keywords: ["role", "access", "permission", "rbac"],
    reply: "The platform is RBAC-ready: switch roles from your profile menu to preview how Business Analysts, Risk Managers, and Admins see the platform differently in later phases.",
  },
];

const FALLBACK: KbEntry = {
  keywords: [],
  reply: "I couldn't find an exact match for that. I can help with Rule Builder, Decision Matrix, Repository, Simulator, or Appearance Studio — or I can hand you off to Help Desk.",
  quickReplies: [{ label: "Talk to Help Desk" }],
};

function findAnswer(input: string): KbEntry {
  const lower = input.toLowerCase();
  const hit = KNOWLEDGE_BASE.find((entry) => entry.keywords.some((k) => lower.includes(k)));
  return hit ?? FALLBACK;
}

const GREETING: Message = {
  id: "greet",
  role: "bot",
  text: "Hi, I'm the BRE Assistant. Ask me how to build a rule, update pricing, or explain a decision — I'll guide you to the right screen.",
  quickReplies: [
    { label: "How do I create a rule?" },
    { label: "How is a decision explained?" },
    { label: "Where do I edit interest rates?" },
  ],
};

export function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  // send() only ever runs from a click/submit handler, never during render,
  // so Date.now() here doesn't affect render purity.
  /* eslint-disable react-hooks/purity */
  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", text };
    const kb = findAnswer(text);
    const botMsg: Message = { id: `b-${Date.now()}`, role: "bot", text: kb.reply, quickReplies: kb.quickReplies };
    setMessages((m) => [...m, userMsg, botMsg]);
    setInput("");
    /* eslint-enable react-hooks/purity */
  };

  const handleQuickReply = (qr: { label: string; href?: string }) => {
    if (qr.href) {
      router.push(qr.href);
      setOpen(false);
      return;
    }
    if (qr.label === "Talk to Help Desk") {
      setMessages((m) => [
        ...m,
        { id: `u-${Date.now()}`, role: "user", text: qr.label },
        { id: `b-${Date.now()}`, role: "bot", text: "Connecting you to Help Desk — use the ? icon in the header for phone, email, and hours." },
      ]);
      return;
    }
    send(qr.label);
  };

  return (
    <>
      <motion.div
        className="fixed bottom-5 right-5 z-40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 260, damping: 20 }}
      >
        <Button
          size="icon"
          onClick={() => setOpen((v) => !v)}
          className="size-13 rounded-full shadow-lg shadow-primary/25"
          aria-label="Open chat assistant"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={open ? "close" : "open"}
              initial={{ rotate: -45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 45, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
            </motion.span>
          </AnimatePresence>
        </Button>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className={cn(
              "fixed z-40 flex flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl",
              "bottom-22 right-5 h-[min(560px,70vh)] w-[min(380px,calc(100vw-2.5rem))]"
            )}
          >
            <div className="flex items-center gap-2.5 border-b bg-gradient-to-r from-primary/10 to-transparent px-4 py-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Bot className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold leading-none">BRE Assistant</p>
                <p className="text-sm text-muted-foreground mt-0.5">Guided help · role-aware</p>
              </div>
              <Sparkles className="size-4 text-primary/60" />
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3.5 py-3.5">
              {messages.map((m) => (
                <div key={m.id} className={cn("flex flex-col gap-1.5", m.role === "user" ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-snug",
                      m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
                    )}
                  >
                    {m.text}
                  </div>
                  {m.role === "bot" && m.quickReplies && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.quickReplies.map((qr) => (
                        <button
                          key={qr.label}
                          onClick={() => handleQuickReply(qr)}
                          className="rounded-full border px-2.5 py-1 text-sm font-medium hover:bg-accent transition-colors"
                        >
                          {qr.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {m.role === "bot" && m.id !== "greet" && (
                    <div className="flex items-center gap-1 pl-1">
                      <button
                        onClick={() => setMessages((ms) => ms.map((x) => (x.id === m.id ? { ...x, feedbackGiven: "up" } : x)))}
                        className={cn("rounded p-0.5 hover:text-emerald-500", m.feedbackGiven === "up" && "text-emerald-500")}
                      >
                        <ThumbsUp className="size-3" />
                      </button>
                      <button
                        onClick={() => setMessages((ms) => ms.map((x) => (x.id === m.id ? { ...x, feedbackGiven: "down" } : x)))}
                        className={cn("rounded p-0.5 hover:text-red-500", m.feedbackGiven === "down" && "text-red-500")}
                      >
                        <ThumbsDown className="size-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t p-2.5"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question..."
                className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <Button size="icon" type="submit" className="size-9 shrink-0">
                <Send className="size-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
