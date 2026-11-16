"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { saveDesignChoice } from "../app/actions/site-preferences";
import styles from "./DesignInvitation.module.css";

type Copy = {
  title: string;
  description: string;
  accept: string;
  decline: string;
};
function Choices({ copy }: { copy: Copy }) {
  const { pending } = useFormStatus();
  return (
    <div className={styles.choices}>
      <button type="submit" name="design" value="ladder" disabled={pending}>
        {copy.accept}
      </button>
      <button type="submit" name="design" value="classic" disabled={pending}>
        {copy.decline}
      </button>
    </div>
  );
}
export function DesignInvitation({
  enabled,
  copy,
}: {
  enabled: boolean;
  copy: Copy;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (enabled && !dialog.current?.open) dialog.current?.showModal();
    if (!enabled) dialog.current?.close();
  }, [enabled]);
  if (!enabled) return null;
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby="design-invitation-title"
      aria-describedby="design-invitation-description"
      onCancel={(event) => {
        event.preventDefault();
        const button = dialog.current?.querySelector<HTMLButtonElement>(
          'button[value="classic"]',
        );
        if (button && !button.disabled) button.form?.requestSubmit(button);
      }}
    >
      <h2 id="design-invitation-title">{copy.title}</h2>
      <p id="design-invitation-description">{copy.description}</p>
      <form action={saveDesignChoice}>
        <Choices copy={copy} />
      </form>
    </dialog>
  );
}
