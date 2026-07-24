"use client";

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-media-query";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  className?: string;
  align?: "start" | "center" | "end";
}

export function MultiSelect({ label, options, selected, onChange, className, align = "start" }: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };
  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const triggerClassName = cn(
    "h-9 justify-between gap-2 font-normal",
    selected.length > 0 && "border-primary/50",
    className
  );

  const triggerContent = (
    <>
      <span className="flex items-center gap-1.5">
        {label}
        {selected.length > 0 && (
          <Badge variant="secondary" className="rounded-full px-1.5 py-0 text-sm h-4 min-w-4">
            {selected.length}
          </Badge>
        )}
      </span>
      {selected.length > 0 ? (
        <X className="size-3.5 opacity-60 hover:opacity-100 cursor-pointer" onClick={clear} />
      ) : (
        <ChevronDown className="size-3.5 opacity-50" />
      )}
    </>
  );

  const list = (
    <Command>
      <CommandInput placeholder={`Search ${label.toLowerCase()}...`} />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup>
          {options.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <CommandItem key={opt.value} onSelect={() => toggle(opt.value)} className="gap-2">
                <div
                  className={cn(
                    "flex size-4 items-center justify-center rounded border",
                    isSelected ? "bg-primary border-primary text-primary-foreground" : "border-input"
                  )}
                >
                  {isSelected && <Check className="size-3" />}
                </div>
                {opt.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
      {selected.length > 0 && (
        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="w-full text-sm" onClick={() => onChange([])}>
            Clear all
          </Button>
        </div>
      )}
    </Command>
  );

  if (isMobile) {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className={triggerClassName}>
          {triggerContent}
        </Button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="max-h-[70vh] p-0">
            <SheetHeader className="border-b">
              <SheetTitle>{label}</SheetTitle>
            </SheetHeader>
            {list}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" className={triggerClassName} />}>
        {triggerContent}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-64 p-0">
        {list}
      </PopoverContent>
    </Popover>
  );
}
