export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ erro: 'Metodo nao permitido' }); return; }

  try {
    const { veiculo, pecas } = req.body;
    if (!veiculo || !pecas || pecas.length === 0) {
      res.status(400).json({ erro: 'Veiculo e pecas sao obrigatorios' });
      return;
    }

    const clientId = process.env.ML_CLIENT_ID;
    const clientSecret = (process.env.ML_CLIENT_SECRET || '').replace(/\s/g, '');

    // Pegar token do ML
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}`
    });

    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    if (!token) {
      res.status(500).json({ erro: 'Erro ao autenticar no MercadoLivre: ' + JSON.stringify(tokenData) });
      return;
    }

    const resultados = [];

    for (const peca of pecas) {
      const query = encodeURIComponent(`${peca} ${veiculo}`);
      const mlRes = await fetch(
        `https://api.mercadolibre.com/sites/MLB/search?q=${query}&limit=5&condition=new`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const mlData = await mlRes.json();
      const items = mlData.results || [];

      const opcoes = items.map(item => ({
        fonte: item.seller?.nickname || 'Vendedor ML',
        preco: `R$ ${Number(item.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        link: item.permalink
      }));

      const melhor = opcoes.length > 0 ? {
        ...opcoes[0],
        justificativa: `Menor preço encontrado no MercadoLivre para ${peca} compatível com ${veiculo}.${items[0]?.shipping?.free_shipping ? ' Frete grátis.' : ''}`
      } : {
        fonte: 'MercadoLivre',
        preco: 'Não encontrado',
        link: `https://lista.mercadolivre.com.br/${encodeURIComponent(peca + ' ' + veiculo)}`,
        justificativa: 'Busca manual recomendada.'
      };

      resultados.push({
        peca,
        melhor,
        opcoes: opcoes.slice(1),
        observacao: opcoes.length === 0 ? 'Nenhum resultado. Tente um nome diferente para a peça.' : null
      });
    }

    res.status(200).json({ cotacoes: resultados });

  } catch (erro) {
    res.status(500).json({ erro: String(erro.message || erro) });
  }
}
