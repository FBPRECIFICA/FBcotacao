export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ erro: 'Metodo nao permitido' }); return; }

  try {
    const body = req.body;
    const veiculo = body?.veiculo || '';
    const pecas = body?.pecas || [];

    if (!veiculo || pecas.length === 0) {
      res.status(400).json({ erro: 'Veiculo e pecas sao obrigatorios' });
      return;
    }

    const chave = (process.env.OPENAI_KEY || '').replace(/\s/g, '');
    if (!chave || chave.length < 10) {
      res.status(500).json({ erro: 'Chave OpenAI nao configurada' });
      return;
    }

    const resultados = [];

    for (const peca of pecas) {
      const query = encodeURIComponent(`${peca} ${veiculo}`);
      const mlUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${query}&limit=5&condition=new`;
      
      let opcoes = [];
      let melhor = null;

      try {
        const mlRes = await fetch(mlUrl);
        const mlData = await mlRes.json();
        const items = mlData.results || [];

        opcoes = items.slice(0, 5).map(item => ({
          fonte: item.seller?.nickname || 'MercadoLivre',
          preco: `R$ ${item.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          link: item.permalink
        }));

        if (opcoes.length > 0) {
          const itemMelhor = items[0];
          melhor = {
            fonte: itemMelhor.seller?.nickname || 'MercadoLivre',
            preco: `R$ ${itemMelhor.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            link: itemMelhor.permalink,
            justificativa: `Melhor preço encontrado no MercadoLivre para ${peca} compatível com ${veiculo}. ${itemMelhor.shipping?.free_shipping ? 'Frete grátis disponível.' : ''}`
          };
        }
      } catch (e) {
        console.error('Erro ML:', e.message);
      }

      if (!melhor) {
        melhor = {
          fonte: 'MercadoLivre',
          preco: 'Consultar',
          link: `https://www.mercadolivre.com.br/`,
          justificativa: 'Não foi possível buscar preço automaticamente. Consulte manualmente.'
        };
      }

      resultados.push({
        peca,
        melhor,
        opcoes: opcoes.slice(1),
        observacao: opcoes.length === 0 ? 'Nenhum resultado encontrado. Verifique o nome da peça.' : null
      });
    }

    res.status(200).json({ cotacoes: resultados });

  } catch (erro) {
    res.status(500).json({ erro: String(erro.message || erro) });
  }
}
