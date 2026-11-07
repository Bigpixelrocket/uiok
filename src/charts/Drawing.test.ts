import { afterEach, describe, expect, it } from 'vitest';

import { svgMarkup, tokenColour } from './Drawing.js';

const SVG = 'http://www.w3.org/2000/svg';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('saving a chart as a picture', () => {
  it('reads a token as #rrggbb, and throws the given words where the theme sets none', () => {
    const element = document.createElement('div');

    element.style.setProperty('--chart-1', 'rgb(30, 102, 245)');
    document.body.append(element);
    expect(tokenColour(element, '--chart-1')).toBe('#1e66f5');
    expect(() => tokenColour(element, '--chart-2')).toThrow(
      'The theme’s colors could not be read for the picture.'
    );
    expect(() =>
      tokenColour(element, '--chart-2', { coloursUnreadable: 'Farben fehlen', drawFailed: '' })
    ).toThrow('Farben fehlen');
  });

  it('writes the styles a chart inherits into its copy, drops its classes, and lays a ground under it', () => {
    const style = document.createElement('style');

    style.textContent = '.mark { fill: rgb(30, 102, 245); }';
    document.head.append(style);

    const svg = document.createElementNS(SVG, 'svg');
    const mark = document.createElementNS(SVG, 'rect');

    mark.setAttribute('class', 'mark');
    svg.append(mark);
    document.body.append(svg);

    const markup = svgMarkup(svg, '#ffffff');
    const copy = new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement;
    const [ground, drawn] = [...copy.children];

    expect(markup).toContain(`xmlns="${SVG}"`);
    expect(copy.namespaceURI).toBe(SVG);
    expect(ground?.getAttribute('fill')).toBe('#ffffff');
    expect(drawn?.getAttribute('fill')).toBe('#1e66f5');
    expect(drawn?.hasAttribute('class')).toBe(false);
    // The chart in the window keeps its classes.
    expect(mark.getAttribute('class')).toBe('mark');
  });
});
