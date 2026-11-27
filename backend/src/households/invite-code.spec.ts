import { newInviteCode, parseInviteCode, showInviteCode } from './invite-code';

describe('invite codes', () => {
  it('makes 8-character codes that read back as themselves', () => {
    for (let i = 0; i < 50; i++) {
      const code = newInviteCode();
      expect(code).toMatch(/^[A-Z2-9]{8}$/);
      expect(parseInviteCode(showInviteCode(code))).toBe(code);
    }
  });

  it('accepts a code typed in lower case, with spaces or a dash', () => {
    expect(parseInviteCode('k7pm-4qxr')).toBe('K7PM4QXR');
    expect(parseInviteCode(' K7PM 4QXR ')).toBe('K7PM4QXR');
  });

  it('refuses what cannot be a code', () => {
    expect(parseInviteCode('K7PM4QX')).toBeNull();
    // 0, O, 1, I and L are never used.
    expect(parseInviteCode('K7PM4QX0')).toBeNull();
    expect(parseInviteCode('K7PM4QXI')).toBeNull();
  });

  it('shows a code in two halves', () => {
    expect(showInviteCode('K7PM4QXR')).toBe('K7PM-4QXR');
  });
});
