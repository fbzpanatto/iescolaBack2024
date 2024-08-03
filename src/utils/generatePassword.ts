import bcrypt from 'bcrypt';

export function generatePassword(userPass?: string) {

  if (!userPass) {
    const lowerLetters = "abcdefghijklmnopqrstuvwxyz";
    const upperLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const allChar = lowerLetters + upperLetters + numbers;

    let password = "";

    password += lowerLetters[Math.floor(Math.random() * lowerLetters.length)];
    password += upperLetters[Math.floor(Math.random() * upperLetters.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];

    for (let i = 3; i < 8; i++) {
      const index: number = Math.floor(Math.random() * allChar.length);
      password += allChar[index];
    }

    password = password.split('').sort(() => 0.5 - Math.random()).join('');
    const hashedPassword: string = bcrypt.hashSync(password, 10);

    return { password, hashedPassword };
  }

  const hashedPassword: string = bcrypt.hashSync(userPass, 10);
  return { password: userPass, hashedPassword }
}