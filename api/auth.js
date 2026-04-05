export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const code = req.query.code;
  if (!code) { res.status(400).json({ erro: 'Codigo ausente' }); return; }

  const clientId = (process.env.ML_CLIENT_ID || '').trim();
  const clientSecret = (process.env.ML_CLIENT_SECRET || '').replace(/\s/g, '');

  try {
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: `grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=https://f-bcotacao.vercel.app`
    });
    const data = await tokenRes.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
}
