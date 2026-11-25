/** The email with a password reset code, "1234 5678". */
export function resetCodeMail(code: string, minutes: number, lang: 'en' | 'tr') {
  const shown = `${code.slice(0, 4)} ${code.slice(4)}`;
  return lang === 'tr'
    ? {
        subject: `Raf şifre sıfırlama kodun: ${shown}`,
        text: `Raf şifreni sıfırlamak için uygulamaya şu kodu gir:\n\n${shown}\n\nKod ${minutes} dakika geçerlidir. Bunu sen istemediysen bir şey yapmana gerek yok; kodu kimseyle paylaşma.`,
      }
    : {
        subject: `Your Raf password reset code: ${shown}`,
        text: `Enter this code in the app to reset your Raf password:\n\n${shown}\n\nIt works for ${minutes} minutes. If you did not ask for it, you can ignore this email; do not share the code with anyone.`,
      };
}
