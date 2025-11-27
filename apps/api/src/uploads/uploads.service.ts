import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadsService {
  saveFile(file: Express.Multer.File) {
    return {
      url: `/uploads/${file.filename}`,
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      diskName: file.filename,
    };
  }
}
