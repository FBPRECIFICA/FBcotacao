export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ erro: 'Método não permitido' }); return; }

  const { veiculo, pecas } = req.body;
  if (!veiculo || !pecas || pecas.length === 0) {
    res.status(400).json({ erro: 'Veículo e peças são obrigatórios' });
    return;
  }

  const prompt = `Você é especialista em cotação de peças automotivas no Brasil. Responda como se tivesse pesquisado agora no MercadoLivre e distribuidoras online.

Veículo: ${veiculo}
Peças: ${pecas.map((p, i) => `${i + 1}. ${p}`).join(', ')}

Para cada peça retorne preços realistas do mercado brasileiro atual, com links reais do MercadoLivre quando possível.

Responda APENAS JSON válido:
{"cotacoes":[{"peca":"nome","melhor":{"fonte":"vendedor/site","preco":"R$ 0,00","link":"https://...","justificativa":"motivo em 1 frase"},"opcoes":[{"fonte":"vendedor","preco":"R$ 0,00","link":"https://..."}],"observacao":null}]}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_KEY?.replace(/\s/g, '')}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    clearTimeout(timeout);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Erro OpenAI');

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Resposta vazia');

    res.status(200).json(JSON.parse(content));
  } catch (erro) {
    console.error('Erro cotar:', erro.message);
    res.status(500).json({ erro: erro.message || 'Erro interno' });
  }
} 
