// This is a fallback implementation of nanoid/non-secure for when it can't be resolved
// It's a simple implementation that should work for most cases

// Generate a 21 character random ID (nanoid default length)
export const nanoid = (size = 21) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < size; i++) {
    id += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return id;
};

// Legacy non-secure random ID generation
export const customAlphabet = (alphabet, size = 21) => {
  return () => {
    let id = '';
    for (let i = 0; i < size; i++) {
      id += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return id;
  };
};

export default { nanoid, customAlphabet };
