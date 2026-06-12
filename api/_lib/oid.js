// Gerador de id curto único — fonte única (antes duplicado em ~18 functions).
import crypto from 'crypto';
export const oid = () => crypto.randomBytes(12).toString('hex');
