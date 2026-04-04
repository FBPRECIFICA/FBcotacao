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

  const prompt = `Você é um especialista em cotação de peças automotivas no Brasil.

Veículo: ${veiculo}
Peças para cotar: ${pecas.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Para cada peça:
1. Pesquise no MercadoLivre Brasil e outros sites relevantes de autopeças
2. Encontre de 2 a 5 opções com preços reais atuais
3. Sugira a MELHOR opção com justificativa clara (preço, reputação, prazo, original/nacional/genérica)
4. Alerte se a peça for difícil de encontrar ou se houver risco de compatibilidade

Responda APENAS com JSON válido neste formato, sem texto adicional:

{
  "cotacoes": [
    {
      "peca": "nome da peça",
      "melhor": {
        "fonte": "nome do vendedor ou site",
        "preco": "R$ 0,00",
        "link": "https://...",
        "justificativa": "motivo da escolha em 1-2 frases"
      },
      "opcoes": [
        {
          "fonte": "nome do vendedor ou site",
          "preco": "R$ 0,00",
          "link": "https://..."
        }
      ],
      "observacao": "alertas importantes ou null"
    }
  ]
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 3000,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Erro na API OpenAI');

    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Resposta vazia da IA');

    const resultado = JSON.parse(content);
    res.status(200).json(resultado);

  } catch (erro) {
    console.error('Erro cotar:', erro);
    res.status(500).json({ erro: erro.message || 'Erro interno ao cotar peças' });
  }
}
