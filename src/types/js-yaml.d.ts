declare module 'js-yaml' {
  interface DumpOptions {
    indent?: number;
    lineWidth?: number;
    noRefs?: boolean;
    quotingType?: "'" | '"';
    forceQuotes?: boolean;
    schema?: any;
    skipInvalid?: boolean;
    flowLevel?: number;
    styles?: Record<string, string>;
    replacer?: (key: string, value: any) => any;
  }

  interface LoadOptions {
    schema?: any;
    filename?: string;
    onWarning?: (warning: Error) => void;
    json?: boolean;
  }

  const JSON_SCHEMA: any;
  const DEFAULT_SCHEMA: any;
  const SAFE_SCHEMA: any;
  const CORE_SCHEMA: any;
  const FAILSAFE_SCHEMA: any;

  function load(input: string, options?: LoadOptions): any;
  function dump(input: any, options?: DumpOptions): string;

  export { load, dump, JSON_SCHEMA, DEFAULT_SCHEMA, SAFE_SCHEMA, CORE_SCHEMA, FAILSAFE_SCHEMA };
}
