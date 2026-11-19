declare module 'sm-crypto' {
  export const sm2: {
    doEncrypt(msg: string, key: string, cipherMode?: number): string;
    doDecrypt(ciphertext: string, key: string, cipherMode?: number): string;
  };
}
