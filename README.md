<h1 style="text-align:center">urlable</h1>

urlable, is a tiny library, that helps to create a dynamic object,
where each mutation results in a query string update. This becomes
quite useful, when used in conjuction with state driven
frameworks, like React or Vue.

## Installation

The package is provided as an ESM build, and can be included as is in the browser.

## Disclaimer

This library relies heavily on cutting-edge technologies:

- Proxy
- Reflect

No effort has been made to include polyfills.

## Configuration

You can easily tweak the behavior of the library, by provided options in addition to
the initial object.

| option        | description                                                                                                                                                                |
|---------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `serialize`   | a function that serialize the object, into a dictionnary, where each value MUST be a string                                                                                |
| `deserialize` | the reverse operation of `serialize`, where we take a dictionnary parsed from the query string, and transform the data into the state object                               |
| `readUrl`     | this is mainly useful for testing purposes, but it allows to override the URL reading behavior                                                                             |
| `writeUrl`    | the function to call when writing the query string to the URL. It receives the new query string when required to update. Again, this is mainly useful for testing purposes |

The type definition can be founs as `UrlableOptions`.

## Example

```typescript
import urlable from 'urlable';

const pagination = urlable({
  page: 1
});

pagination.page = 2; // querystring updates to '?page=2'.
```

You can find a full example, in the [`examples`](./examples) folder.

## Q&A

+ **What if I want to change the name of a key in the query string?**
  use the `serialize` option:

    ```typescript
    // display the property `currentPage` as `page` in the URL.
    const pagination = urlable({ currentPage: 2 }, { serialize: ({ currentPage }) => ({ page: String(currentPage) }) })
    ```

+ **How to hide a property from the URL?**
  remove the property in the `serialize` option:

    ```typescript
    // The `totalPages` property will not show in the query string
    const pagination = urlable({ page: 1, totalPages: 10 }, { serialize: (x) => ({ page: String(x.page) }) });
    ```

+ **How to secure the type of the properties?**
  the `deserialize` options is here:

  ```typescript
  // pagination.page will always be a number.
  const pagination = urlable({ page: 1 }, { deserialize: (x) => ({ page: Number(x.page) }) });
  ```
