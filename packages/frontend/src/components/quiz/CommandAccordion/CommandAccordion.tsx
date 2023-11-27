import Link from "next/link";

import { GIT_BOOK_URL } from "../../../constants/path";
import { Accordion, Badge } from "../../../design-system/components/common";
import { badgeVariantList } from "../../../design-system/components/common/Badge/Badge";

import badgeGroupLayout from "./CommandAccordion.css";

interface CommandAccordionProps {
  width?: number | string;
  items: string[];
}


export default function CommandAccordion({
  width = "100%",
  items,
}: CommandAccordionProps) {
  return (
    <Accordion width={width}>
      <Accordion.Details>
        <Accordion.Summary color="grey" size="sm">
          {({ open }) => <>핵심명령어 {open ? "숨기기" : "보기"}</>}
        </Accordion.Summary>
        <div className={badgeGroupLayout}>
          {items.map((item, index) => (
            <Badge key={item} variant={badgeVariantList[index % items.length]}>
              <Link href={`${GIT_BOOK_URL}-${item}`}>{item}</Link>
            </Badge>
          ))}
        </div>
      </Accordion.Details>
    </Accordion>
  );
}