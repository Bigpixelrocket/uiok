import { CircleAlert } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type ReactElement } from 'react';

import {
  settleRead,
  type ViewerContentKind,
  type ViewerFileChange,
  type ViewerFileInfo,
  type ViewerReader
} from './types.js';

import { Button } from '../button/Button.js';
import { describedTooltip } from '../tooltip/Tooltip.logic.js';
import { NameCut } from '../namecut/NameCut.js';
import { nameParts } from '../namecut/NameCut.logic.js';
import { SegmentedChoice } from '../segmented/SegmentedChoice.js';
import { useLabels } from '../labels/UiokProvider.js';
import { Notice } from '../surface/Notice.js';
import { VisuallyHidden } from '../VisuallyHidden.js';
import { isViewerCloseKey, type ViewerKeyStroke } from './ViewerKeys.js';
import {
  openSyntaxWorker,
  SyntaxWorkerContext,
  type SyntaxWorkerFactory
} from './SyntaxService.js';
import {
  changeNotice,
  factsTitle,
  fallbackViewFor,
  fileFacts,
  VIEWER_MODES,
  viewForKind,
  type ViewerViewId
} from './ViewerFrame.logic.js';
import { VIEWER_VIEWS } from './ViewerViews.js';

type FrameState =
  | { readonly kind: 'loading' }
  /**
   * The reader's failure, or null for a viewer given no reader,
   * which only a broken build produces.
   */
  | { readonly kind: 'failed'; readonly message: string | null }
  | {
      readonly kind: 'ready';
      /** The file as the window opened it, or as the last reload found it. */
      readonly info: ViewerFileInfo;
      /**
       * Counts reloads, so every view remounts on the file as it is now
       * (`latestGeneration` holds the same count).
       */
      readonly generation: number;
      /** How the disk differs from `info`, from the latest check. */
      readonly change: ViewerFileChange;
      readonly reloading: boolean;
      /** Why the last reload failed, in the reader's copy; null after a good one. */
      readonly reloadFailure: string | null;
    };

/**
 * The mode on screen, and why the window shows its kind's fallback view
 * (source for an SVG, hex otherwise) in place of the view it opens in (null
 * unless a native view fell back). A fallback ends when the user picks a
 * mode or a reload succeeds; a reload after one tries the kind's own view
 * again on the file as it is now, while a mode the user picked survives a
 * reload.
 */
type Shown = { readonly view: ViewerViewId; readonly fallbackNote: string | null };

/** What a good inspect or reload of a `kind` file shows after `current`. */
const shownAfterOpen = (kind: ViewerContentKind, current: Shown | null): Shown => ({
  view: viewForKind(kind, current !== null && current.fallbackNote === null ? current.view : null),
  fallbackNote: null
});

/** Props for {@link ViewerWindow}. */
export interface ViewerWindowProps {
  /**
   * How the viewer reaches its one file; null shows the `unreachable`
   * failure, for a page that was opened without one.
   */
  readonly reader: ViewerReader | null;
  /**
   * Puts the viewer away (a separate window calls `window.close()`), on
   * the close keys whatever the viewer shows, a failure included.
   */
  readonly onClose: () => void;
  /**
   * Which keystrokes close the viewer; Escape alone by default
   * (`isViewerCloseKey`). A key a view takes first stays the view's:
   * Escape clearing a selection or the hex view's offset field. In full
   * screen, Escape is the browser's, to leave it.
   */
  readonly isCloseKey?: (stroke: ViewerKeyStroke) => boolean;
  /**
   * Whether the window's own buttons sit at the header's leading end, as
   * macOS draws its traffic lights over a hidden title bar: the file's name
   * then starts clear of them (`--traffic-light-inset`). The header is a
   * drag region either way, its mode switch excepted.
   */
  readonly trafficLights?: boolean;
  /**
   * Starts the text view's highlighting worker. By default the viewer's own
   * worker, Shiki on its JavaScript regex engine, with each grammar loaded
   * only when a file needs it; null shows text plain and starts no worker.
   */
  readonly syntaxWorker?: SyntaxWorkerFactory | null;
}

/**
 * A number per reader the viewer has been given, so a new reader remounts
 * the viewer: nothing a read, reload, or check of the old file answers late
 * can reach the new file's state.
 */
const readerKeys = new WeakMap<ViewerReader, number>();
let nextReaderKey = 1;

