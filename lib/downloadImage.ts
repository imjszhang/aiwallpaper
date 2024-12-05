// FILE: downloadImage.ts
import * as fs from 'fs';
import * as https from 'https';

export async function downloadImage(url: string, localPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(localPath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => resolve()); // 包裹 resolve
            });
        }).on('error', (err) => {
            fs.unlink(localPath, () => reject(err));
        });
    });
}