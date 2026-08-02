export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_ID not configured' });
  }

  return res.status(200).json({ clientId });
}