import { defaultSerialize, queryStringReconciliation, urlable, urlAsObject } from '../urlable';
import { mocked } from 'ts-jest/utils';

describe('urlAsObject', () => {
	it.each`
		input                                        | expected
		${'http://local.host?hello=world'}           | ${{ hello: 'world' }}
		${'http://local.host?p=12&q=Something+else'} | ${{ p: '12', q: 'Something else' }}
    ${'http://local.host?p=1'}                   | ${{ p: '1' }}
	`('should parse $input as $expected', ({ input, expected }) => {
		expect(urlAsObject(input)).toStrictEqual(expected);
	});
});

describe('queryStringReconciliation', () => {
  it('should return { shouldWrite: false } when no arg is provided', () => {
    const { shouldWrite, queryString } = queryStringReconciliation({
      readUrl: () => 'http://localhost?hello=world'
    });
    expect(shouldWrite).toBe(false);
    expect(queryString).toBe('?hello=world');
  });

  it('should add new properties to existing query string', () => {
    const { shouldWrite, queryString } = queryStringReconciliation({
      readUrl: () => 'http://localhost?hello=world',
      newQueryString: { p: '1', pageSize: '12' }
    });

    expect(shouldWrite).toBe(true);
    expect(queryString).toBe(`?hello=world&p=1&pageSize=12`);
  });

  it('should update the existing key', () => {
    const { queryString } = queryStringReconciliation({
      readUrl: () => 'http://localhost?hello=world',
      newQueryString: { hello: 'John' }
    });

    expect(queryString).toBe(`?hello=John`);
  });

  it('should remove, when providing en empty value', () => {
    const { queryString } = queryStringReconciliation({
      readUrl: () => 'http://localhost?hello=world',
      newQueryString: { hello: '' }
    });

    expect(queryString).toBe('');
  });

  it('should return `{ shouldWrite: false }`, when the query does not change', () => {
    const { shouldWrite, queryString } = queryStringReconciliation({
      readUrl: () => 'http://localhost?hello=world',
      newQueryString: { hello: 'world' }
    });

    expect(shouldWrite).toBe(false);
    expect(queryString).toBe('?hello=world');
  });
});

describe('defaultSerialize', () => {
  it.each`
    input                               | expected
    ${{ p: 1, pageSize: 12 }}           | ${{ p: '1', pageSize: '12' }}
    ${{ selected: [1, 2, 3] }}          | ${{selected: '1,2,3' }}
    ${{ selected: [] }}                 | ${{}}
    ${{ color: 'RED' }}                 | ${{ color: 'RED' }}
    ${{ color: '' }}                    | ${{}}
    ${{ d: new Date('2021-04-01') }}    | ${{ d: '2021-04-01T00:00:00.000Z' }}
    ${{ u: { name: 'Jean', age: 32 } }} | ${{ u: '{"name":"Jean","age":32}' }}
    ${{ p: null }}                      | ${{}}
  `('should serialize $input as $expected', ({ input, expected }) => {
    const got = defaultSerialize(input);
    expect(got).toStrictEqual(expected);
  });
});

describe('urlable', () => {
	let writeUrl = jest.fn();

	beforeEach(() => {
		mocked(writeUrl).mockClear();
	});

	it('should update the queryString on first call', () => {
		urlable(
			{
				page: 1,
				pageSize: 12,
			},
			{
				writeUrl,
				readUrl: () => 'http://localhost/?hello=world',
			},
		);

		expect(writeUrl).toHaveBeenCalledWith(`?hello=world&page=1&pageSize=12`);
	});

  it('should update the query string, when the observed object changes', () => {
    const baseUrl = 'http://localhost';
    let url = baseUrl;
    mocked(writeUrl).mockImplementation((queryString: string) => {
      url = baseUrl + queryString;
    });

    const pagination = urlable({
      page: 1,
      pageSize: 12
    }, { writeUrl, readUrl: () => url });

    pagination.page = 2;

    expect(writeUrl).toHaveBeenNthCalledWith(2, '?page=2&pageSize=12');
  });
});
