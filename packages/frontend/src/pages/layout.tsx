import { useState } from "react";

import { Modal } from "../design-system/components/common";
import * as layout from "../design-system/tokens/layout.css";

export default function Layout() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)}>테스트용 모달</Modal>
      )}
      <div className={layout.baseContainer} style={{ height: "1200px" }}>
        <div className={layout.header} />
        <div className={layout.base}>
          <div className={layout.sideBar}>test</div>
          <div className={layout.container} />
        </div>
        <div className={layout.footer}>footer</div>
      </div>
      <button onClick={() => setModalOpen(true)}>portal</button>
    </>
  );
}
