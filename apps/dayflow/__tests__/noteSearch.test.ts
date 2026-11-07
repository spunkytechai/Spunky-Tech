import { escapeNoteSearch } from '../src/utils/noteSearch';

describe('escapeNoteSearch', () => {
  it('escapes SQLite LIKE wildcards and the escape character', () => {
    expect(escapeNoteSearch('100%_ready!')).toBe('100!%!_ready!!');
  });

  it('leaves ordinary search text unchanged', () => {
    expect(escapeNoteSearch('meeting notes')).toBe('meeting notes');
  });
});
