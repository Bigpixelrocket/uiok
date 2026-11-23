import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ViewerFileInfo, ViewerReader, ViewerResult } from './types.js';

import type { ViewerViewProps } from './ViewerViews.js';
import { UiokProvider } from '../labels/UiokProvider.js';
import { isViewerCloseKey, type ViewerKeyStroke } from './ViewerKeys.js';
import { ViewerWindow } from './ViewerWindow.js';

/** Every render of the video view, newest last, so a test can call one a reload has replaced. */
const videoViewRenders = vi.hoisted((): ViewerViewProps[] => []);

vi.mock('./ViewerViews.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./ViewerViews.js')>();
  const VideoView = actual.VIEWER_VIEWS.video;

  return {
    ...actual,
    VIEWER_VIEWS: {
      ...actual.VIEWER_VIEWS,
      video: (props: ViewerViewProps) => {
        videoViewRenders.push(props);
        return <VideoView {...props} />;
      }
    }
  };
});

const opened: ViewerFileInfo = {
  generation: 0,
  name: 'app.ts',
  sizeBytes: 2048,
  modifiedMs: new Date(2026, 9, 5, 9, 30).getTime(),
  content: { kind: 'text', mimeType: 'text/plain' },
  change: 'none',
  mediaUrl: 'viewer-media://file/0000000000000000000000000000000000000000000000000000000000000000'
};

const ok = <A,>(value: A): Promise<ViewerResult<A>> => Promise.resolve({ ok: true, value });

const failure = (message: string): Promise<ViewerResult<never>> =>
  Promise.resolve({ ok: false, error: { message } });

const noop = (): void => undefined;

/** An app's close keys: Escape, and the chords that open its viewer (⌘Y, F3). */
const appCloseKey = (stroke: ViewerKeyStroke): boolean =>
  isViewerCloseKey(stroke) ||
  (!stroke.repeat &&
    !stroke.altKey &&
    !stroke.ctrlKey &&
    !stroke.shiftKey &&
    (stroke.metaKey ? stroke.key === 'y' : stroke.key === 'F3'));

/** The viewer's reader as mocks, each answering as `overrides` says or with the opened file. */
const bridgeWith = (overrides: Partial<ViewerReader> = {}) => ({
  inspect: vi.fn<ViewerReader['inspect']>(overrides.inspect ?? (() => ok(opened))),
  readRange: vi.fn<ViewerReader['readRange']>(
    overrides.readRange ??
      (() =>
        ok({
          generation: 0,
          offset: 0,
          bytes: new TextEncoder().encode('export const answer = 42;\n'),
          endOfFile: true
        }))
  ),
  reload: vi.fn<ViewerReader['reload']>(overrides.reload ?? (() => ok(opened))),
  lineNumber: vi.fn<ViewerReader['lineNumber']>(
    overrides.lineNumber ?? ((request) => ok({ generation: 0, offset: request.offset, line: 1 }))
  )
});

const modes = (): HTMLElement => screen.getByRole('radiogroup', { name: 'View as' });

