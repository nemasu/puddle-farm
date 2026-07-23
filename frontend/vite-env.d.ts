/// <reference types="vite/client" />

declare module "*.svg?react" {
  import React from "react";

  const SVGComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  export default SVGComponent;
}
