import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function buildS3Client(): S3Client {
  const config: ConstructorParameters<typeof S3Client>[0] = {
    region: process.env.STORAGE_REGION ?? "us-east-1",
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? "",
    },
  };

  // Support Cloudflare R2 or other S3-compatible endpoints
  if (process.env.STORAGE_ENDPOINT) {
    config.endpoint = process.env.STORAGE_ENDPOINT;
    config.forcePathStyle = true;
  }

  return new S3Client(config);
}

const globalForS3 = globalThis as unknown as { s3: S3Client | undefined };
export const s3 = globalForS3.s3 ?? buildS3Client();
if (process.env.NODE_ENV !== "production") globalForS3.s3 = s3;

const BUCKET = process.env.STORAGE_BUCKET ?? "author-platform-works";
const EXPIRY = parseInt(process.env.PRESIGNED_URL_EXPIRY_SECONDS ?? "900", 10);

/**
 * Generate a presigned PUT URL for direct browser-to-S3 upload.
 * Content-Type is locked in the URL to prevent upload substitution.
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: EXPIRY });
}

/**
 * Generate a presigned GET URL for temporary read access to a stored asset.
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

/**
 * Read object content as a string (for manuscripts fetched server-side).
 */
export async function getObjectText(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await s3.send(command);

  if (!response.Body) {
    throw new Error(`Empty body for S3 key: ${key}`);
  }

  return response.Body.transformToString("utf-8");
}

/**
 * Read object content as a Buffer (for binary files like PDFs, images).
 */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await s3.send(command);

  if (!response.Body) {
    throw new Error(`Empty body for S3 key: ${key}`);
  }

  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

/**
 * Upload a buffer to S3 (used for provenance certificates and watermarked images).
 */
export async function putObject(
  key: string,
  body: Buffer | string,
  contentType: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  await s3.send(command);
}

/**
 * Delete a stored object.
 */
export async function deleteObject(key: string): Promise<void> {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await s3.send(command);
}

/**
 * Build a stable S3 key for a work's manuscript.
 */
export function manuscriptKey(authorId: string, workId: string, ext: string): string {
  return `works/${authorId}/${workId}/manuscript.${ext}`;
}

/**
 * Build a stable S3 key for a visualization asset.
 */
export function visualizationKey(workId: string, vizId: string): string {
  return `works/${workId}/visualizations/${vizId}.png`;
}

/**
 * Build a stable S3 key for a provenance certificate.
 */
export function certificateKey(workId: string): string {
  return `works/${workId}/provenance-certificate.pdf`;
}