const readerKey = (reader: ViewerReader | null): number => {
  if (reader === null) return 0;

  let key = readerKeys.get(reader);
  if (key === undefined) {
    key = nextReaderKey;
    nextReaderKey += 1;
    readerKeys.set(reader, key);
  }

  return key;
};

/**
 * A read-only file viewer filling its window: a header with the file's
 * name, size, kind, and modification date and a switch between the modes
 * its kind offers, and the view for the chosen mode (text with syntax
 * highlighting and line numbers, hex, image, audio, video, or PDF), each
 * reading only the bytes on screen through `reader`. The file is inspected
 * once as the viewer opens and again each time its window comes to the
 * front; when its source no longer matches, a notice says so and offers
 * Reload, while the view keeps what it has. A native view that cannot show
 * the file hands over to its kind's fallback (source for an SVG, hex
 * otherwise) with a note saying why. It owns its document's keyboard and
 * clipboard (its keys and Copy listen on the window), so mount one per
 * window or document; a new `reader` starts it afresh on that file.
 */
export function ViewerWindow(props: ViewerWindowProps): ReactElement {
  return <ViewerWindowFor key={readerKey(props.reader)} {...props} />;
}

/** The viewer bound to one reader for its whole life. */
function ViewerWindowFor({
  reader,
  onClose,
  isCloseKey = isViewerCloseKey,
  trafficLights = false,
  syntaxWorker
}: ViewerWindowProps): ReactElement {
  const labels = useLabels().viewer;
  const modesLabelId = useId();
  // Read when a call settles, so a new translation of the words neither
  // inspects the file again nor resets what the viewer shows.
  const noAnswer = useRef(labels.noAnswer);
  useEffect(() => {
    noAnswer.current = labels.noAnswer;
  });
  const [state, setState] = useState<FrameState>(
    reader ? { kind: 'loading' } : { kind: 'failed', message: null }
  );
  const onCloseRef = useRef(onClose);
  const isCloseKeyRef = useRef(isCloseKey);
  useEffect(() => {
    onCloseRef.current = onClose;
    isCloseKeyRef.current = isCloseKey;
  });
  const [shown, setShown] = useState<Shown | null>(null);
  // The newest generation, advanced the moment a reload succeeds, so a
  // fallback can be checked against it when it arrives rather than against
  // whatever a render captured.
  const latestGeneration = useRef(0);

  const openedKind = state.kind === 'ready' ? state.info.content.kind : null;
  const generation = state.kind === 'ready' ? state.generation : null;
  // Bound to the generation the view was mounted on: a view a reload has
  // replaced can still report its old file's failure late (an error event
  // or a decode check still in flight), and that must not move the new
  // generation's view to its fallback.
  const fallBack = useCallback(
    (note: string): void => {
      if (openedKind === null || generation !== latestGeneration.current) return;

      setShown({ view: fallbackViewFor(openedKind), fallbackNote: note });
    },
    [generation, openedKind]
  );

  const chooseView = (next: ViewerViewId): void => {
    setShown({ view: next, fallbackNote: null });
  };

  useEffect(() => {
    if (!reader) return;
    let cancelled = false;

    void settleRead(noAnswer.current, () => reader.inspect()).then((result) => {
      if (cancelled) return;

      if (!result.ok) {
        setState({ kind: 'failed', message: result.error.message });
        return;
      }

      setState({
        kind: 'ready',
        info: result.value,
        generation: 0,
        change: result.value.change,
        reloading: false,
        reloadFailure: null
      });
      setShown((current) => shownAfterOpen(result.value.content.kind, current));
    });

    return () => {
      cancelled = true;
    };
  }, [reader]);

  // Nothing watches the file, so the check runs when the user comes back to
  // the window, the moment a change made elsewhere could matter. A failed
  // check changes nothing on screen: the next one, or Reload, says more.
  useEffect(() => {
    if (!reader) return;

    const check = (): void => {
      void settleRead(noAnswer.current, () => reader.inspect()).then((result) => {
        if (!result.ok) return;

        // A disk that matches the open file again leaves nothing for an
        // earlier failed reload to explain. A check that answers for an
        // earlier generation (a reload overtook it) says nothing of the
        // file open now.
        setState((current) =>
          current.kind === 'ready' &&
          !current.reloading &&
          current.info.generation === result.value.generation
            ? {
                ...current,
                change: result.value.change,
                reloadFailure: result.value.change === 'none' ? null : current.reloadFailure
              }
            : current
        );
      });
    };

    window.addEventListener('focus', check);

    return () => window.removeEventListener('focus', check);
  }, [reader]);

  // Escape, ⌘Y, and F3 close the window as ⌘W does (`isViewerCloseKey`),
  // whatever it shows, a failure included. A key a view took first is the
  // view's: Escape clearing a selection or the hex view's offset field. In
  // full screen, Escape is the browser's, to leave it; other close keys still close.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || !isCloseKeyRef.current(event)) return;
      if (event.key === 'Escape' && document.fullscreenElement) return;

      event.preventDefault();
      onCloseRef.current();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const reload = useCallback(async (): Promise<void> => {
    if (!reader) return;

    setState((current) =>
      current.kind === 'ready' ? { ...current, reloading: true, reloadFailure: null } : current
    );
    const result = await settleRead(noAnswer.current, () => reader.reload());
    if (result.ok) latestGeneration.current += 1;
    const next = latestGeneration.current;

    setState((current) => {
      if (current.kind !== 'ready') return current;

      return result.ok
        ? {
            kind: 'ready',
            info: result.value,
            generation: next,
            change: result.value.change,
            reloading: false,
            reloadFailure: null
          }
        : { ...current, reloading: false, reloadFailure: result.error.message };
    });

    if (result.ok) {
      setShown((current) => shownAfterOpen(result.value.content.kind, current));
    }
  }, [reader]);

  if (state.kind !== 'ready' || reader === null || shown === null) {
    const failureText = state.kind === 'failed' ? (state.message ?? labels.unreachable) : null;

    return (
      <div className="viewer-window" data-traffic-lights={trafficLights ? '' : undefined}>
        {/* Without a file's name the window is titled for what it is; a
            failure is centred in the content, the glyph over the sentence
            that says how to recover, wrapping, as every failed load is. */}
        <header className="viewer-header">
          {state.kind === 'failed' ? (
            <div className="viewer-identity">
              <h1 className="viewer-name viewer-name-generic">{labels.title}</h1>
            </div>
          ) : null}
        </header>
        <main className="viewer-body">
          {state.kind === 'failed' ? (
            <div className="viewer-failure" role="alert">
              <CircleAlert aria-hidden className="viewer-failure-glyph" />
              <p>{failureText}</p>
            </div>
          ) : null}
        </main>
      </div>
    );
  }

  const { info } = state;
  const modes = VIEWER_MODES[info.content.kind];
  const notice = changeNotice(state.change, labels);
  const noticeText = state.reloadFailure ?? notice?.text ?? null;
  const noticeDanger = state.reloadFailure !== null || notice?.canReload === false;
  const { view, fallbackNote } = shown;
  const View = VIEWER_VIEWS[view];

  return (
    <div className="viewer-window" data-traffic-lights={trafficLights ? '' : undefined}>
      <header className="viewer-header">
        <div className="viewer-identity">
          <h1 className="viewer-name">
            <NameCut parts={nameParts([{ name: info.name }])} />
          </h1>
          <p
            className="viewer-facts"
            {...describedTooltip(`${fileFacts(info, labels)}\n${factsTitle(info, labels)}`)}
          >
            {fileFacts(info, labels)}
          </p>
        </div>
        {/* A kind with one way to show it has nothing to switch between. */}
        {modes.length > 1 ? (
          <div className="viewer-modes">
            <VisuallyHidden id={modesLabelId}>{labels.modesLabel}</VisuallyHidden>
            <SegmentedChoice
              choices={modes.map((mode) => mode.view)}
              labelId={modesLabelId}
              onChange={chooseView}
              render={(choice) => {
                const mode = modes.find((entry) => entry.view === choice);
                return mode ? labels.modes[mode.label] : choice;
              }}
              value={view}
            />
          </div>
        ) : null}
      </header>
      {noticeText !== null && (
        <div className="viewer-notice">
          <Notice
            actions={
              (notice?.canReload ?? true) && (
                <Button disabled={state.reloading} onClick={() => void reload()} size="small">
                  {labels.reload}
                </Button>
              )
            }
            tone={noticeDanger ? 'danger' : 'warning'}
          >
            {noticeText}
          </Notice>
        </div>
      )}
      {fallbackNote !== null && (
        <div className="viewer-notice">
          <Notice>{fallbackNote}</Notice>
        </div>
      )}
      <main className="viewer-body">
        <SyntaxWorkerContext value={syntaxWorker === undefined ? openSyntaxWorker : syntaxWorker}>
          <View info={info} key={state.generation} onFallback={fallBack} reader={reader} />
        </SyntaxWorkerContext>
      </main>
    </div>
  );
}
