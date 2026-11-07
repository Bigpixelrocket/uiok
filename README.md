# UIOK

Docs: https://bigpixelrocket.github.io/uiok/

UIOK is a React UI library with a retro look: compact controls set in system and monospace type, with every colour drawn from a swappable theme. It is extracted from the desktop apps Bigpixelrocket builds, and it works in any React 19 app.

## Status

Pre-1.0. The package currently ships the base stylesheet (font stacks, the z-index scale, the frosted-surface filter, and the `visually-hidden` utility) and the `VisuallyHidden` component. Themes and the rest of the components are on their way; expect breaking changes in minor releases until 1.0.

## Install

```sh
npm install @bigpixelrocket/uiok
```

`react` and `react-dom` 19 are peer dependencies.

## Quick start

Import the stylesheet once at your app's entry, then use the components:

```tsx
import '@bigpixelrocket/uiok/styles.css';
import { VisuallyHidden } from '@bigpixelrocket/uiok';

export function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose}>
      <span aria-hidden="true">×</span>
      <VisuallyHidden>Close</VisuallyHidden>
    </button>
  );
}
```

The package is ESM only and ships one module per component, so bundlers drop what you do not import.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Releases follow [docs/releasing.md](docs/releasing.md).

## License

[MIT](LICENSE)
