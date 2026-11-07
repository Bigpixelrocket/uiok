/*
 * Saving a chart as a picture, in the window: a theme token's colour, a
 * chart's SVG element as SVG text with its styles written in, and that text
 * drawn as PNG bytes on a canvas. Nothing here reaches a network: an SVG is
 * loaded only from its own `data:` URL.
 */

import { DEFAULT_CHART_LABELS, type ChartLabels } from '../labels/charts.js';
import { hexColour } from './Drawing.logic.js';

/** The failure messages a picture export throws with: the `charts` labels, or English. */
type DrawingLabels = Pick<ChartLabels, 'coloursUnreadable' | 'drawFailed'>;

/**
 * A theme token's colour (`--chart-1`, `--bg`) as `#rrggbb`, read where
 * `element` draws it, for a picture's background or anything else a file
 * needs as a plain colour. Throws an `Error` with `labels.coloursUnreadable`
 * where the theme sets no colour the function can read (a hex or `rgb()`
 * value). Pass `useLabels().charts` to throw in the app's language.
 */
export function tokenColour(
  element: Element,
  token: string,
  labels: DrawingLabels = DEFAULT_CHART_LABELS
): string {
  const colour = hexColour(getComputedStyle(element).getPropertyValue(token));

  if (colour === null) throw new Error(labels.coloursUnreadable);
  return colour;
}

/** Bytes as base64, for a `data:` URL. */
const base64 = (bytes: Uint8Array): string => {
  let binary = '';

  for (let at = 0; at < bytes.length; at += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
  }
  return btoa(binary);
};

/** A canvas's picture as PNG bytes. */
const canvasPng = (canvas: HTMLCanvasElement, labels: DrawingLabels): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error(labels.drawFailed));
        return;
      }
      void blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
    }, 'image/png');
  });

/** The styles a chart's element draws with, written into its copy so the file reads alone. */
const STYLED = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'opacity',
  'font-size',
  'font-family',
  'font-weight',
  'text-anchor',
  'dominant-baseline'
] as const;

/**
 * A chart's SVG element (the one `ResultChart` hands to `svgRef`) as an SVG
 * document of its own: every style it inherits from the stylesheet and the
 * theme written in as attributes, fills and strokes as `#rrggbb`, classes
 * dropped, sized to the element's box, on a `background` rectangle. The
 * element must be in the document so its styles resolve.
 */
export function svgMarkup(svg: SVGSVGElement, background: string): string {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const sources = [svg, ...svg.querySelectorAll('*')];
  const targets = [copy, ...copy.querySelectorAll('*')];
  const box = svg.getBoundingClientRect();

  sources.forEach((source, at) => {
    const target = targets[at];

    if (target === undefined) return;

    const style = getComputedStyle(source);

    for (const name of STYLED) {
      const value = style.getPropertyValue(name);

      if (value !== '')
        target.setAttribute(
          name,
          name === 'fill' || name === 'stroke'
            ? value === 'none'
              ? 'none'
              : (hexColour(value) ?? value)
            : value
        );
    }
    target.removeAttribute('class');
  });
  // The namespace declaration, set as one so a serializer writes it once.
  copy.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns', 'http://www.w3.org/2000/svg');
  copy.setAttribute('width', String(Math.round(box.width)));
  copy.setAttribute('height', String(Math.round(box.height)));

  const ground = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

  ground.setAttribute('width', '100%');
  ground.setAttribute('height', '100%');
  ground.setAttribute('fill', background);
  copy.insertBefore(ground, copy.firstChild);
  return new XMLSerializer().serializeToString(copy);
}

/**
 * An SVG document (from `svgMarkup`) drawn as PNG bytes at twice `width` by
 * `height`, for sharp edges on a high-density screen. Rejects with an
 * `Error` carrying `labels.drawFailed` when the browser cannot load, draw,
 * or encode it.
 */
export function svgPng(
  markup: string,
  width: number,
  height: number,
  labels: DrawingLabels = DEFAULT_CHART_LABELS
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');

      canvas.width = Math.round(width * 2);
      canvas.height = Math.round(height * 2);

      const context = canvas.getContext('2d');

      if (context === null) {
        reject(new Error(labels.drawFailed));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvasPng(canvas, labels).then(resolve, reject);
    };
    image.onerror = () => reject(new Error(labels.drawFailed));
    image.src = `data:image/svg+xml;base64,${base64(new TextEncoder().encode(markup))}`;
  });
}