describe('ViewerWindow', () => {
  it('frames the file with its name, facts, and the modes its kind offers', async () => {
    render(<ViewerWindow onClose={noop} reader={bridgeWith()} />);

    expect(await screen.findByRole('heading', { name: 'app.ts' })).toBeTruthy();
    const facts = screen.getByText('2 KB · Text · Modified 2026-10-05 09:30');

    expect(facts.dataset.tooltip).toBe('2 KB · Text · Modified 2026-10-05 09:30\n2,048 bytes');
    expect(facts.getAttribute('aria-description')).toBe(
      '2 KB · Text · Modified 2026-10-05 09:30\n2,048 bytes'
    );
    expect(
      within(modes())
        .getAllByRole('radio')
        .map((button) => [button.textContent, button.getAttribute('aria-checked')])
    ).toEqual([
      ['Text', 'true'],
      ['Hex', 'false']
    ]);
    expect(await screen.findByText('export const answer = 42;')).toBeTruthy();
  });

  it('draws no mode switch for a kind with one way to show it', async () => {
    const binary: ViewerFileInfo = {
      ...opened,
      name: 'blob.bin',
      content: { kind: 'binary', mimeType: 'application/octet-stream' }
    };
    render(<ViewerWindow onClose={noop} reader={bridgeWith({ inspect: () => ok(binary) })} />);

    expect(await screen.findByRole('heading', { name: 'blob.bin' })).toBeTruthy();
    expect(screen.queryByRole('radiogroup', { name: 'View as' })).toBeNull();
  });

  it('switches to the view a mode names', async () => {
    render(<ViewerWindow onClose={noop} reader={bridgeWith()} />);
    await screen.findByRole('heading', { name: 'app.ts' });

    fireEvent.click(within(modes()).getByRole('radio', { name: 'Hex' }));

    expect(within(modes()).getByRole('radio', { name: 'Hex' }).getAttribute('aria-checked')).toBe(
      'true'
    );
    expect(screen.getByRole('textbox', { name: 'Bytes of app.ts' })).toBeTruthy();
  });

  it('shows why the file cannot be opened, in the copy the host sent', async () => {
    render(
      <ViewerWindow
        onClose={noop}
        reader={bridgeWith({
          inspect: () => failure('Could not open “app.ts”. It no longer exists.')
        })}
      />
    );

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not open “app.ts”. It no longer exists.'
    );
    expect(screen.queryByRole('group', { name: 'View as' })).toBeNull();
  });

  it('checks the disk when the window comes forward, and Reload brings the change in', async () => {
    const reader = bridgeWith();
    render(<ViewerWindow onClose={noop} reader={reader} />);
    await screen.findByRole('heading', { name: 'app.ts' });
    expect(screen.queryByRole('status')).toBeNull();

    reader.inspect.mockImplementation(() => ok({ ...opened, sizeBytes: 4096, change: 'modified' }));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    const notice = await screen.findByRole('status');
    expect(notice.textContent).toContain('The file changed on disk.');
    // The frame keeps what the window opened until the user reloads.
    expect(screen.getByText(/^2 KB/)).toBeTruthy();

    reader.reload.mockImplementation(() => ok({ ...opened, sizeBytes: 4096 }));
    fireEvent.click(within(notice).getByRole('button', { name: 'Reload' }));

    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
    expect(screen.getByText(/^4 KB/)).toBeTruthy();
  });

  it('keeps what it shows and says why when a reload fails', async () => {
    const reader = bridgeWith({
      inspect: () => ok({ ...opened, change: 'replaced' }),
      reload: () => failure('Could not open “app.ts”. It no longer exists.')
    });
    render(<ViewerWindow onClose={noop} reader={reader} />);

    const notice = await screen.findByRole('status');
    fireEvent.click(within(notice).getByRole('button', { name: 'Reload' }));

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('It no longer exists.')
    );
    expect(screen.getByRole('heading', { name: 'app.ts' })).toBeTruthy();
  });

  it("drops a failed reload's reason once the disk matches the open file again", async () => {
    let change: ViewerFileInfo['change'] = 'replaced';
    const reader = bridgeWith({
      inspect: () => ok({ ...opened, change }),
      reload: () => failure('Could not open “app.ts”. It no longer exists.')
    });
    render(<ViewerWindow onClose={noop} reader={reader} />);

    fireEvent.click(
      within(await screen.findByRole('status')).getByRole('button', { name: 'Reload' })
    );
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toContain('It no longer exists.')
    );

    change = 'none';
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });

  it('ignores a check that a reload overtook', async () => {
    const reader = bridgeWith({ inspect: () => ok({ ...opened, change: 'modified' }) });
    render(<ViewerWindow onClose={noop} reader={reader} />);
    const notice = await screen.findByRole('status');

    let answerCheck: (info: ViewerFileInfo) => void = noop;
    reader.inspect.mockImplementation(
      () =>
        new Promise((resolve) => {
          answerCheck = (info) => resolve({ ok: true, value: info });
        })
    );
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    reader.reload.mockImplementation(() => ok({ ...opened, generation: 1, change: 'none' }));
    fireEvent.click(within(notice).getByRole('button', { name: 'Reload' }));
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());

    // The check began on generation 0 and answers after the reload.
    await act(async () => {
      answerCheck({ ...opened, change: 'modified' });
      await Promise.resolve();
    });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('starts afresh on a new reader, deaf to the old one answering late', async () => {
    let answerReload: (info: ViewerFileInfo) => void = noop;
    const first = bridgeWith({
      inspect: () => ok({ ...opened, change: 'modified' }),
      reload: () =>
        new Promise((resolve) => {
          answerReload = (info) => resolve({ ok: true, value: info });
        })
    });
    const second = bridgeWith({ inspect: () => ok({ ...opened, name: 'next.ts' }) });
    const { rerender } = render(<ViewerWindow onClose={noop} reader={first} />);
    fireEvent.click(
      within(await screen.findByRole('status')).getByRole('button', { name: 'Reload' })
    );

    rerender(<ViewerWindow onClose={noop} reader={second} />);
    expect(await screen.findByRole('heading', { name: 'next.ts' })).toBeTruthy();

    await act(async () => {
      answerReload({ ...opened, generation: 1, name: 'stale.ts' });
      await Promise.resolve();
    });
    expect(screen.getByRole('heading', { name: 'next.ts' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'stale.ts' })).toBeNull();
  });

  it('keeps what it shows when only its words change', async () => {
    const reader = bridgeWith();
    const { rerender } = render(
      <UiokProvider labels={{}}>
        <ViewerWindow onClose={noop} reader={reader} />
      </UiokProvider>
    );
    await screen.findByRole('heading', { name: 'app.ts' });
    fireEvent.click(within(modes()).getByRole('radio', { name: 'Hex' }));

    rerender(
      <UiokProvider labels={{ viewer: { noAnswer: 'Keine Antwort.' } }}>
        <ViewerWindow onClose={noop} reader={reader} />
      </UiokProvider>
    );

    expect(reader.inspect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('textbox', { name: 'Bytes of app.ts' })).toBeTruthy();
  });

  it('lets the newest check speak when checks answer out of order', async () => {
    const reader = bridgeWith();
    render(<ViewerWindow onClose={noop} reader={reader} />);
    await screen.findByRole('heading', { name: 'app.ts' });

    const answers: ((info: ViewerFileInfo) => void)[] = [];
    reader.inspect.mockImplementation(
      () =>
        new Promise((resolve) => {
          answers.push((info) => resolve({ ok: true, value: info }));
        })
    );
    act(() => {
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new Event('focus'));
    });

    await act(async () => {
      answers[1]?.({ ...opened, change: 'removed' });
      await Promise.resolve();
    });
    await act(async () => {
      answers[0]?.({ ...opened, change: 'modified' });
      await Promise.resolve();
    });

    expect(screen.getByRole('status').textContent).toContain('The file was moved or deleted.');
    expect(screen.queryByRole('button', { name: 'Reload' })).toBeNull();
  });

  it("leaves the page's own controls their Escape and Copy", async () => {
    const close = vi.fn();
    render(
      <>
        <input aria-label="Search" />
        <ViewerWindow onClose={close} reader={bridgeWith()} />
      </>
    );
    await screen.findByText('answer', { exact: false });
    const search = screen.getByRole('textbox', { name: 'Search' });

    fireEvent.keyDown(screen.getByRole('textbox', { name: /app\.ts/ }), {
      key: 'a',
      metaKey: true
    });
    const setData = vi.fn();
    const copyEvent = new Event('copy', { bubbles: true, cancelable: true });
    Object.defineProperty(copyEvent, 'clipboardData', { value: { setData } });
    act(() => {
      search.dispatchEvent(copyEvent);
    });
    expect(setData).not.toHaveBeenCalled();
    expect(copyEvent.defaultPrevented).toBe(false);

    fireEvent.keyDown(search, { key: 'Escape' });
    expect(close).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('offers no Reload for a file that is gone from its path', async () => {
    render(
      <ViewerWindow
        onClose={noop}
        reader={bridgeWith({ inspect: () => ok({ ...opened, change: 'removed' }) })}
      />
    );

    const notice = await screen.findByRole('status');
    expect(notice.textContent).toContain('The file was moved or deleted.');
    expect(within(notice).queryByRole('button')).toBeNull();
  });

  it('falls back to hex with a note when the image cannot be decoded', async () => {
    const image: ViewerFileInfo = {
      ...opened,
      name: 'photo.png',
      content: { kind: 'image', mimeType: 'image/png' }
    };
    render(<ViewerWindow onClose={noop} reader={bridgeWith({ inspect: () => ok(image) })} />);

    fireEvent.error(await screen.findByAltText('photo.png'));

    expect(within(modes()).getByRole('radio', { name: 'Hex' }).getAttribute('aria-checked')).toBe(
      'true'
    );
    expect(screen.getByRole('status').textContent).toBe(
      'Could not decode this image, so it shows in hex.'
    );
    expect(screen.getByRole('textbox', { name: 'Bytes of photo.png' })).toBeTruthy();

    // Picking a mode again tries it afresh, without the note.
    fireEvent.click(within(modes()).getByRole('radio', { name: 'Image' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByAltText('photo.png')).toBeTruthy();
  });

  it('falls back to the source, not hex, with a note when an SVG cannot be rendered', async () => {
    const svg: ViewerFileInfo = {
      ...opened,
      name: 'broken.svg',
      content: { kind: 'svg', mimeType: 'image/svg+xml' }
    };
    render(<ViewerWindow onClose={noop} reader={bridgeWith({ inspect: () => ok(svg) })} />);
    const image = await screen.findByAltText('broken.svg');

    expect(
      within(modes())
        .getAllByRole('radio')
        .map((button) => [button.textContent, button.getAttribute('aria-checked')])
    ).toEqual([
      ['Image', 'true'],
      ['Source', 'false'],
      ['Hex', 'false']
    ]);

    fireEvent.error(image);

    expect(
      within(modes()).getByRole('radio', { name: 'Source' }).getAttribute('aria-checked')
    ).toBe('true');
    expect(screen.getByRole('status').textContent).toBe(
      'Could not render this SVG, so it shows its source.'
    );
    expect(screen.getByRole('textbox', { name: 'Text of broken.svg' })).toBeTruthy();
  });

  it('opens the image again on a reload after a fallback, but keeps a hex the user picked', async () => {
    const image: ViewerFileInfo = {
      ...opened,
      name: 'photo.png',
      content: { kind: 'image', mimeType: 'image/png' }
    };
    const reader = bridgeWith({ inspect: () => ok(image), reload: () => ok(image) });
    const pressed = (name: string): string | null =>
      within(modes()).getByRole('radio', { name }).getAttribute('aria-checked');
    const reloadChangedFile = async (): Promise<void> => {
      reader.inspect.mockImplementation(() => ok({ ...image, change: 'modified' }));
      await act(async () => {
        window.dispatchEvent(new Event('focus'));
      });
      fireEvent.click(await screen.findByRole('button', { name: 'Reload' }));
      await waitFor(() => expect(screen.queryByRole('button', { name: 'Reload' })).toBeNull());
    };
    render(<ViewerWindow onClose={noop} reader={reader} />);

    // The file was still being written, or a reload cut its load short.
    fireEvent.error(await screen.findByAltText('photo.png'));
    expect(pressed('Hex')).toBe('true');

    await reloadChangedFile();
    expect(pressed('Image')).toBe('true');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByAltText('photo.png')).toBeTruthy();

    fireEvent.click(within(modes()).getByRole('radio', { name: 'Hex' }));
    await reloadChangedFile();
    expect(pressed('Hex')).toBe('true');
  });

  it('ignores a late fallback from the view a reload replaced', async () => {
    // jsdom plays nothing; the views pause and unload on the way out.
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
    const video: ViewerFileInfo = {
      ...opened,
      name: 'clip.mp4',
      content: { kind: 'video', mimeType: 'video/mp4' }
    };
    const reader = bridgeWith({ inspect: () => ok(video), reload: () => ok(video) });
    const pressed = (name: string): string | null =>
      within(modes()).getByRole('radio', { name }).getAttribute('aria-checked');
    render(<ViewerWindow onClose={noop} reader={reader} />);
    await screen.findByLabelText('clip.mp4');
    const replaced = videoViewRenders.at(-1);

    reader.inspect.mockImplementation(() => ok({ ...video, change: 'modified' }));
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Reload' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Reload' })).toBeNull());

    // The old file's player reports its error after the reload.
    act(() => replaced?.onFallback('Could not play this video, so it shows in hex.'));
    expect(pressed('Player')).toBe('true');
    expect(screen.queryByRole('status')).toBeNull();

    // The current view still falls back.
    const current = screen.getByLabelText('clip.mp4');
    Object.defineProperty(current, 'error', { configurable: true, value: { code: 4 } });
    fireEvent.error(current);
    expect(pressed('Hex')).toBe('true');
    expect(screen.getByRole('status').textContent).toBe(
      'Could not play this video format, so it shows in hex.'
    );
    vi.restoreAllMocks();
  });

  it('leaves Space to a focused header button while a player is open', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
    for (const [name, kind, mimeType] of [
      ['song.mp3', 'audio', 'audio/mpeg'],
      ['clip.mp4', 'video', 'video/mp4']
    ] as const) {
      const file: ViewerFileInfo = { ...opened, name, content: { kind, mimeType } };
      const view = render(
        <ViewerWindow onClose={noop} reader={bridgeWith({ inspect: () => ok(file) })} />
      );
      const media = (await screen.findByLabelText(name)) as HTMLMediaElement;
      Object.defineProperty(media, 'readyState', { configurable: true, value: 1 });
      act(() => {
        media.dispatchEvent(new Event('loadedmetadata'));
      });

      const hex = within(modes()).getByRole('radio', { name: 'Hex' });
      hex.focus();
      const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
      act(() => {
        hex.dispatchEvent(space);
      });

      expect(space.defaultPrevented, name).toBe(false);
      expect(HTMLMediaElement.prototype.play, name).not.toHaveBeenCalled();
      view.unmount();
    }
    vi.restoreAllMocks();
  });

  it('closes on the keys it is given, once the view has no use for Escape', async () => {
    const close = vi.fn();
    render(<ViewerWindow isCloseKey={appCloseKey} onClose={close} reader={bridgeWith()} />);
    const text = await screen.findByRole('textbox');
    await screen.findByText('answer', { exact: false });

    // A selection takes the first Escape, wherever focus has moved since.
    fireEvent.keyDown(text, { key: 'a', metaKey: true });
    const wrap = screen.getByRole('checkbox', { name: 'Wrap' });
    wrap.focus();
    expect(fireEvent.keyDown(wrap, { key: 'Escape' })).toBe(false);
    expect(close).not.toHaveBeenCalled();

    // In full screen, Escape is the browser's, to leave it; the chords still close.
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => text });
    fireEvent.keyDown(text, { key: 'Escape' });
    expect(close).not.toHaveBeenCalled();
    fireEvent.keyDown(text, { key: 'y', metaKey: true });
    expect(close).toHaveBeenCalledTimes(1);
    Reflect.deleteProperty(document, 'fullscreenElement');

    fireEvent.keyDown(wrap, { key: 'Escape' });
    fireEvent.keyDown(text, { key: 'y', metaKey: true });
    fireEvent.keyDown(document.body, { key: 'F3' });
    expect(close).toHaveBeenCalledTimes(4);
  });

  it('closes on Escape alone by default, never on its repeats', async () => {
    const close = vi.fn();
    render(<ViewerWindow onClose={close} reader={bridgeWith()} />);
    await screen.findByText('answer', { exact: false });

    fireEvent.keyDown(document.body, { key: 'y', metaKey: true });
    fireEvent.keyDown(document.body, { key: 'F3' });
    fireEvent.keyDown(document.body, { key: 'Escape', repeat: true });
    expect(close).not.toHaveBeenCalled();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('says so when the page has no reader', () => {
    render(<ViewerWindow onClose={noop} reader={null} />);

    expect(screen.getByRole('alert').textContent).toBe('The viewer could not reach its file.');
  });
});
