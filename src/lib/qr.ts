import QRCode from 'qrcode';

export async function generateQRDataURL(text: string, size: number = 200): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}
