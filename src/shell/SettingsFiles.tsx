import { CircleAlert, FolderOpen, Info, SquarePen } from 'lucide-react';
import { useState } from 'react';
import type { ReactElement } from 'react';

import { Button } from '../button/Button.js';
import { labelHelp } from '../field/labelHelp.js';
import { ICON_MD, ICON_SM } from '../icon/sizes.js';

/**
 * Runs a host request a row's button makes, and keeps the failure it
 * answers: a message to show under the row, or null when it went through.
 */
export type SettingsFileRequest = () => Promise<string | null>;

/** One problem in a settings file. */
export interface SettingsFileProblem {
  /** A mistake (`problem`) or a note about a value the app adjusted (`note`). */
  readonly kind: 'problem' | 'note';
  /** Where it is ("Line 12"); null where the file as a whole is at fault. */
  readonly place: string | null;
  /** The key it is about, set in the code face; null for none. */
  readonly key: string | null;
  readonly message: string;
}

/** One settings file the app reads. */
export interface SettingsFileEntry {
  /** The file's name ("settings.toml"). */
  readonly name: string;
  /** Its state in a few words ("Read 2 minutes ago", "Not created yet"). */
  readonly summary: string;
  /** Opens the file in the system's editor; none while the file does not exist. */
  readonly onOpen?: SettingsFileRequest;
  /** Its problems in line order. */
  readonly problems: readonly SettingsFileProblem[];
  /** The problem list's accessible name ("Problems in settings.toml"). */
  readonly problemsLabel: string;
}

/** Props for {@link SettingsFiles}. */
export interface SettingsFilesProps {
  /** The folder row's label ("Folder"). */
  readonly folderLabel: string;
  /** What the folder is, the label's tooltip. */
  readonly folderHelp?: string;
  /** The folder's path, selectable, cut with an ellipsis. */
  readonly folder: string;
  /** The verb that shows the folder ("Show in Finder"). */
  readonly showFolderLabel: string;
  readonly onShowFolder: SettingsFileRequest;
  /** Why the folder cannot be used; null when it can. */
  readonly folderProblem?: string | null;
  /** The open verb on each file's row ("Open"). */
  readonly openLabel: string;
  readonly files: readonly SettingsFileEntry[];
}

/** A request's failure under its row, or nothing. */
function Failure({ message }: { readonly message: string | null }): ReactElement | null {
  return message === null ? null : (
    <p className="field-problem" role="alert">
      {message}
    </p>
  );
}

/** One file: its name, its state and Open, and its problems under it. */
function SettingsFileRow({
  file,
  openLabel
}: {
  readonly file: SettingsFileEntry;
  readonly openLabel: string;
}): ReactElement {
  const [failure, setFailure] = useState<string | null>(null);
  const open = file.onOpen;

  return (
    <>
      <span className="field-label settings-file-name">{file.name}</span>
      <div className="field-value">
        <div className="field-option">
          <span className="settings-file-summary">{file.summary}</span>
          {open === undefined ? null : (
            <Button onClick={() => void open().then(setFailure)} size="small">
              <SquarePen aria-hidden size={ICON_SM} />
              {openLabel}
            </Button>
          )}
        </div>
        {file.problems.length > 0 ? (
          <ul aria-label={file.problemsLabel} className="settings-file-problems">
            {file.problems.map((problem, index) => (
              // Two problems can say the same thing; their place in the list is their identity.
              <li
                className={
                  problem.kind === 'note'
                    ? 'settings-file-problem notice note'
                    : 'settings-file-problem notice notice-danger'
                }
                key={index}
              >
                {problem.kind === 'note' ? (
                  <Info aria-hidden size={ICON_MD} />
                ) : (
                  <CircleAlert aria-hidden size={ICON_MD} />
                )}
                <span className="notice-text settings-file-problem-text">
                  {problem.place === null && problem.key === null ? null : (
                    <span className="settings-file-problem-place">
                      {problem.place}
                      {problem.place !== null && problem.key !== null ? ' · ' : null}
                      {problem.key === null ? null : <code>{problem.key}</code>}
                    </span>
                  )}
                  <span>{problem.message}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <Failure message={failure} />
      </div>
    </>
  );
}

/**
 * A Files page of Settings: the settings folder with a verb that shows it,
 * then each file the app reads there, with Open and its problems under it
 * (where, which key, what is wrong), on the label column every page shares.
 * A request the host refuses shows its message under its row. Problems show
 * only here; the host keeps the page current while it is open, so a fix
 * made in an editor clears its problem as soon as the file is saved.
 */
export function SettingsFiles({
  folderLabel,
  folderHelp,
  folder,
  showFolderLabel,
  onShowFolder,
  folderProblem = null,
  openLabel,
  files
}: SettingsFilesProps): ReactElement {
  const [failure, setFailure] = useState<string | null>(null);

  return (
    <div className="field-grid">
      <span className="field-label" {...labelHelp(folderHelp).label}>
        {folderLabel}
      </span>
      <div className="field-value">
        <div className="field-option">
          <code className="settings-file-path">{folder}</code>
          <Button onClick={() => void onShowFolder().then(setFailure)} size="small">
            <FolderOpen aria-hidden size={ICON_SM} />
            {showFolderLabel}
          </Button>
        </div>
        {folderProblem === null ? null : <p className="field-problem">{folderProblem}</p>}
        <Failure message={failure} />
      </div>
      {files.map((file) => (
        <SettingsFileRow file={file} key={file.name} openLabel={openLabel} />
      ))}
    </div>
  );
}
