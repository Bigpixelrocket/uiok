import { CircleAlert, Copy, FolderOpen, Info, SquarePen } from 'lucide-react';
import { useId, useRef, useState } from 'react';
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
  /**
   * Shows the file in the system's file manager, picked in its folder,
   * under the page's `showFolderLabel`; none while the file does not exist.
   */
  readonly onShow?: SettingsFileRequest;
  /**
   * Copies the file's whole path to the clipboard, under the page's
   * `copyPathLabel`; none leaves the verb off.
   */
  readonly onCopyPath?: SettingsFileRequest;
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
  /**
   * The verb that shows the folder, and a file with `onShow` in its folder
   * ("Show in Finder").
   */
  readonly showFolderLabel: string;
  readonly onShowFolder: SettingsFileRequest;
  /** Why the folder cannot be used; null when it can. */
  readonly folderProblem?: string | null;
  /** The open verb on each file's row ("Open"). */
  readonly openLabel: string;
  /**
   * The verb that copies a file's path ("Copy Path"), drawn on each file
   * with `onCopyPath`; without it no file draws that verb.
   */
  readonly copyPathLabel?: string;
  readonly files: readonly SettingsFileEntry[];
}

/**
 * A row's requests and the failure under it: `run` starts one, and only the
 * latest one started says what shows, so a slow request that ends after a
 * newer one (Open still pending when Copy Path fails) never replaces the
 * newer one's answer.
 */
function useRowRequests(): {
  readonly failure: string | null;
  readonly run: (request: SettingsFileRequest) => void;
} {
  const [failure, setFailure] = useState<string | null>(null);
  const latest = useRef(0);

  return {
    failure,
    run: (request) => {
      latest.current += 1;
      const turn = latest.current;

      void request().then((answer) => {
        if (latest.current === turn) setFailure(answer);
      });
    }
  };
}

/** A request's failure under its row, or nothing. */
function Failure({ message }: { readonly message: string | null }): ReactElement | null {
  return message === null ? null : (
    <p className="field-problem" role="alert">
      {message}
    </p>
  );
}

/** The words on a file's verbs, which every file's row shares. */
interface FileVerbLabels {
  readonly open: string;
  readonly show: string;
  readonly copyPath: string | undefined;
}

/**
 * One file: its name, its state and its verbs (Open, Show in Finder, Copy
 * Path, each the host gives), and its problems under it.
 */
function SettingsFileRow({
  file,
  labels
}: {
  readonly file: SettingsFileEntry;
  readonly labels: FileVerbLabels;
}): ReactElement {
  const { failure, run } = useRowRequests();
  const nameId = useId();
  // Each file's verbs share their words, so each says which file it acts on.
  const verbs = [
    { id: 'open', request: file.onOpen, label: labels.open, icon: SquarePen },
    { id: 'show', request: file.onShow, label: labels.show, icon: FolderOpen },
    { id: 'copy', request: file.onCopyPath, label: labels.copyPath, icon: Copy }
  ];

  return (
    <>
      <span className="field-label settings-file-name" id={nameId}>
        {file.name}
      </span>
      <div className="field-value">
        <div className="field-option">
          <span className="settings-file-summary">{file.summary}</span>
          {verbs.map(({ id, request, label, icon: Icon }) =>
            request === undefined || label === undefined || label === '' ? null : (
              <Button aria-describedby={nameId} key={id} onClick={() => run(request)} size="small">
                <Icon aria-hidden size={ICON_SM} />
                {label}
              </Button>
            )
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
 * then each file the app reads there, with its verbs (Open, and Show in
 * Finder and Copy Path where the host gives them) and its problems under it
 * (where, which key, what is wrong), on the label column every page shares.
 * Each file's verbs are described by its name, as several rows share their
 * words.
 * A request the host refuses shows its message under its row; of a row's
 * requests the latest started is the one whose answer shows. Problems show
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
  copyPathLabel,
  files
}: SettingsFilesProps): ReactElement {
  const labels: FileVerbLabels = {
    open: openLabel,
    show: showFolderLabel,
    copyPath: copyPathLabel
  };
  const { failure, run } = useRowRequests();

  return (
    <div className="field-grid">
      <span className="field-label" {...labelHelp(folderHelp).label}>
        {folderLabel}
      </span>
      <div className="field-value">
        <div className="field-option">
          <code className="settings-file-path">{folder}</code>
          <Button onClick={() => run(onShowFolder)} size="small">
            <FolderOpen aria-hidden size={ICON_SM} />
            {showFolderLabel}
          </Button>
        </div>
        {folderProblem === null ? null : <p className="field-problem">{folderProblem}</p>}
        <Failure message={failure} />
      </div>
      {files.map((file) => (
        <SettingsFileRow file={file} key={file.name} labels={labels} />
      ))}
    </div>
  );
}
