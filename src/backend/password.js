const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 10;
// Un hash bcrypt completo son 60 caracteres: prefijo ($2a$/$2b$/$2y$ + costo de 2 dígitos),
// 22 de salt y 31 de digest. Cualquier otro valor se trata como contraseña legacy en texto
// plano para poder migrarla en el primer login.
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

const isBcryptHash = (value) =>
  typeof value === 'string' && BCRYPT_HASH_PATTERN.test(value);

const hashPassword = (plainPassword) => {
  if (typeof plainPassword !== 'string' || plainPassword.length === 0) {
    throw new Error('La contraseña no puede estar vacía');
  }

  return bcrypt.hashSync(plainPassword, BCRYPT_ROUNDS);
};

const verifyPassword = (plainPassword, storedPassword) => {
  if (typeof plainPassword !== 'string' || typeof storedPassword !== 'string') {
    return { valid: false, needsUpgrade: false };
  }

  if (isBcryptHash(storedPassword)) {
    let valid = false;

    try {
      valid = bcrypt.compareSync(plainPassword, storedPassword);
    } catch {
      valid = false;
    }

    return {
      valid,
      needsUpgrade: false,
    };
  }

  const valid = plainPassword === storedPassword;

  return {
    valid,
    needsUpgrade: valid,
  };
};

module.exports = {
  hashPassword,
  verifyPassword,
  isBcryptHash,
};
