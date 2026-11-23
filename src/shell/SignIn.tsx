import { KeyRound, Server, ShieldQuestionMark, type LucideIcon } from 'lucide-react';
import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode
} from 'react';

import { ConfirmDialog } from '../dialog/ConfirmDialog.js';
import type { DialogItem } from '../dialog/DialogLists.js';
import { ModalDialog } from '../dialog/ModalDialog.js';
import { useLabels } from '../labels/UiokProvider.js';
import { cutTooltip } from '../tooltip/Tooltip.logic.js';

/** A fact row a sign-in opens with: where (Server) and who (Account, Key file). */
export interface SignInFact {
  readonly label: string;
  readonly value: string;
}

/** Props for {@link SignInDialog}. */
export interface SignInDialogProps {
  /** The title: "Sign In", never the host's name. */
  readonly title: string;
  /** The verb on Return ("Sign In"). */
  readonly confirmLabel: string;
  /** Where and who, as fact rows before the field. */
  readonly facts: readonly SignInFact[];
  /** The field's one-word label ("Password", "Passphrase"). */
  readonly secretLabel: string;
  /** Why it asks again after a refusal ("That password was not accepted."); null on a first ask. */
  readonly rejection?: string | null;
  /** Whether the typed value may be sent; any non-empty value unless given. */
  readonly accepts?: (value: string) => boolean;
  /** What goes under the field (a Save in Keychain choice). */
  readonly children?: ReactNode;
  /** The title strip's glyph; a key unless given. */
  readonly icon?: LucideIcon;
  readonly onSubmit: (value: string) => void;
  readonly onCancel: () => void;
}

/**
 * One password or passphrase, asked in the dialog frame: fact rows for
 * where and who, then the field's one-word label beside one secure field,
 * and why it asks again when it does, on one label column. Return signs in
 * and Escape cancels. The value lives in this field alone and leaves only
 * as the answer; the field takes the focus once the dialog is up.
 */
export function SignInDialog({
  title,
  confirmLabel,
  facts,
  secretLabel,
  rejection = null,
  accepts = (value) => value.length > 0,
  children,
  icon = KeyRound,
  onSubmit,
  onCancel
}: SignInDialogProps): ReactElement {
  const labels = useLabels().dialog;
  const ids = useId();
  const [value, setValue] = useState('');
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    field.current?.focus();
  }, []);

  return (
    <ModalDialog
      className="sign-in-dialog"
      icon={icon}
      labelId={`${ids}-title`}
      legend={{
        leave: { label: labels.cancel },
        primary: { label: confirmLabel, disabled: !accepts(value), onRun: () => onSubmit(value) }
      }}
      onCancel={onCancel}
      title={title}
    >
      <div className="field-grid">
        {facts.map((fact) => (
          <Fragment key={fact.label}>
            <span className="field-label sign-in-fact">{fact.label}</span>
            <p className="sign-in-fact-value dialog-value" {...cutTooltip(fact.value)}>
              {fact.value}
            </p>
          </Fragment>
        ))}
        <label className="field-label" htmlFor={`${ids}-secret`}>
          {secretLabel}
        </label>
        <div className="field-value">
          <input
            aria-describedby={rejection === null ? undefined : `${ids}-note`}
            aria-invalid={rejection === null ? undefined : true}
            autoComplete="off"
            className="field sign-in-field"
            id={`${ids}-secret`}
            onChange={(event) => setValue(event.target.value)}
            ref={field}
            spellCheck={false}
            type="password"
            value={value}
          />
          {children}
          {rejection !== null && (
            <p className="field-problem" id={`${ids}-note`} role="alert">
              {rejection}
            </p>
          )}
        </div>
      </div>
    </ModalDialog>
  );
}

/** Props for {@link HostKeyDialog}. */
export interface HostKeyDialogProps {
  /** At most five words ("Trust Host Key?"). */
  readonly title: string;
  /** Why it asks and when to trust the key. */
  readonly message: ReactNode;
  /** The verb ("Trust"). */
  readonly confirmLabel: string;
  /** The host, as the confirmation's one item (its saved name as the detail). */
  readonly host: DialogItem;
  /** The key's type ("ED25519"). */
  readonly keyType: string;
  /** The key's whole fingerprint, selectable. */
  readonly fingerprint: string;
  readonly onTrust: () => void;
  readonly onCancel: () => void;
}

/**
 * A host key the computer has not seen before, as a confirmation read at a
 * glance: the lead says why it asks and when to trust it, the host is the
 * one item, and then the key's type and its whole fingerprint in a framed
 * well. The verb answers yes, Cancel no.
 */
export function HostKeyDialog({
  title,
  message,
  confirmLabel,
  host,
  keyType,
  fingerprint,
  onTrust,
  onCancel
}: HostKeyDialogProps): ReactElement {
  return (
    <ConfirmDialog
      confirmLabel={confirmLabel}
      icon={ShieldQuestionMark}
      itemIcon={Server}
      items={[host]}
      message={message}
      onCancel={onCancel}
      onConfirm={onTrust}
      title={title}
      tone="primary"
    >
      <dl className="sign-in-fingerprint">
        <dt className="dialog-value">{keyType}</dt>
        <dd className="dialog-value">{fingerprint}</dd>
      </dl>
    </ConfirmDialog>
  );
}
