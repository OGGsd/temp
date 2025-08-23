import type React from "react";
import { forwardRef } from "react";
import SvgFreezeAll from "./freezeAll";

("./freezeAll.jsx");

export const freezeAllIcon = forwardRef<
  SVGSVGElement,
  React.PropsWithChildren<{ className?: string; [key: string]: any }>
>((props, ref) => {
  return <SvgFreezeAll ref={ref} className="" {...props} />;
});
