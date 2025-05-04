import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import multer from 'multer';
import { Request } from 'express';

// Diretório para armazenar uploads
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Criar diretório de uploads se não existir
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configuração de armazenamento para o Multer
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // Gerar nome de arquivo único para evitar conflitos
    const uniqueFilename = `${Date.now()}-${nanoid(8)}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  },
});

// Filtro para permitir apenas imagens
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Aceita apenas imagens (jpg, jpeg, png, gif)
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('O arquivo enviado não é uma imagem válida.'));
  }
};

// Configuração do Multer para upload de imagens
export const uploadImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limite de 5MB por arquivo
  },
});

// Função para deletar um arquivo
export const deleteFile = async (filepath: string): Promise<boolean> => {
  const fullPath = path.join(UPLOAD_DIR, path.basename(filepath));
  
  return new Promise((resolve) => {
    fs.unlink(fullPath, (err) => {
      if (err) {
        console.error(`Erro ao deletar arquivo ${fullPath}:`, err);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
};

// Função para obter o caminho absoluto de um arquivo
export const getFilePath = (filename: string): string => {
  return path.join(UPLOAD_DIR, filename);
};

// Função para obter a URL pública de um arquivo
export const getFileUrl = (filename: string): string => {
  return `/uploads/${filename}`;
};

// Configurações de export
export default {
  uploadImage,
  deleteFile,
  getFilePath,
  getFileUrl,
  UPLOAD_DIR,
};