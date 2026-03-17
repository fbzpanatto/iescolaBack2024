import bcrypt from 'bcrypt';
import crypto from 'crypto';

export async function generatePassword(userPass?: string) {

  if (!userPass) {
    const lowerLetters = "abcdefghijklmnopqrstuvwxyz";
    const upperLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const allChar = lowerLetters + upperLetters + numbers;

    let passwordChars: string[] = [];

    const getRandomChar = (str: string) => str[crypto.randomInt(str.length)];

    passwordChars.push(getRandomChar(lowerLetters));
    passwordChars.push(getRandomChar(upperLetters));
    passwordChars.push(getRandomChar(numbers));

    for (let i = 3; i < 8; i++) { passwordChars.push(getRandomChar(allChar)) }

    for (let i = passwordChars.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
    }

    const password = passwordChars.join('');

    const hashedPassword = await bcrypt.hash(password, 10);

    return { password, hashedPassword };
  }

  const hashedPassword = await bcrypt.hash(userPass, 10);
  return { password: userPass, hashedPassword };
}