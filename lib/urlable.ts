import debounce from 'lodash/fp/debounce';
import flow from 'lodash/fp/flow';
import identity from 'lodash/fp/identity';
import isArray from 'lodash/fp/isArray';
import isEmpty from 'lodash/fp/isEmpty';
import isNil from 'lodash/fp/isNil';
import isString from 'lodash/fp/isString';
import mapValues from 'lodash/fp/mapValues';
import merge from 'lodash/fp/merge';
import omitBy from 'lodash/fp/omitBy';

export interface UrlableOptions<T> {
  /** how to transform the target object into the query string, will use JSON.stringify by default */
  serialize(data: T): Record<string, string>;
  /** a method that take a querystring-like object, and parses it into the target type */
  deserialize(record: Record<string, string>): T;
  /**
   * an accessor method to the current URL
   * @default () => window.location.href
   */
  readUrl(): string;
  /** @param newQueryString the query string to write to the URL */
  writeUrl(newQueryString: string): void;
}

export function urlAsObject(url: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(new URL(url).search));
}

export function serializeDeepValues(value: any): string | undefined {
  if (isArray(value)) {
    return isEmpty(value) ? undefined : value.map(serializeDeepValues).join(',');
  }

  if (isString(value)) {
    return isEmpty(value.trim()) ? undefined : value;
  }

  const out = JSON.stringify(value);
  if (out.startsWith('"')) {
    return out.replace(/"(.+?)"/g, '$1');
  }

  return out;
}

export const defaultSerialize = flow(
  mapValues((v) => (isNil(v) ? undefined : serializeDeepValues(v))),
  omitBy(isNil),
) as (x: unknown) => Record<string, string>;

export interface QueryStringReconciliationOptions {
  readUrl: UrlableOptions<any>['readUrl'];
  newQueryString: Record<string, string>;
}
export function queryStringReconciliation({
  readUrl = () => window.location.href,
  newQueryString = {},
}: Partial<QueryStringReconciliationOptions> = {}): {
  shouldWrite: boolean;
  queryString: string;
} {
  const currentQueryString = new URLSearchParams(new URL(readUrl()).search);
  const potentialNewQueryString = new URLSearchParams(newQueryString);

  let shouldWrite = false;
  for (const [key, value] of potentialNewQueryString) {
    if (
      !currentQueryString.has(key) ||
      (currentQueryString.has(key) && currentQueryString.get(key) !== value)
    ) {
      shouldWrite = true;

      if (isEmpty(value)) {
        currentQueryString.delete(key);
      } else {
        currentQueryString.set(key, value);
      }
    }
  }

  const qs = currentQueryString.toString();

  return {
    shouldWrite,
    queryString: qs.length > 0 ? '?' + currentQueryString.toString() : '',
  };
}

export function urlable<T extends Record<string, any>>(
  source: T,
  options: Partial<UrlableOptions<T>> = {},
): T {
  const getUrl = options?.readUrl ?? (() => window.location.href);
  const writeUrl =
    options?.writeUrl ??
    debounce(200, (url: string) => {
      window.history.replaceState(undefined, window.document.title, url);
    });
  const serialize = options?.serialize ?? defaultSerialize;
  const deserialize = options?.deserialize ?? identity;

  const updateQueryString = (toWrite: T): void => {
    const { shouldWrite, queryString } = queryStringReconciliation({
      readUrl: getUrl,
      newQueryString: serialize(toWrite),
    });
    if (shouldWrite) {
      writeUrl(queryString);
    }
  };

  const outerTarget: T = flow(urlAsObject, deserialize, merge(source))(getUrl());

  updateQueryString(outerTarget);

  return new Proxy(outerTarget, {
    set(target: T, property, value) {
      const success = Reflect.set(target, property, value);

      if (success) {
        updateQueryString(target);
      }

      return success;
    },
  });
}
