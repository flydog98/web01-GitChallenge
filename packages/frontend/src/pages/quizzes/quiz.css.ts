import { style } from "@vanilla-extract/css";

import color from "../../design-system/tokens/color";
import {
  border,
  flex,
  flexColumn,
  middleLayer,
  widthFull,
} from "../../design-system/tokens/utils.css";

export const bar = style([
  middleLayer,
  border.all,
  {
    position: "relative",
    minHeight: 20,
    borderBottom: "none",
    backgroundColor: color.$scale.grey100,
    cursor: "row-resize",

    "::before": {
      content: "",
      position: "absolute",
      left: "50%",
      transform: "translateX(-50%)",
      display: "block",
      width: 60,
      height: 3,
      borderRadius: 8,
      backgroundColor: color.$scale.grey400,
      top: -5,
    },
  },
]);

export const mainContainer = style([widthFull]);
export const mainInnerContainer = style([
  flexColumn,
  {
    marginBottom: "17px",
    height: 580,
  },
]);

export const topContainer = style([flex, border.verticalSide]);

export const buttonGroup = style([
  flex,
  {
    margin: "17px 0px",
    justifyContent: "space-between",
  },
]);
