import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function getS3Client(): S3Client {
  const provider = process.env.STORAGE_PROVIDER ?? "local";

  if (provider === "r2") {
    return new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }

  // AWS S3
  return new S3Client({
    region: process.env.AWS_REGION ?? "ap-southeast-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Upload a buffer to cloud storage (S3 or Cloudflare R2).
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const provider = process.env.STORAGE_PROVIDER ?? "local";

  if (provider === "local") {
    // Local storage: save to /tmp (Vercel serverless) or public/uploads
    // Return a placeholder — in production always use s3 or r2
    return `/uploads/${key}`;
  }

  const client = getS3Client();

  const bucket =
    provider === "r2"
      ? process.env.R2_BUCKET!
      : process.env.AWS_S3_BUCKET!;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // Make public readable
      ACL: provider === "r2" ? undefined : "public-read",
    })
  );

  if (provider === "r2") {
    // Cloudflare R2 custom domain
    const publicUrl = process.env.R2_PUBLIC_URL!.replace(/\/$/, "");
    return `${publicUrl}/${key}`;
  }

  // S3 public URL
  const region = process.env.AWS_REGION ?? "ap-southeast-1";
  const bucket2 = process.env.AWS_S3_BUCKET!;
  return `https://${bucket2}.s3.${region}.amazonaws.com/${key}`;
}
