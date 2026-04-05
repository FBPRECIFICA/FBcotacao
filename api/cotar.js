export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const code = req.query.code;
  const clientId = (process.env.ML_CLIENT_ID || '').trim();
  const clientSecret = (process.env.ML_CLIENT_SECRET || '').replace(/\s/g, '');

  if (!code) {
    // Renovar token com refresh_token
    const refreshToken = (process.env.ML_REFRESH_TOKEN || '').trim();
    if (!refreshToken) { res.status(400).json({ erro: 'Sem codigo nem refresh token' }); return; }
    
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&client_id=${clientId}&client_secret=${clientSecret}&refresh_token=${refreshToken}`
    });
    const data = await tokenRes.json();
    res.status(200).json(data);
    return;
  }

  const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${code}&redirect_uri=https://f-bcotacao.vercel.app`
  });
  const data = await tokenRes.json();
  res.status(200).json(data);
}
