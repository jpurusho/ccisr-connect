"use client"

import { useTheme } from "next-themes"
import {
  Sun,
  Moon,
  Flame,
  Code2,
  Star,
  Waves,
  TreePine,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const icon =
    theme === "dark" || theme === "github-dark" || theme === "midnight" ? (
      <Moon className="size-4" />
    ) : theme === "warm" ? (
      <Flame className="size-4" />
    ) : theme === "ocean" ? (
      <Waves className="size-4" />
    ) : theme === "forest" ? (
      <TreePine className="size-4" />
    ) : (
      <Sun className="size-4" />
    )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm">
            {icon}
            <span className="sr-only">Toggle theme</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuLabel>Light Themes</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="size-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("warm")}>
          <Flame className="size-4" />
          <span>Warm</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("ocean")}>
          <Waves className="size-4" />
          <span>Ocean</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("forest")}>
          <TreePine className="size-4" />
          <span>Forest</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Dark Themes</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="size-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("github-dark")}>
          <Code2 className="size-4" />
          <span>GitHub Dark Pro</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("midnight")}>
          <Star className="size-4" />
          <span>Midnight</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
