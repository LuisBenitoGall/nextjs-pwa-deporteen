import { describe, it, expect } from 'vitest';
import {
  cn,
  formatDate,
  formatCurrency,
  absoluteUrl,
  formatBytes,
  isImageFile,
  isVideoFile,
  getFileExtension,
  getMimeType,
  isFileTypeAllowed,
} from './utils';

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
      expect(cn({ foo: true, bar: false })).toBe('foo');
    });

    it('should handle Tailwind class conflicts', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
    });
  });

  describe('formatDate', () => {
    it('should format date string correctly', () => {
      const date = new Date('2024-01-15');
      const formatted = formatDate(date.toISOString());
      expect(formatted).toContain('enero');
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('should format timestamp correctly', () => {
      const timestamp = new Date('2024-06-20').getTime();
      const formatted = formatDate(timestamp);
      expect(formatted).toContain('junio');
      expect(formatted).toContain('20');
    });
  });

  describe('formatCurrency', () => {
    it('should format EUR currency correctly', () => {
      expect(formatCurrency(19.99, 'eur', 'es-ES')).toContain('19,99');
      expect(formatCurrency(1000, 'eur', 'es-ES')).toContain('1000');
      expect(formatCurrency(1000, 'eur', 'es-ES')).toContain('€');
    });

    it('should format USD currency correctly', () => {
      const formatted = formatCurrency(19.99, 'usd', 'en-US');
      expect(formatted).toContain('$');
      expect(formatted).toContain('19.99');
    });

    it('should handle invalid currency gracefully', () => {
      const result = formatCurrency(100, 'invalid', 'es-ES');
      expect(result).toBe('100 invalid');
    });
  });

  describe('absoluteUrl', () => {
    it('should return absolute URL with path', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
      expect(absoluteUrl('/dashboard')).toBe('https://example.com/dashboard');
    });

    it('should handle empty env variable', () => {
      process.env.NEXT_PUBLIC_APP_URL = '';
      expect(absoluteUrl('/dashboard')).toBe('/dashboard');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should handle decimal places', () => {
      expect(formatBytes(1536, 2)).toBe('1.5 KB');
      expect(formatBytes(1572864, 2)).toBe('1.5 MB');
    });
  });

  describe('isImageFile', () => {
    it('should detect image files', () => {
      const imageFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      expect(isImageFile(imageFile)).toBe(true);

      const pngFile = new File([''], 'test.png', { type: 'image/png' });
      expect(isImageFile(pngFile)).toBe(true);
    });

    it('should reject non-image files', () => {
      const videoFile = new File([''], 'test.mp4', { type: 'video/mp4' });
      expect(isImageFile(videoFile)).toBe(false);

      const pdfFile = new File([''], 'test.pdf', { type: 'application/pdf' });
      expect(isImageFile(pdfFile)).toBe(false);
    });
  });

  describe('isVideoFile', () => {
    it('should detect video files', () => {
      const videoFile = new File([''], 'test.mp4', { type: 'video/mp4' });
      expect(isVideoFile(videoFile)).toBe(true);

      const webmFile = new File([''], 'test.webm', { type: 'video/webm' });
      expect(isVideoFile(webmFile)).toBe(true);
    });

    it('should reject non-video files', () => {
      const imageFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      expect(isVideoFile(imageFile)).toBe(false);
    });
  });

  describe('getFileExtension', () => {
    it('should extract file extension', () => {
      expect(getFileExtension('test.jpg')).toBe('jpg');
      expect(getFileExtension('test.png')).toBe('png');
      expect(getFileExtension('test.file.mp4')).toBe('mp4');
    });

    it('should handle files without extension', () => {
      // getFileExtension devuelve el último elemento del split, que para 'test' es 'test'
      // Para archivos sin extensión, devuelve el nombre completo
      expect(getFileExtension('test')).toBe('test');
      expect(getFileExtension('')).toBe('');
    });

    it('should return lowercase extension', () => {
      expect(getFileExtension('test.JPG')).toBe('jpg');
      expect(getFileExtension('test.PNG')).toBe('png');
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME types for images', () => {
      expect(getMimeType('jpg')).toBe('image/jpeg');
      expect(getMimeType('png')).toBe('image/png');
      expect(getMimeType('gif')).toBe('image/gif');
      expect(getMimeType('webp')).toBe('image/webp');
    });

    it('should return correct MIME types for videos', () => {
      expect(getMimeType('mp4')).toBe('video/mp4');
      expect(getMimeType('webm')).toBe('video/webm');
      expect(getMimeType('mov')).toBe('video/quicktime');
    });

    it('should return default for unknown extensions', () => {
      expect(getMimeType('unknown')).toBe('application/octet-stream');
      expect(getMimeType('xyz')).toBe('application/octet-stream');
    });
  });

  describe('isFileTypeAllowed', () => {
    it('should allow files matching MIME type pattern', () => {
      const imageFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      expect(isFileTypeAllowed(imageFile, ['image/*'])).toBe(true);
      expect(isFileTypeAllowed(imageFile, ['video/*'])).toBe(false);
    });

    it('should allow files matching specific MIME type', () => {
      const jpgFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      expect(isFileTypeAllowed(jpgFile, ['image/jpeg'])).toBe(true);
      expect(isFileTypeAllowed(jpgFile, ['image/png'])).toBe(false);
    });

    it('should allow files matching extension', () => {
      const pdfFile = new File([''], 'test.pdf', { type: 'application/pdf' });
      expect(isFileTypeAllowed(pdfFile, ['pdf'])).toBe(true);
      expect(isFileTypeAllowed(pdfFile, ['jpg'])).toBe(false);
    });

    it('should handle multiple allowed types', () => {
      const imageFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
      expect(isFileTypeAllowed(imageFile, ['image/*', 'video/*'])).toBe(true);
      expect(isFileTypeAllowed(imageFile, ['pdf', 'doc'])).toBe(false);
    });
  });
});
