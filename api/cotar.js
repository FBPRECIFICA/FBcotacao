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

    const prompt = `Você é especialista em peças automotivas no Brasil. Para cada peça abaixo, gere um resultado de cotação realista com preços de mercado brasileiros atuais (2024/2025) e links REAIS do MercadoLivre no formato correto.

Veículo: ${veiculo}
Peças: ${pecas.map((p, i) => `${i+1}. ${p}`).join('\n')}

IMPORTANTE:
- Use preços realistas do mercado brasileiro atual
- Os links do MercadoLivre devem ser no formato: https://lista.mercadolivre.com.br/[termo-de-busca]-[veiculo]
- Exemplo de link válido: https://lista.mercadolivre.com.br/farol-dianteiro-fiat-fiorino
- Inclua 2 a 4 opções por peça com preços variados (peça original, nacional, genérica)
- A melhor opção deve ter a melhor relação custo-benefício com justificativa clara

Responda APENAS com JSON válido:
{
  "cotacoes": [
    {
      "peca": "nome da peça",
      "melhor": {
        "fonte": "Vendedor no MercadoLivre",
        "preco": "R$ 000,00",
        "link": "https://lista.mercadolivre.com.br/peca-veiculo",
        "justificativa": "Justificativa clara em 1 frase"
      },
      "opcoes": [
        {
          "fonte": "Outro vendedor",
          "preco": "R$ 000,00",
          "link": "https://lista.mercadolivre.com.br/peca-veiculo"
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
        max_tokens: 2000,
        temperature: 0.2,
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
