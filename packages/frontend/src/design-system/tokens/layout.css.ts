import { style } from "@vanilla-extract/css";

import color from "./color";
import * as utils from "./utils.css";

export const headerHeight = "56px";
export const footerHeight = "120px";
export const baseContainer = style([utils.baseLayer, utils.widthFull]);

export const header = style([
  utils.middleLayer,
  utils.widthFull,
  {
    height: headerHeight,
    position: "fixed",
    top: 0,
    left: 0,
    backgroundColor: color.$scale.grey600,
  },
]);

export const base = style([
  utils.widthMax,
  utils.flex,
  {
    minHeight: `calc(100vh - ${footerHeight})`,
    backgroundColor: color.$scale.grey500,
    paddingTop: headerHeight,
    margin: "0 auto",
  },
]);

export const sideBar = style({
  width: 213,
  backgroundColor: color.$scale.grey300,
});

export const container = style({
  width: 1106,
  margin: "0 60px",
  backgroundColor: color.$scale.grey700,
});

export const footer = style([
  utils.widthMax,
  {
    height: footerHeight,
    margin: "0 auto",
    padding: "45px 0",
    backgroundColor: color.$scale.grey600,
  },
]);
