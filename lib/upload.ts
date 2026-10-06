export const TEXT_UPLOAD_LIMIT = 200_000;
export const PDF_UPLOAD_LIMIT = 10_000_000;
export function uploadLimit(filename: string) {
  return /\.pdf$/i.test(filename) ? PDF_UPLOAD_LIMIT : TEXT_UPLOAD_LIMIT;
}
