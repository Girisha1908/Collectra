import QRCode from "qrcode";

/** PNG Data URL suitable for `<img src="...">` or storing in `qr_code_base64`. */
export async function generateQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: 256,
    margin: 1,
    errorCorrectionLevel: "M",
  });
}
