import * as assert from 'assert';
import * as mockbrowser from 'mock-browser';
const MockBrowser = mockbrowser.mocks.MockBrowser;

import { getAuthorHasBylineElement, getMetaTag } from './extractors';

describe('getAuthorHasBylineElement', () => {
  const mock = new MockBrowser();

  it('gets author from byline', () => {
    const document = mock.getDocument();
    document.body.innerHTML = `
<byline>by Stephen King</byline>
    `;
    console.log(document.querySelectorAll('byline')[0].value);
    assert.equal(getAuthorHasBylineElement(document), 'by Stephen King');
  });
});

describe('getMetaTag', () => {
  const mock = new MockBrowser();

  it('retrieves meta tag info', () => {
    const document = mock.getDocument();
    document.body.innerHTML = `
<meta name="fruit" content="banana">
<meta name="tool" content="hammer">
    `;
    assert.equal(getMetaTag('fruit', document).content, 'banana');
    assert.equal(getMetaTag('tool', document).content, 'hammer');
  });
});

