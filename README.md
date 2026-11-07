# UIOK

Docs: https://bigpixelrocket.github.io/uiok/

UIOK is a React UI library with a retro look: compact controls set in system and monospace type, with every colour drawn from a swappable theme. It is extracted from the desktop apps Bigpixelrocket builds, and it works in any React 19 app.

## Status

Pre-1.0; expect breaking changes in minor releases until 1.0. Version 0.1.0 ships the base stylesheet with 18 light and dark themes ([docs/themes.md](docs/themes.md)), shared labels, keyboard helpers, and component areas from buttons, tooltips, and dialogs to listings, data grids, pickers, palettes, and charts ([docs/components/](docs/components/)). Each area is importable on its own as `@bigpixelrocket/uiok/<area>`.

## Install

```sh
npm install @bigpixelrocket/uiok
```

`react` and `react-dom` 19 and `lucide-react` 1.31 or later within 1.x are peer dependencies.

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
