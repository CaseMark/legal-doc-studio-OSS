"use client";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Info, Book, Database, Key, Rocket } from "@phosphor-icons/react";

export default function Page() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center bg-background px-6">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-light tracking-tight text-foreground" style={{ fontFamily: "'Spectral', serif" }}>
          The foundation is set.
        </h1>
        <p className="text-muted-foreground text-lg">
          Now connect the dots.
        </p>
      </div>

      <div className="fixed bottom-8 right-8">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-muted/80 transition-colors outline-none">
            <Info size={20} className="text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" sideOffset={8}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Next Steps</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Book size={16} />
                Read AGENTS.md
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Database size={16} />
                Set up your database
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Key size={16} />
                Add environment variables
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Rocket size={16} />
                Start building
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </main>
  );
}
