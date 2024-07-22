import bcrypt from 'bcrypt';

export function generatePassword(userPass?: string) {

  if (!userPass) {
    const lowerLetters = "abcdefghijklmnopqrstuvwxyz";
    const upperLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const allChar = lowerLetters + upperLetters + numbers;

    let password = "";
    for (let i = 0; i < 8; i++) {
      const index: number = Math.floor(Math.random() * allChar.length);
      password += allChar[index]
    }

    const hashedPassword: string = bcrypt.hashSync(password, 10);
    return {password, hashedPassword}
  }

  const hashedPassword: string = bcrypt.hashSync(userPass, 10);
  return { password: userPass, hashedPassword }
}