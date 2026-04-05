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

    const chave = (process.env.OPENAI_KEY || '').replace(/\s/g, '');
    if (!chave || chave.length < 10) {
      res.status(500).json({ erro: 'Chave OpenAI nao configurada' });
      return;
    }

    const prompt = `Você é especialista em peças automotivas no Brasil.

Veículo: ${veiculo}
Peças: ${pecas.map((p, i) => `${i+1}. ${p}`).join('\n')}

Para cada peça, gere links de busca inteligentes para o MercadoLivre Brasil.
Monte os termos de busca de forma otimizada para encontrar a peça certa para o veículo certo.

Regras para os links:
- Use sempre: https://lista.mercadolivre.com.br/[termos-separados-por-hifen]
- Inclua o modelo do veículo nos termos quando relevante
- Gere 3 variações de busca por peça: original, nacional/alternativa, genérica
- Os termos devem ser em português e otimizados para o ML

Exemplo para "farol direito" do "Fiat Fiorino 2022":
- Original: https://lista.mercadolivre.com.br/farol-dianteiro-direito-fiat-fiorino-original
- Nacional: https://lista.mercadolivre.com.br/farol-dianteiro-direito-fiorino-2022
- Genérica: https://lista.mercadolivre.com.br/farol-fiorino

Responda APENAS com JSON válido:
{
  "cotacoes": [
    {
      "peca": "nome da peça",
      "melhor": {
        "fonte": "Busca Original ML",
        "link": "https://lista.mercadolivre.com.br/...",
        "justificativa": "Peça original para ${veiculo}"
      },
      "opcoes": [
        {
          "fonte": "Busca Nacional/Alternativa",
          "link": "https://lista.mercadolivre.com.br/..."
        },
        {
          "fonte": "Busca Genérica",
          "link": "https://lista.mercadolivre.com.br/..."
        }
      ],
      "observacao": null
    }
  ]
}`;

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + chave
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.1,
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
      res.status(500).json({ erro: 'Resposta vazia' });
      return;
    }

    res.status(200).json(JSON.parse(content));

  } catch (erro) {
    res.status(500).json({ erro: String(erro.message || erro) });
  }
}
