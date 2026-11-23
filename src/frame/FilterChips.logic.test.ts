import { describe, expect, it } from 'vitest';

import { sidewaysWheel } from './FilterChips.logic.js';

/** A line 300px wide holding 800px of chips, scrolled to `left`. */
const line = (left: number) => ({ scrollLeft: left, scrollWidth: 800, clientWidth: 300 });
const wheel = (deltaY: number, deltaX = 0, deltaMode = 0) => ({ deltaX, deltaY, deltaMode });

describe("the quick row's wheel", () => {
  it('turns a vertical wheel into a sideways scroll, down toward the end', () => {
    expect(sidewaysWheel(wheel(40), line(0))).toBe(40);
    expect(sidewaysWheel(wheel(-40), line(200))).toBe(-40);
  });

  it('scales a wheel that counts lines or pages', () => {
    expect(sidewaysWheel(wheel(3, 0, 1), line(0))).toBe(72);
    expect(sidewaysWheel(wheel(1, 0, 2), line(0))).toBe(300);
  });

  it('leaves a sideways gesture to the browser, which scrolls the line itself', () => {
    expect(sidewaysWheel(wheel(10, 30), line(100))).toBeNull();
    expect(sidewaysWheel(wheel(0, 0), line(100))).toBeNull();
  });

  it('leaves the wheel to the page when the line cannot move that way, or has nothing hidden', () => {
    expect(sidewaysWheel(wheel(-40), line(0))).toBeNull();
    expect(sidewaysWheel(wheel(40), line(500))).toBeNull();
    expect(sidewaysWheel(wheel(40), line(499.6))).toBeNull();
    expect(
      sidewaysWheel(wheel(40), { scrollLeft: 0, scrollWidth: 300, clientWidth: 300 })
    ).toBeNull();
  });

  it('moves a right-to-left line toward its left end, where scrollLeft runs below 0', () => {
    expect(sidewaysWheel(wheel(40), line(0), true)).toBe(-40);
    expect(sidewaysWheel(wheel(-40), line(-200), true)).toBe(40);
    expect(sidewaysWheel(wheel(-40), line(0), true)).toBeNull();
    expect(sidewaysWheel(wheel(40), line(-500), true)).toBeNull();
  });
});
