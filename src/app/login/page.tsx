"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  ScrollText,
  Workflow,
  FileEdit,
  Grid3x3,
  GitBranch,
  LayoutTemplate,
  AlertTriangle,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { LogoMark } from "@/components/shell/logo";
import { RoleSwitcherDialog } from "@/components/shell/role-switcher-dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from "@/components/ui/input-group";

const LIFECYCLE_STAGES = ["Draft", "Testing", "Active", "Inactive", "Archived"];

const CAPABILITIES = [
  { icon: FileEdit, label: "No-Code Rule Builder", desc: "Compose IF/THEN logic visually, no syntax required." },
  { icon: Grid3x3, label: "Decision Matrix Configuration", desc: "Edit pricing and threshold slabs like a spreadsheet." },
  { icon: ShieldCheck, label: "Approval Workflow & Governance", desc: "Draft → Testing → Review → Publish, fully audited." },
  { icon: LayoutTemplate, label: "Rule Templates & Groups", desc: "Reusable starting shapes and organizational collections." },
  { icon: GitBranch, label: "Conflict Detection", desc: "Flags contradictory rules before they reach production." },
  { icon: ScrollText, label: "Full Audit Trail", desc: "Every configuration change is logged and traceable." },
];

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "Secure Access" },
  { icon: KeyRound, label: "Role-Based Permissions" },
  { icon: ScrollText, label: "Full Audit Trail" },
  { icon: Workflow, label: "Workflow Automation" },
];

export default function LoginPage() {
  const router = useRouter();
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const login = useAppStore((s) => s.login);
  const rules = useAppStore((s) => s.rules);
  const simulations = useAppStore((s) => s.simulations);
  const appName = useAppStore((s) => s.appearance.appName);
  const tagline = useAppStore((s) => s.appearance.tagline);

  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) router.replace("/dashboard");
  }, [hasHydrated, isAuthenticated, router]);

  const totalRules = rules.length;
  const activeRules = rules.filter((r) => r.status === "Active").length;
  const simulationsRun = simulations.length + 256;

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId.trim() || !password.trim()) {
      setError("Enter both your Employee ID and password to continue.");
      return;
    }
    setError("");
    login();
    toast.success("Signed in successfully");
    router.push("/dashboard");
  };

  return (
    <div className="grid h-full grid-cols-1 overflow-y-auto lg:grid-cols-2 lg:overflow-hidden">
      {/* Left — branding panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-sidebar px-10 py-10 text-sidebar-foreground lg:flex xl:px-14">
        <div>
          <div className="flex items-center gap-3">
            <LogoMark className="size-10" />
            <div>
              <p className="text-lg font-semibold tracking-tight">{appName}</p>
              <p className="text-xs text-sidebar-foreground/60">{tagline}</p>
            </div>
          </div>

          <h1 className="mt-10 max-w-md text-2xl font-semibold tracking-tight text-balance">
            One decision platform for every industry.
          </h1>
          <p className="mt-2 max-w-sm text-sm text-sidebar-foreground/60">
            Configure once, evaluate everywhere — no code required to add an industry, a rule, or a workflow.
          </p>

          <div className="mt-8 grid max-w-sm grid-cols-3 gap-3">
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3 text-center">
              <p className="text-xl font-semibold text-sidebar-primary">{totalRules}</p>
              <p className="text-[11px] text-sidebar-foreground/55">Total Rules</p>
            </div>
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3 text-center">
              <p className="text-xl font-semibold text-sidebar-primary">{activeRules}</p>
              <p className="text-[11px] text-sidebar-foreground/55">Active Rules</p>
            </div>
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3 text-center">
              <p className="text-xl font-semibold text-sidebar-primary">{simulationsRun}</p>
              <p className="text-[11px] text-sidebar-foreground/55">Simulations</p>
            </div>
          </div>

          <div className="mt-8 max-w-sm">
            <p className="mb-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              Rule Lifecycle
            </p>
            <div className="flex items-center">
              {LIFECYCLE_STAGES.map((stage, i) => (
                <div key={stage} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <span
                      className={`flex size-6 items-center justify-center rounded-full text-[10px] font-semibold ${
                        i === 2
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "bg-sidebar-accent text-sidebar-foreground/60"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[10px] text-sidebar-foreground/55">{stage}</span>
                  </div>
                  {i < LIFECYCLE_STAGES.length - 1 && <div className="mx-1 h-px flex-1 bg-sidebar-border" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
          {CAPABILITIES.map((cap) => (
            <div key={cap.label} className="flex items-start gap-2">
              <cap.icon className="mt-0.5 size-3.5 shrink-0 text-sidebar-primary" />
              <p className="text-[11.5px] leading-snug text-sidebar-foreground/70">{cap.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right — sign-in form */}
      <div className="flex flex-col items-center justify-center gap-8 bg-background px-6 py-10 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-7 lg:hidden">
            <div className="flex items-center gap-2.5">
              <LogoMark className="size-8" />
              <p className="text-base font-semibold tracking-tight">{appName}</p>
            </div>
          </div>

          <h2 className="text-xl font-semibold tracking-tight">Welcome Back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to your {appName} account</p>

          <form className="mt-6 space-y-4" onSubmit={handleSignIn}>
            <div className="space-y-1.5">
              <Label htmlFor="employeeId">Employee ID</Label>
              <InputGroup>
                <InputGroupAddon>
                  <User className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  id="employeeId"
                  placeholder="EMP-0001"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  autoComplete="username"
                />
              </InputGroup>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <InputGroup>
                <InputGroupAddon>
                  <Lock className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>

            {error && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="size-3.5 shrink-0" /> {error}
              </p>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={rememberMe} onCheckedChange={(v) => setRememberMe(!!v)} />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => toast.info("Contact your administrator to reset your password.")}
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>

          <div className="mt-5 text-center text-xs text-muted-foreground">
            Need Demo Access?{" "}
            <button onClick={() => setPickerOpen(true)} className="font-semibold text-primary hover:underline">
              Enter Demo Mode
            </button>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t pt-5">
            {TRUST_BADGES.map((badge) => (
              <div key={badge.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <badge.icon className="size-3.5 text-primary/70" />
                {badge.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <RoleSwitcherDialog open={pickerOpen} onOpenChange={setPickerOpen} redirectTo="/dashboard" />
    </div>
  );
}
