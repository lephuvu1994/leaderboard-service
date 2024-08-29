import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly secretKey = process.env.SECRET_KEY;

  encrypt(data: any): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.secretKey, 'utf8'),
      iv,
    );
    let encrypted = cipher.update(JSON.stringify(data));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  decrypt(text: string, secretKey: string): string {
    const encryptedBuffer = Buffer.from(text, 'base64');
    // Lấy IV từ 16 byte đầu tiên của buffer
    const iv = encryptedBuffer.slice(0, 16);
    const encryptedText = encryptedBuffer.slice(16);
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(secretKey, 'utf8'),
      iv,
    );
    let decrypted = decipher.update(
      encryptedText.toString('base64'),
      'base64',
      'utf8',
    );
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
