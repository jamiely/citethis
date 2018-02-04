import { formatAuthor } from './formatting';
import * as assert from 'assert';

describe('formatAuthor', () => {
  it('returns empty string on null', () => {
    assert.equal(formatAuthor(null), '');
  });
  it('capitalizes', () => {
    assert.equal(formatAuthor('STEPHEN KING'), 'Stephen King');
  });
  it('removes by', () => {
    assert.equal(formatAuthor('by STEPHEN KING'), 'Stephen King');
  });
  it('removes whitespace', () => {
    assert.equal(formatAuthor('    STEPHEN    KING   '), 'Stephen King');
  });
  it('removes AP', () => {
    assert.equal(formatAuthor('    STEPHEN KING   , AP'), 'Stephen King');
  });
  it('removes Associated Press', () => {
    assert.equal(formatAuthor('    STEPHEN KING   , Associated Press'), 'Stephen King');
  });
});
