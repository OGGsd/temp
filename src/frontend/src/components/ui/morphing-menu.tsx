"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import IconComponent from "../common/genericIconComponent";

interface MorphingMenuItem {
  icon: string;
  label: string;
  onClick: () => void;
}

interface MorphingMenuProps {
  variant?: "large" | "small";
  trigger: string;
  items: MorphingMenuItem[];
}

export function MorphingMenu({ variant = "large", trigger, items }: MorphingMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={variant === "large" ? "default" : "sm"}
          className="gap-2"
        >
          <IconComponent name="Plus" className="h-4 w-4" />
          {trigger}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {items.map((item, index) => (
          <DropdownMenuItem
            key={index}
            onClick={item.onClick}
            className="gap-2 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-2"
            >
              <IconComponent name={item.icon} className="h-4 w-4" />
              {item.label}
            </motion.div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
