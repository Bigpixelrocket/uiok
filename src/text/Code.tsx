import type { ReactElement, ReactNode } from 'react';

/** Props for {@link Code}. */
export interface CodeProps {
  /** The command, path, name, or value, as the user would type or see it: `brew services list`. */
  readonly children: ReactNode;
}

/**
 * A command, a path, or a name inside a sentence (a note, a field's help,
 * a notice): the code face at the size of the words round it, on a faint
 * track with rounded ends, in the text tone, so it reads as something to
 * type or find, never as a link. A long one wraps anywhere, each line
 * keeping its padding and ends. It can be swept and copied with the
 * sentence. Draws `code.inline-code`.
 */
export function Code({ children }: CodeProps): ReactElement {
  return <code className="inline-code">{children}</code>;
}
