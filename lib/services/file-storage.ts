import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads');

// Local-disk storage, suitable for a single self-hosted container. Swap this for an
// S3-compatible client (e.g. MinIO) behind the same signature once running multiple app
// instances, since local disk isn't shared across replicas.
export async function saveUploadedFile(file: File, subdir: string): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, subdir);
  await mkdir(dir, { recursive: true });
  const ext = path.extname(file.name) || '.jpg';
  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/${subdir}/${filename}`;
}
