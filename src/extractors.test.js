import * as assert from 'assert';
import * as mockbrowser from 'mock-browser';
const MockBrowser = mockbrowser.mocks.MockBrowser;

import {
  getAuthorHasBylineElement,
  getMetaTag,
  extractAuthor
} from './extractors';

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

describe('extractAuthor', () => {
  const mock = new MockBrowser();

  it('retrieves an author 2', () => {
    const document = mock.getDocument();
    document.body.innerHTML = `
<meta name="author" content="Stephen King">
    `;
    assert.equal(extractAuthor(document), 'Stephen King');
  });

  it('retrieves an author 3', () => {
    const document = mock.getDocument();
    document.body.innerHTML = `
<meta name="byl" content="Stephen King">
    `;
    assert.equal(extractAuthor(document), 'Stephen King');
  });

  it('retrieves an author 4', () => {
    const document = mock.getDocument();
    document.body.innerHTML = `
    <byline>Stephen King</byline>
    `;
    assert.equal(extractAuthor(document), 'Stephen King');
  });

  it('retrieves an author 5', () => {
    const document = mock.getDocument();
    document.body.innerHTML = `
    <div class="byline-author" data-byline-name="Stephen King"></div>
    `;
    assert.equal(extractAuthor(document), 'Stephen King');
  });

  it('retrieves an author 6', () => {
    const document = mock.getDocument();
    document.body.innerHTML = `
    <author>Stephen King</author>
    `;
    assert.equal(extractAuthor(document), 'Stephen King');
  });

  it('retrieves an author 7', () => {
    const document = mock.getDocument();
    document.body.innerHTML = `
    by Stephen King
    `;
    assert.equal(extractAuthor(document), 'Stephen King');
  });

  it('retrieves an author 8', () => {
    const document = mock.getDocument();
    document.body.innerHTML = `
    <div class="author-byline">Stephen King</div>
    `;
    assert.equal(extractAuthor(document), 'Stephen King');
  });
});
