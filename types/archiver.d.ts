/**
 * Ambient types for `archiver`.
 *
 * archiver@8 ships no type declarations and there is no @types/archiver, so
 * importing it is an implicit-any error. Declaring the surface we actually use
 * keeps the call sites type-checked, where a `@ts-expect-error` at the import
 * would have silently untyped every use of the module.
 *
 * Mirrors the classes archiver's own index.js exports.
 */
declare module 'archiver' {
  import type { Readable } from 'stream';

  interface ArchiverOptions {
    zlib?: { level?: number };
    [key: string]: unknown;
  }

  interface AppendOptions {
    name: string;
    date?: Date;
    [key: string]: unknown;
  }

  class Archiver extends Readable {
    constructor(options?: ArchiverOptions);
    append(source: Buffer | Readable | string, options: AppendOptions): this;
    file(filepath: string, options: AppendOptions): this;
    directory(dirpath: string, destpath: string | false): this;
    finalize(): Promise<void>;
    abort(): this;
    pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T;
    pointer(): number;
    on(event: 'error' | 'warning', listener: (err: Error) => void): this;
    on(event: 'end' | 'close' | 'finish', listener: () => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;
  }

  export { Archiver };
  export class ZipArchive extends Archiver {}
  export class TarArchive extends Archiver {}
  export class JsonArchive extends Archiver {}
}
