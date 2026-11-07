/** A path split as a path cell draws it: the folders that give way, the last folder, and the name. */
export interface PathParts {
  /** The folders before the last one, with their slashes; they give way first. */
  readonly head: string;
  /** The last folder with its slash. */
  readonly tail: string;
  /** The name after the last slash. */
  readonly base: string;
}

/**
 * A path as a listing's path cell (`PathCell`) draws it: the folders before
 * the last one (`head`, which gives way first when the row is narrow), the
 * last folder with its slash (`tail`), and the name (`base`), so a long path
 * keeps the folder and the name that say what it is. A trailing slash is
 * dropped, so a folder's path names the folder.
 */
export function pathParts(path: string): PathParts {
  const trimmed = path.length > 1 ? path.replace(/\/+$/u, '') : path;
  const cut = trimmed.lastIndexOf('/');
  const folder = trimmed.slice(0, cut + 1);
  const inner = folder.slice(0, -1).lastIndexOf('/');

  return {
    head: folder.slice(0, inner + 1),
    tail: folder.slice(inner + 1),
    base: trimmed.slice(cut + 1)
  };
}
