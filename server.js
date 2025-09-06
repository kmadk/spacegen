import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const server = createServer(async (req, res) => {
  try {
    let filePath = req.url === '/' ? '/examples/basic-spatial-demo.html' : req.url;
    const fullPath = join(__dirname, filePath);
    
    const content = await readFile(fullPath);
    
    // Set appropriate content type
    const ext = filePath.split('.').pop();
    const contentTypes = {
      'html': 'text/html',
      'js': 'application/javascript',
      'css': 'text/css',
    };
    
    res.setHeader('Content-Type', contentTypes[ext] || 'text/plain');
    res.writeHead(200);
    res.end(content);
    
  } catch (error) {
    res.writeHead(404);
    res.end('Not found');
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});