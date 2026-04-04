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

    const prompt = `Você é especialista em cotação de peças automotivas no Brasil.

Veículo: ${veiculo}
Peças: ${pecas.join(', ')}

Retorne preços realistas do mercado brasileiro atual para cada peça.

Responda APENAS com este JSON:
{"cotacoes":[{"peca":"nome da peca","melhor":{"fonte":"MercadoLivre","preco":"R$ 150,00","link":"https://mercadolivre.com.br","justificativa":"Melhor custo beneficio"},"opcoes":[{"fonte":"Outro vendedor","preco":"R$ 180,00","link":"https://mercadolivre.com.br"}],"observacao":null}]}`;

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + chave
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    const text = await openaiRes.text();
    
    if (!openaiRes.ok) {
      res.status(500).json({ erro: 'Erro OpenAI: ' + text.substring(0, 200) });
      return;
    }

    const data = JSON.parse(text);
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      res.status(500).json({ erro: 'Resposta vazia da IA' });
      return;
    }

    res.status(200).json(JSON.parse(content));

  } catch (erro) {
    res.status(500).json({ erro: String(erro.message || erro) });
  }
}
