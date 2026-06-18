import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

const USE_R2 = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)

const r2 = USE_R2
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  : null

const BUCKET = process.env.R2_BUCKET ?? 'conciliapro-documentos'
const LOCAL_DIR = path.resolve(process.cwd(), 'uploads', 'documentos')

if (!USE_R2) fs.mkdirSync(LOCAL_DIR, { recursive: true })

export async function uploadArquivo(filename: string, buffer: Buffer, mimetype: string): Promise<void> {
  if (USE_R2) {
    await r2!.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: filename,
      Body: buffer,
      ContentType: mimetype,
    }))
  } else {
    fs.writeFileSync(path.join(LOCAL_DIR, filename), buffer)
  }
}

export async function deletarArquivo(filename: string): Promise<void> {
  if (USE_R2) {
    await r2!.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: filename })).catch(() => null)
  } else {
    try { fs.unlinkSync(path.join(LOCAL_DIR, filename)) } catch {}
  }
}

export async function streamArquivo(filename: string): Promise<Readable> {
  if (USE_R2) {
    const resp = await r2!.send(new GetObjectCommand({ Bucket: BUCKET, Key: filename }))
    return resp.Body as Readable
  } else {
    const filepath = path.join(LOCAL_DIR, filename)
    if (!fs.existsSync(filepath)) throw new Error('Arquivo não encontrado')
    return fs.createReadStream(filepath)
  }
}

export function arquivoExiste(filename: string): boolean {
  if (USE_R2) return true // R2 lança erro no stream se não existir
  return fs.existsSync(path.join(LOCAL_DIR, filename))
}

export { USE_R2 }
