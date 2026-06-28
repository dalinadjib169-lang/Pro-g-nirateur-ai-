import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, filename, contentType } = req.body;

    if (!data) {
      return res.status(400).send("No data provided");
    }

    // Extract base64 part if it's a data URI
    const base64Data = data.includes(';base64,') ? data.split(';base64,').pop() : data;
    const buffer = Buffer.from(base64Data, 'base64');
    
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename || 'download')}"`);
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    return res.send(buffer);
  } catch (error) {
    console.error("Download endpoint error:", error);
    return res.status(500).send("Error generating download");
  }
}
